/**
 * Guards the environment wiring used by app.config.js and the web build:
 * production must resolve to vms.dallah.com everywhere, QA must keep the
 * Replit hosts, and the bundle checks must reject cross-environment leaks.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  ENVIRONMENTS,
  resolveEnvironment,
  assertProductionConfig,
  publicEnvFor,
} = require("../config/app-environments");
const {
  REQUIRED_FILES,
  finalizeDist,
  verifyBundleHosts,
  renderTemplate,
  assertBackendOrigin,
} = require("../scripts/lib/web-dist");

const ROOT = path.resolve(__dirname, "..");
const QA_SHARED_ENV = {
  EXPO_PUBLIC_API_BASE_URL: "https://vms-backend-app-qa.replit.app",
  EXPO_PUBLIC_VMS_API_BASE_URL: "https://vms-backend-app-qa.replit.app",
  EXPO_PUBLIC_MICROSOFT_AUTH_URL: "https://vms-backend-app-qa.replit.app",
  EXPO_PUBLIC_LEGAL_PAGES_URL: "https://vms-frontend-folio3.replit.app",
};

describe("Replit publishing build", () => {
  it("builds the QA variant without the IIS-only web.config", () => {
    const script = fs.readFileSync(path.join(ROOT, "scripts", "build-and-verify.sh"), "utf8");

    expect(script).toContain("--variant qa");
    expect(script).toContain("--no-web-config");
    expect(script).not.toContain("--variant production");
  });
});

describe("resolveEnvironment", () => {
  it("defaults production to vms.dallah.com for every public URL", () => {
    const resolved = resolveEnvironment({ appVariant: "production", env: {} });

    expect(resolved).toMatchObject({
      variant: "production",
      apiBaseUrl: "https://vms.dallah.com",
      microsoftAuthUrl: "https://vms.dallah.com",
      appDomain: "vms.dallah.com",
      legalPagesUrl: "https://vms.dallah.com",
    });
    expect(() => assertProductionConfig(resolved)).not.toThrow();
  });

  it("defaults QA to the Replit hosts and treats any other variant as QA", () => {
    for (const appVariant of ["staging", "qa", undefined, "preview"]) {
      const resolved = resolveEnvironment({ appVariant, env: {} });
      expect(resolved.variant).toBe("qa");
      expect(resolved.apiBaseUrl).toBe("https://vms-backend-app-qa.replit.app");
      expect(resolved.appDomain).toBe("vms-frontend-folio3.replit.app");
      expect(resolved.legalPagesUrl).toBe("https://vms-frontend-folio3.replit.app");
    }
  });

  it("lets EXPO_PUBLIC_* variables override QA values but drops development hosts", () => {
    const resolved = resolveEnvironment({
      appVariant: "staging",
      env: {
        ...QA_SHARED_ENV,
        EXPO_PUBLIC_API_BASE_URL: "https://abc-00-xyz.worf.replit.dev",
        EXPO_PUBLIC_LEGAL_PAGES_URL: "https://legal.example.com/",
      },
    });

    expect(resolved.apiBaseUrl).toBe("https://vms-backend-app-qa.replit.app");
    expect(resolved.sources.apiBaseUrl).toBe("default (EXPO_PUBLIC_API_BASE_URL ignored: development host)");
    expect(resolved.legalPagesUrl).toBe("https://legal.example.com");
  });

  it("reads overrides from the variant file but never from non-prefixed process env", () => {
    const resolved = resolveEnvironment({
      appVariant: "production",
      env: { API_BASE_URL: "https://should-be-ignored.example.com" },
      fileEnv: { API_BASE_URL: "https://api.example.com/", APP_DOMAIN: "https://app.example.com/" },
    });

    expect(resolved.apiBaseUrl).toBe("https://api.example.com");
    // Microsoft SSO follows the API origin unless set explicitly.
    expect(resolved.microsoftAuthUrl).toBe("https://api.example.com");
    expect(resolved.appDomain).toBe("app.example.com");
  });

  it("rejects a production configuration that points at QA or Replit hosts", () => {
    const leaked = resolveEnvironment({ appVariant: "production", env: QA_SHARED_ENV });
    expect(() => assertProductionConfig(leaked)).toThrow(/non-production hosts/);

    const staleFile = resolveEnvironment({
      appVariant: "production",
      env: {},
      fileEnv: { API_BASE_URL: "https://vms-backend-folio3.replit.app" },
    });
    expect(() => assertProductionConfig(staleFile)).toThrow(/apiBaseUrl=.*variant file API_BASE_URL/);

    const clean = resolveEnvironment({
      appVariant: "production",
      env: QA_SHARED_ENV,
      ignoreProcessEnv: true,
    });
    expect(clean.apiBaseUrl).toBe("https://vms.dallah.com");
    expect(clean.ignored).toEqual([
      "EXPO_PUBLIC_API_BASE_URL",
      "EXPO_PUBLIC_MICROSOFT_AUTH_URL",
      "EXPO_PUBLIC_LEGAL_PAGES_URL",
    ]);
    expect(() => assertProductionConfig(clean)).not.toThrow();
  });

  it("treats every *.replit.dev URL as a development host", () => {
    for (const url of [
      "https://abc-00-xyz.worf.replit.dev",
      "https://b4ba7f88-2197-4a63-9c1d-000000000000.riker.replit.dev",
      "https://anything.replit.dev/path",
    ]) {
      const resolved = resolveEnvironment({
        appVariant: "staging",
        env: { EXPO_PUBLIC_API_BASE_URL: url },
      });
      expect(resolved.apiBaseUrl).toBe("https://vms-backend-app-qa.replit.app");
    }
  });

  it("gives QA and production distinct Outlook add-in identities", () => {
    expect(ENVIRONMENTS.qa.outlookAddin.id).not.toBe(ENVIRONMENTS.production.outlookAddin.id);
    expect(ENVIRONMENTS.qa.outlookAddin.displayName).not.toBe(
      ENVIRONMENTS.production.outlookAddin.displayName,
    );
  });

  it("emits the EXPO_PUBLIC_* set Metro inlines, with APP_VARIANT matching eas.json", () => {
    const production = publicEnvFor(resolveEnvironment({ appVariant: "production", env: {} }));
    expect(production).toEqual({
      APP_VARIANT: "production",
      EXPO_PUBLIC_API_BASE_URL: "https://vms.dallah.com",
      EXPO_PUBLIC_VMS_API_BASE_URL: "https://vms.dallah.com",
      EXPO_PUBLIC_MICROSOFT_AUTH_URL: "https://vms.dallah.com",
      EXPO_PUBLIC_APP_DOMAIN: "vms.dallah.com",
      EXPO_PUBLIC_LEGAL_PAGES_URL: "https://vms.dallah.com",
    });
    expect(publicEnvFor(resolveEnvironment({ appVariant: "qa", env: {} })).APP_VARIANT).toBe("staging");
  });
});

describe("app.config.js", () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8")).expo;
  const originalEnv = process.env;

  function evaluate(env) {
    process.env = { ...env };
    try {
      let config;
      jest.isolateModules(() => {
        config = require("../app.config.js")({ config: appJson });
      });
      return config;
    } finally {
      process.env = originalEnv;
    }
  }

  it("derives production deep links and URLs from the app domain", () => {
    const config = evaluate({ APP_VARIANT: "production", PATH: originalEnv.PATH });

    expect(config.ios.associatedDomains).toEqual(["applinks:vms.dallah.com"]);
    expect(config.android.intentFilters).toHaveLength(1);
    expect(config.android.intentFilters[0].data.map((entry) => entry.host)).toEqual([
      "vms.dallah.com",
      "vms.dallah.com",
      "vms.dallah.com",
    ]);
    expect(config.android.intentFilters[0].data.map((entry) => entry.pathPrefix)).toEqual([
      "/requests/new",
      "/invite/",
      "/requests/",
    ]);
    expect(config.extra).toMatchObject({
      environment: "production",
      apiBaseUrl: "https://vms.dallah.com",
      microsoftAuthUrl: "https://vms.dallah.com",
      appDomain: "vms.dallah.com",
      legalPagesUrl: "https://vms.dallah.com",
    });
    expect(config.extra.firebase.projectId).toBe("dallah-albaraka-vms");
    expect(config.scheme).toBe("dallahvms");
  });

  it("keeps QA builds on the Replit hosts, honouring the shared environment", () => {
    const config = evaluate({ APP_VARIANT: "staging", PATH: originalEnv.PATH, ...QA_SHARED_ENV });

    expect(config.ios.associatedDomains).toEqual(["applinks:vms-frontend-folio3.replit.app"]);
    expect(config.android.intentFilters[0].data[0].host).toBe("vms-frontend-folio3.replit.app");
    expect(config.extra).toMatchObject({
      environment: "qa",
      apiBaseUrl: "https://vms-backend-app-qa.replit.app",
      legalPagesUrl: "https://vms-frontend-folio3.replit.app",
    });
  });

  it("ignores the QA shared environment when APP_VARIANT=production (EAS builds from this workspace)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const config = evaluate({ APP_VARIANT: "production", PATH: originalEnv.PATH, ...QA_SHARED_ENV });

      expect(config.extra.apiBaseUrl).toBe("https://vms.dallah.com");
      expect(config.extra.microsoftAuthUrl).toBe("https://vms.dallah.com");
      expect(config.extra.legalPagesUrl).toBe("https://vms.dallah.com");
      expect(config.ios.associatedDomains).toEqual(["applinks:vms.dallah.com"]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("ignoring EXPO_PUBLIC_API_BASE_URL"));
    } finally {
      warn.mockRestore();
    }
  });

  it("no longer carries static QA hosts in app.json", () => {
    const raw = JSON.stringify(appJson);
    expect(raw).not.toMatch(/replit\.(app|dev)/);
    expect(appJson.android.intentFilters).toBeUndefined();
    expect(appJson.ios.associatedDomains).toBeUndefined();
    expect(appJson.extra.apiBaseUrl).toBeUndefined();
  });
});

describe("web dist finalize + verify", () => {
  let distDir;
  const production = resolveEnvironment({ appVariant: "production", env: {} });
  const qa = resolveEnvironment({ appVariant: "qa", env: {} });

  function write(relative, contents) {
    const target = path.join(distDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }

  function seedDist(bundleSource) {
    for (const file of REQUIRED_FILES) {
      const source = path.join(ROOT, "public", file);
      write(file, fs.existsSync(source) ? fs.readFileSync(source) : "");
    }
    write("_expo/static/js/web/index-abc123.js", bundleSource);
  }

  const PRODUCTION_BUNDLE =
    'var a="https://vms.dallah.com";var b=hostname.includes("replit.dev")||hostname.includes("replit.app");';

  beforeEach(() => {
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), "vms-web-dist-"));
  });

  afterEach(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("renders the Outlook add-in and web.config for production", () => {
    seedDist(PRODUCTION_BUNDLE);

    const actions = finalizeDist({
      distDir,
      rootDir: ROOT,
      environment: production,
      webConfig: { backendOrigin: "http://localhost:3000" },
    });
    expect(actions).toHaveLength(3);

    const manifest = fs.readFileSync(path.join(distDir, "outlook-addin/manifest.xml"), "utf8");
    expect(manifest).toContain(`<Id>${ENVIRONMENTS.production.outlookAddin.id}</Id>`);
    expect(manifest).toContain('<DisplayName DefaultValue="VMS - Create Visit Request"/>');
    expect(manifest).toContain("<AppDomain>https://vms.dallah.com</AppDomain>");
    expect(manifest).toContain(
      '<SourceLocation DefaultValue="https://vms.dallah.com/outlook-addin/taskpane.html"/>',
    );
    expect(manifest).toContain('<IconUrl DefaultValue="https://vms.dallah.com/outlook-addin/icon-80.png"/>');
    expect(manifest).not.toMatch(/%%|YOUR_APP_DOMAIN|replit/);

    const taskpane = fs.readFileSync(path.join(distDir, "outlook-addin/taskpane.html"), "utf8");
    expect(taskpane).toContain("window.__VMS_APP_URL__ = 'https://vms.dallah.com';");

    const webConfig = fs.readFileSync(path.join(distDir, "web.config"), "utf8");
    expect(webConfig).toContain('url="http://localhost:3000/api{R:1}"');
    expect(webConfig).toContain('url="http://localhost:3000/auth/microsoft{R:1}"');
    expect(webConfig).toContain('<add input="{REQUEST_URI}" pattern="^/auth/microsoft(/|$)" negate="true" />');
    expect(webConfig).toContain('<location path=".well-known/apple-app-site-association">');
    expect(webConfig).toContain('cacheControlCustom="public, immutable"');
    expect(webConfig).not.toContain("%%");

    const result = verifyBundleHosts({ distDir, environment: production });
    expect(result.errors).toEqual([]);
    expect(result.requiredHostFound).toBe(true);
  });

  it("renders the QA add-in against the Replit host without a web.config", () => {
    seedDist('var a="https://vms-backend-app-qa.replit.app";');

    finalizeDist({ distDir, rootDir: ROOT, environment: qa, webConfig: null });

    const manifest = fs.readFileSync(path.join(distDir, "outlook-addin/manifest.xml"), "utf8");
    expect(manifest).toContain(`<Id>${ENVIRONMENTS.qa.outlookAddin.id}</Id>`);
    expect(manifest).toContain("https://vms-frontend-folio3.replit.app/outlook-addin/taskpane.html");
    expect(fs.existsSync(path.join(distDir, "web.config"))).toBe(false);
    expect(verifyBundleHosts({ distDir, environment: qa }).errors).toEqual([]);
  });

  it("fails a production bundle that still references QA or development hosts", () => {
    seedDist(
      'var a="https://vms.dallah.com";var q="https://vms-backend-app-qa.replit.app";var d="https://x-00-y.worf.replit.dev";',
    );
    finalizeDist({ distDir, rootDir: ROOT, environment: production, webConfig: null });

    const { errors } = verifyBundleHosts({ distDir, environment: production });
    expect(errors.some((error) => error.includes("vms-backend-app-qa.replit.app"))).toBe(true);
    expect(errors.some((error) => error.includes("development URL"))).toBe(true);
  });

  it("fails when the config inlined into the bundle belongs to the other environment", () => {
    seedDist('var c={"extra":{"apiBaseUrl":"https://vms.dallah.com"}};var q="https://vms-backend-app-qa.replit.app";');
    finalizeDist({ distDir, rootDir: ROOT, environment: qa, webConfig: null });
    expect(verifyBundleHosts({ distDir, environment: qa }).errors).toEqual([
      expect.stringContaining('apiBaseUrl is "https://vms.dallah.com" but the qa build expects'),
    ]);

    seedDist(
      'var c="{\\"extra\\":{\\"apiBaseUrl\\":\\"https://vms.dallah.com\\"}}";var q="https://vms.dallah.com";',
    );
    finalizeDist({ distDir, rootDir: ROOT, environment: production, webConfig: null });
    expect(verifyBundleHosts({ distDir, environment: production }).errors).toEqual([]);
  });

  it("fails a production bundle that never mentions the production backend", () => {
    seedDist('var a="https://elsewhere.example.com";');
    finalizeDist({ distDir, rootDir: ROOT, environment: production, webConfig: null });

    const { errors } = verifyBundleHosts({ distDir, environment: production });
    expect(errors).toEqual([expect.stringContaining('"vms.dallah.com"')]);
  });

  it("only tolerates bare Replit tokens inside the runtime host-detection call", () => {
    seedDist('var a="https://vms.dallah.com";var sw="https://foo.replit.app/firebase-messaging-sw.js";');
    finalizeDist({ distDir, rootDir: ROOT, environment: production, webConfig: null });

    const { errors } = verifyBundleHosts({ distDir, environment: production });
    expect(errors).toEqual([expect.stringContaining("Replit host token")]);
  });

  it("refuses to finish a bundle missing the static files from public/", () => {
    write("index.html", "<html></html>");
    write("_expo/static/js/web/index-abc123.js", PRODUCTION_BUNDLE);

    expect(() =>
      finalizeDist({ distDir, rootDir: ROOT, environment: production, webConfig: null }),
    ).toThrow(/missing required static files[\s\S]*firebase-messaging-sw\.js/);
  });

  it("validates the backend origin used for the IIS reverse proxy", () => {
    expect(assertBackendOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(assertBackendOrigin("https://backend.internal/")).toBe("https://backend.internal");
    expect(() => assertBackendOrigin("localhost:3000")).toThrow(/absolute http\(s\) URL/);
    expect(() => assertBackendOrigin("http://localhost:3000/api")).toThrow(/without a path/);
    expect(() => assertBackendOrigin("")).toThrow(/absolute http\(s\) URL/);
  });

  it("reports placeholders a template forgot to fill", () => {
    expect(renderTemplate("a %%X%% b", { X: 1 }, "t")).toBe("a 1 b");
    expect(() => renderTemplate("a %%X%% %%Y%%", { X: 1 }, "t")).toThrow(/unreplaced placeholders %%Y%%/);
  });
});
