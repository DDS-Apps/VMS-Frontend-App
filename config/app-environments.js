/**
 * Per-environment public configuration for the VMS frontend.
 *
 * This is the single source of truth for the values that differ between the
 * QA deployment (Replit) and the production deployment (IIS at vms.dallah.com):
 * backend/API origin, Microsoft SSO origin, the public app domain used for
 * iOS Universal Links / Android App Links / the Outlook add-in, and where the
 * legal HTML pages are served from.
 *
 * It is plain CommonJS on purpose: `app.config.js` (evaluated by the Expo CLI),
 * `scripts/build-web.js` and the Jest suites all consume it without a build step.
 *
 * Resolution order for each value (highest priority first):
 *   1. `EXPO_PUBLIC_<KEY>` in the process environment (Replit shared env, CI).
 *   2. `<KEY>` or `EXPO_PUBLIC_<KEY>` from the optional, git-ignored variant
 *      file (`.env.production` / `.env.staging`), when one is provided.
 *   3. The committed defaults below.
 *
 * Non-prefixed keys from the process environment are deliberately ignored:
 * the Expo CLI auto-loads `.env.production` for every `expo export`
 * (NODE_ENV=production) regardless of APP_VARIANT, so trusting
 * `process.env.API_BASE_URL` would leak production values into QA builds.
 *
 * Only public values belong here. Never add secrets.
 */

const PRODUCTION_VARIANT = 'production';
const QA_VARIANT = 'qa';

const ENVIRONMENTS = {
  [QA_VARIANT]: {
    name: QA_VARIANT,
    apiBaseUrl: 'https://vms-backend-app-qa.replit.app',
    microsoftAuthUrl: 'https://vms-backend-app-qa.replit.app',
    // The QA web app (and therefore /.well-known, /invite/* and /requests/*)
    // is served by the Replit deployment of this project.
    appDomain: 'vms-frontend-folio3.replit.app',
    legalPagesUrl: 'https://vms-frontend-folio3.replit.app',
    outlookAddin: {
      id: 'a3f7c2d1-84b6-4e9a-bc12-5f3d8e6a1c7b',
      version: '1.0.0',
      displayName: 'VMS QA - Create Visit Request',
    },
  },
  [PRODUCTION_VARIANT]: {
    name: PRODUCTION_VARIANT,
    apiBaseUrl: 'https://vms.dallah.com',
    microsoftAuthUrl: 'https://vms.dallah.com',
    appDomain: 'vms.dallah.com',
    legalPagesUrl: 'https://vms.dallah.com',
    outlookAddin: {
      // Distinct from the QA add-in so both can be deployed side by side in
      // the Microsoft 365 admin centre.
      id: 'c98d21ef-3c3e-464d-8f7a-d69538b59b5b',
      version: '1.0.0',
      displayName: 'VMS - Create Visit Request',
    },
  },
};

// Hostnames that must never appear in a production bundle. `replit.dev` and
// `replit.app` are matched as bare tokens too (see scripts/build-web.js), the
// only allowed occurrence being the runtime host-detection `includes(...)`
// call in the web push code.
const QA_HOSTS = [
  'vms-backend-app-qa.replit.app',
  'vms-frontend-folio3.replit.app',
  'vms-backend-folio3.replit.app',
];

