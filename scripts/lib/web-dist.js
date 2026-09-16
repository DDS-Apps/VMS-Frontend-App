/**
 * Helpers that turn a raw `expo export --platform web` output into a
 * deployable bundle for one environment, and verify nothing from another
 * environment leaked into it. Used by scripts/build-web.js and the Jest suite.
 */
const fs = require('fs');
const path = require('path');

const {
  QA_HOSTS,
  DEV_HOST_PATTERNS,
  PRODUCTION_VARIANT,
  hostnameOf,
} = require('../../config/app-environments');

const PLACEHOLDER = /%%([A-Z0-9_]+)%%/g;

// Files every deployable bundle must contain, relative to dist/.
const REQUIRED_FILES = [
  'index.html',
  'firebase-messaging-sw.js',
  'privacy-policy.html',
  'terms-conditions.html',
  '.well-known/apple-app-site-association',
  '.well-known/assetlinks.json',
  'outlook-addin/manifest.xml',
  'outlook-addin/taskpane.html',
  'outlook-addin/taskpane.js',
  'outlook-addin/icon-16.png',
  'outlook-addin/icon-32.png',
  'outlook-addin/icon-80.png',
];

// Text files that are scanned for foreign hostnames.
const SCANNABLE = /\.(js|mjs|css|html|json|xml|txt|webmanifest|map|config)$/i;

// The only place a bare `replit.dev` / `replit.app` token may legitimately
// appear in a production bundle: runtime host detection in the web push code
// (`hostname.includes('replit.dev')`).
const ALLOWED_TOKEN_CONTEXT = /includes\(\s*["']$/;

// app.config.js's `extra` block as Metro inlines it into the bundle
// (JSON, possibly inside an escaped string), e.g. apiBaseUrl\":\"https://...
const INLINED_API_BASE_URL = /apiBaseUrl\\?":\\?"([^"\\]+)/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function renderTemplate(text, replacements, label) {
  const rendered = text.replace(PLACEHOLDER, (token, key) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, key)) return token;
    return String(replacements[key]);
  });
  const leftover = [...new Set(rendered.match(PLACEHOLDER) || [])];
  if (leftover.length > 0) {
    throw new Error(`${label}: unreplaced placeholders ${leftover.join(', ')}`);
  }
  return rendered;
}

function assertBackendOrigin(backendOrigin) {
  let parsed;
  try {
    parsed = new URL(String(backendOrigin || ''));
  } catch (_err) {
    parsed = null;
  }
  if (!parsed || !/^https?:$/.test(parsed.protocol)) {
    throw new Error(
      `VMS_BACKEND_ORIGIN must be an absolute http(s) URL such as http://localhost:3000 (got "${backendOrigin}")`,
    );
  }
  if (parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/')) {
    throw new Error(
      `VMS_BACKEND_ORIGIN must be an origin without a path, query or fragment (got "${backendOrigin}")`,
    );
  }
  return parsed.origin;
}

function outlookReplacements(environment) {
  return {
    APP_DOMAIN: environment.appDomain,
    APP_ORIGIN: `https://${environment.appDomain}`,
    ADDIN_ID: environment.outlookAddin.id,
    ADDIN_VERSION: environment.outlookAddin.version,
    ADDIN_DISPLAY_NAME: environment.outlookAddin.displayName,
  };
}

/**
 * Completes the exported bundle for an environment:
 *  - checks the static files copied from public/ are present,
 *  - substitutes the Outlook add-in placeholders,
 *  - optionally renders web/web.config into dist/ for IIS.
 * Returns a list of human-readable actions.
 */