// Workspace / preview hostnames that must never appear in any exported bundle:
// every *.replit.dev URL (development workspaces) plus the historical forms.
const DEV_HOST_PATTERNS = [
  /https?:\/\/[^\s"'`]*\.replit\.dev/,
  /https?:\/\/b4ba7f88-2197-4a63/,
];

// Maps config keys to the environment variable names that may override them.
const ENV_KEYS = {
  apiBaseUrl: 'API_BASE_URL',
  microsoftAuthUrl: 'MICROSOFT_AUTH_URL',
  appDomain: 'APP_DOMAIN',
  legalPagesUrl: 'LEGAL_PAGES_URL',
};

function normalizeVariant(appVariant) {
  return String(appVariant || '').trim().toLowerCase() === PRODUCTION_VARIANT
    ? PRODUCTION_VARIANT
    : QA_VARIANT;
}

function isDevHost(value) {
  return DEV_HOST_PATTERNS.some((pattern) => pattern.test(String(value || '')));
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function hostnameOf(urlOrHost) {
  const value = String(urlOrHost || '').trim();
  if (!value) return '';
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
  } catch (_err) {
    return value.toLowerCase();
  }
}

function firstDefined(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

/**
 * Resolves the public configuration for a variant.
 *
 * @param {object} [options]
 * @param {string} [options.appVariant]  APP_VARIANT value ('production' | anything else = QA).
 * @param {object} [options.env]         Process environment (defaults to process.env).
 * @param {object} [options.fileEnv]     Parsed key/value pairs from the variant .env file.
 * @param {boolean} [options.ignoreProcessEnv]  Skip step 1 (used for production builds so
 *                                              a QA shared env can never leak in). The
 *                                              skipped variables are listed in `ignored`.
 */
function resolveEnvironment(options = {}) {
  const variant = normalizeVariant(options.appVariant);
  const processEnv = options.env || process.env;
  const env = options.ignoreProcessEnv ? {} : processEnv;
  const fileEnv = options.fileEnv || {};
  const defaults = ENVIRONMENTS[variant];
  const sources = {};
  // EXPO_PUBLIC_* URL variables present in the process but not applied.
  const ignored = options.ignoreProcessEnv
    ? Object.values(ENV_KEYS)
        .map((envKey) => `EXPO_PUBLIC_${envKey}`)
        .filter((publicKey) => firstDefined(processEnv[publicKey]) !== undefined)
    : [];

  const pick = (key) => {
    const envKey = ENV_KEYS[key];
    const publicKey = `EXPO_PUBLIC_${envKey}`;
    let note = '';
    const fromProcess = firstDefined(env[publicKey]);
    if (fromProcess !== undefined) {
      if (isDevHost(fromProcess)) {
        note = ` (${publicKey} ignored: development host)`;
      } else {
        sources[key] = publicKey;
        return fromProcess;
      }
    }
    const fromFile = firstDefined(fileEnv[envKey], fileEnv[publicKey]);
    if (fromFile !== undefined) {
      sources[key] = `variant file ${envKey}${note}`;
      return fromFile;
    }
    sources[key] = `default${note}`;
    return defaults[key];
  };

  const apiBaseUrl = stripTrailingSlash(pick('apiBaseUrl'));
  // Microsoft SSO is served by the same backend unless explicitly overridden.
  const microsoftAuthUrlRaw = pick('microsoftAuthUrl');
  const microsoftAuthUrl = stripTrailingSlash(
    sources.microsoftAuthUrl.startsWith('default') ? apiBaseUrl : microsoftAuthUrlRaw,
  );
  const appDomain = hostnameOf(pick('appDomain'));
  const legalPagesUrl = stripTrailingSlash(pick('legalPagesUrl'));

  return {
    variant,
    apiBaseUrl,
    microsoftAuthUrl,
    appDomain,
    legalPagesUrl,
    outlookAddin: { ...defaults.outlookAddin },
    sources,
    ignored,
  };
}

/**
 * Throws when a production configuration still points at a QA or development
 * host (e.g. a stale `.env.production`). Called from app.config.js so
 * `APP_VARIANT=production` can never be built against the QA backend.
 */
function assertProductionConfig(resolved) {
  if (resolved.variant !== PRODUCTION_VARIANT) return;
  const offenders = [];
  for (const key of ['apiBaseUrl', 'microsoftAuthUrl', 'appDomain', 'legalPagesUrl']) {
    const host = hostnameOf(resolved[key]);
    if (QA_HOSTS.includes(host) || isDevHost(resolved[key]) || host.endsWith('.replit.app') || host.endsWith('.replit.dev')) {
      offenders.push(`${key}=${resolved[key]} (from ${resolved.sources[key]})`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `[app-environments] APP_VARIANT=production resolved to non-production hosts:\n  ${offenders.join(
        '\n  ',
      )}\nUnset the EXPO_PUBLIC_* overrides (or run "npm run build:web:production", which ignores them).`,
    );
  }
}

/** The EXPO_PUBLIC_* variables Metro must inline for a given resolved config. */
function publicEnvFor(resolved) {
  return {
    APP_VARIANT: resolved.variant === PRODUCTION_VARIANT ? PRODUCTION_VARIANT : 'staging',
    EXPO_PUBLIC_API_BASE_URL: resolved.apiBaseUrl,
    EXPO_PUBLIC_VMS_API_BASE_URL: resolved.apiBaseUrl,
    EXPO_PUBLIC_MICROSOFT_AUTH_URL: resolved.microsoftAuthUrl,
    EXPO_PUBLIC_APP_DOMAIN: resolved.appDomain,
    EXPO_PUBLIC_LEGAL_PAGES_URL: resolved.legalPagesUrl,
  };
}

/** Deep-link paths the mobile apps claim on the app domain. */
const APP_LINK_PATH_PREFIXES = ['/requests/new', '/invite/', '/requests/'];

module.exports = {
  ENVIRONMENTS,
  QA_HOSTS,
  DEV_HOST_PATTERNS,
  APP_LINK_PATH_PREFIXES,
  PRODUCTION_VARIANT,
  QA_VARIANT,
  normalizeVariant,
  resolveEnvironment,
  assertProductionConfig,
  publicEnvFor,
  hostnameOf,
  isDevHost,
};