function finalizeDist({ distDir, rootDir, environment, webConfig }) {
  const actions = [];
  const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(distDir, file)));
  if (missing.length > 0) {
    throw new Error(
      `dist/ is missing required static files (are they in public/?):\n  ${missing.join('\n  ')}`,
    );
  }

  const replacements = outlookReplacements(environment);
  for (const relative of ['outlook-addin/manifest.xml', 'outlook-addin/taskpane.html']) {
    const target = path.join(distDir, relative);
    const rendered = renderTemplate(fs.readFileSync(target, 'utf8'), replacements, relative);
    fs.writeFileSync(target, rendered);
    actions.push(`rendered ${relative} for ${environment.appDomain}`);
  }

  if (webConfig) {
    const backendOrigin = assertBackendOrigin(webConfig.backendOrigin);
    const templatePath = webConfig.templatePath || path.join(rootDir, 'web', 'web.config');
    const rendered = renderTemplate(
      fs.readFileSync(templatePath, 'utf8'),
      { BACKEND_ORIGIN: backendOrigin },
      'web.config',
    );
    fs.writeFileSync(path.join(distDir, 'web.config'), rendered);
    actions.push(`wrote web.config (backend ${backendOrigin})`);
  }

  return actions;
}

function snippet(content, index) {
  const start = Math.max(0, index - 40);
  return content.slice(start, index + 60).replace(/\s+/g, ' ');
}

/**
 * Scans the bundle for hostnames that do not belong to the target environment.
 * Returns { errors: string[], requiredHostFound: boolean }.
 */
function verifyBundleHosts({ distDir, environment }) {
  const errors = [];
  const requiredHost = hostnameOf(environment.apiBaseUrl);
  const isProduction = environment.variant === PRODUCTION_VARIANT;
  let requiredHostFound = false;

  const files = walk(distDir).filter((file) => SCANNABLE.test(file));
  for (const file of files) {
    const relative = path.relative(distDir, file).split(path.sep).join('/');
    const content = fs.readFileSync(file, 'utf8');

    // The API origin is inlined into the JS bundle; the add-in files always
    // name the web domain, so they must not satisfy this check.
    if (relative.startsWith('_expo/')) {
      if (content.includes(requiredHost)) requiredHostFound = true;
      // Whatever app.config.js resolved must match this build's environment,
      // in both directions (production URL in a QA bundle and vice versa).
      let inlined;
      while ((inlined = INLINED_API_BASE_URL.exec(content)) !== null) {
        if (inlined[1] !== environment.apiBaseUrl) {
          errors.push(
            `${relative}: bundle config apiBaseUrl is "${inlined[1]}" but the ${environment.variant} build expects "${environment.apiBaseUrl}"`,
          );
        }
      }
    }

    for (const pattern of DEV_HOST_PATTERNS) {
      const match = pattern.exec(content);
      if (match) {
        errors.push(`${relative}: development URL "${match[0]}"`);
      }
    }

    const leftover = content.match(PLACEHOLDER);
    if (leftover && !relative.startsWith('_expo/')) {
      errors.push(`${relative}: unreplaced placeholders ${[...new Set(leftover)].join(', ')}`);
    }

    if (!isProduction) continue;

    for (const host of QA_HOSTS) {
      const index = content.indexOf(host);
      if (index !== -1) {
        errors.push(`${relative}: QA host "${host}" near "${snippet(content, index)}"`);
      }
    }

    const tokenPattern = /replit\.(dev|app)/g;
    let token;
    while ((token = tokenPattern.exec(content)) !== null) {
      const context = content.slice(Math.max(0, token.index - 16), token.index);
      if (!ALLOWED_TOKEN_CONTEXT.test(context)) {
        errors.push(`${relative}: Replit host token near "${snippet(content, token.index)}"`);
      }
    }
  }

  if (!requiredHostFound) {
    errors.push(
      `no JS bundle under _expo/ references the ${environment.variant} backend host "${requiredHost}"`,
    );
  }

  return { errors, requiredHostFound, scannedFiles: files.length };
}

module.exports = {
  REQUIRED_FILES,
  finalizeDist,
  verifyBundleHosts,
  renderTemplate,
  assertBackendOrigin,
  outlookReplacements,
};
