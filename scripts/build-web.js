#!/usr/bin/env node
/**
 * Builds the deployable web bundle for one environment.
 *
 *   npm run build:web                  QA bundle for the Replit deployment
 *   npm run build:web:production       production bundle for IIS at vms.dallah.com
 *
 * Options (also settable through the environment):
 *   --variant <production|qa>   APP_VARIANT            environment to build (default: qa)
 *   --backend-origin <url>      VMS_BACKEND_ORIGIN     where IIS forwards /api and /auth/microsoft
 *                                                      (production only, e.g. http://localhost:3000)
 *   --no-web-config                                    production: do not write dist/web.config
 *                                                      (keep the web.config already on the server)
 *   --precompress / --no-precompress                   write .br/.gz variants (default: on for QA,
 *                                                      where server.js serves them; off for IIS)
 *   --skip-export                                      reuse the existing dist/ (only re-run the
 *                                                      finalize + verify steps)
 *
 * What it does:
 *   1. Resolves the environment (config/app-environments.js). For production the
 *      inherited EXPO_PUBLIC_* variables are ignored so a QA shared environment
 *      (Replit) can never leak into the production bundle.
 *   2. Runs `expo export --platform web --clear` with the resolved EXPO_PUBLIC_*
 *      values and APP_VARIANT.
 *   3. Completes dist/: checks the service worker, legal pages, .well-known and
 *      Outlook add-in files are present, fills in the add-in placeholders and
 *      (production) renders web/web.config.
 *   4. Verifies the bundle references the target backend and contains no QA or
 *      development hostnames. Any violation fails the build.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { spawnSync } = require('child_process');

const {
  PRODUCTION_VARIANT,
  normalizeVariant,
  resolveEnvironment,
  assertProductionConfig,
  publicEnvFor,
} = require('../config/app-environments');
const { finalizeDist, verifyBundleHosts } = require('./lib/web-dist');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function parseArgs(argv) {
  const options = {
    variant: process.env.APP_VARIANT,
    backendOrigin: process.env.VMS_BACKEND_ORIGIN,
    webConfig: true,
    precompress: null,
    skipExport: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (argv[i] === undefined) throw new Error(`${arg} requires a value`);
      return argv[i];
    };
    if (arg === '--variant') options.variant = next();
    else if (arg.startsWith('--variant=')) options.variant = arg.slice('--variant='.length);
    else if (arg === '--backend-origin') options.backendOrigin = next();
    else if (arg.startsWith('--backend-origin=')) options.backendOrigin = arg.slice('--backend-origin='.length);
    else if (arg === '--no-web-config') options.webConfig = false;
    else if (arg === '--precompress') options.precompress = true;
    else if (arg === '--no-precompress') options.precompress = false;
    else if (arg === '--skip-export') options.skipExport = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
      process.exit(0);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
}

function readVariantFile(variant) {
  const file = path.join(ROOT_DIR, variant === PRODUCTION_VARIANT ? '.env.production' : '.env.staging');
  if (!fs.existsSync(file)) return { file, values: {} };
  return { file, values: dotenv.parse(fs.readFileSync(file)) };
}

function banner(title) {
  console.log('');
  console.log('==========================================');
  console.log(title);
  console.log('==========================================');
}

// Runs a Node script with the current node binary. No shell is involved, so
// paths with spaces (C:\Program Files\nodejs) and Windows .cmd shims are not
// a concern.
function runNode(script, args, env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT_DIR,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(script)} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const variant = normalizeVariant(options.variant);
  const isProduction = variant === PRODUCTION_VARIANT;
  const variantFile = readVariantFile(variant);

  const environment = resolveEnvironment({
    appVariant: variant,
    fileEnv: variantFile.values,
    // A production bundle must never pick up the QA URLs from the Replit
    // shared environment; only the committed defaults and .env.production count.
    ignoreProcessEnv: isProduction,
  });
  assertProductionConfig(environment);

  banner(`VMS Frontend ${isProduction ? 'PRODUCTION' : 'QA'} web build`);
  console.log(`  variant:            ${environment.variant}`);
  console.log(`  API / backend:      ${environment.apiBaseUrl} (${environment.sources.apiBaseUrl})`);
  console.log(`  Microsoft SSO:      ${environment.microsoftAuthUrl} (${environment.sources.microsoftAuthUrl})`);
  console.log(`  app domain:         ${environment.appDomain} (${environment.sources.appDomain})`);
  console.log(`  legal pages:        ${environment.legalPagesUrl} (${environment.sources.legalPagesUrl})`);
  console.log(`  Outlook add-in id:  ${environment.outlookAddin.id}`);
  console.log(
    `  overrides file:     ${path.relative(ROOT_DIR, variantFile.file)} ${
      Object.keys(variantFile.values).length ? '(loaded)' : '(not present, using committed defaults)'
    }`,
  );

  const publicEnv = publicEnvFor(environment);
  if (isProduction) {
    const inherited = Object.keys(publicEnv).filter(
      (key) => process.env[key] !== undefined && process.env[key] !== publicEnv[key],
    );
    if (inherited.length > 0) {
      console.log(`  ignoring inherited: ${inherited.join(', ')}`);
    }
  }

  const webConfig =
    isProduction && options.webConfig
      ? { backendOrigin: options.backendOrigin }
      : null;
  if (webConfig && !webConfig.backendOrigin) {
    throw new Error(
      'Production builds write dist/web.config and need the backend address IIS should forward ' +
        '/api and /auth/microsoft to. Set VMS_BACKEND_ORIGIN (e.g. http://localhost:3000) or pass ' +
        '--backend-origin <url>, or pass --no-web-config to keep the web.config already on the server.',
    );
  }

  if (!options.skipExport) {
    console.log('');
    console.log('[BUILD] Clearing dist/ ...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });

    console.log('[BUILD] Running expo export --platform web --clear ...');
    runNode(require.resolve('expo/bin/cli'), ['export', '--platform', 'web', '--clear'], {
      ...process.env,
      ...publicEnv,
      NODE_ENV: 'production',
    });
  } else {
    console.log('');
    console.log('[BUILD] --skip-export: reusing existing dist/');
  }

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html not found after export');
  }

  console.log('');
  console.log('[BUILD] Completing dist/ ...');
  const actions = finalizeDist({ distDir: DIST_DIR, rootDir: ROOT_DIR, environment, webConfig });
  actions.forEach((action) => console.log(`  - ${action}`));

  console.log('');
  console.log('[BUILD] Verifying bundle hostnames ...');
  const { errors, scannedFiles } = verifyBundleHosts({ distDir: DIST_DIR, environment });
  if (errors.length > 0) {
    banner(`[BUILD] FAILED: ${errors.length} problem(s) found in the ${environment.variant} bundle`);
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
  console.log(`  ${scannedFiles} files scanned, no foreign hostnames found`);

  const precompress = options.precompress === null ? !isProduction : options.precompress;
  if (precompress) {
    console.log('');
    console.log('[BUILD] Pre-compressing static assets (brotli + gzip) ...');
    runNode(path.join(__dirname, 'precompress-dist.js'), [], process.env);
  } else {
    console.log('');
    console.log('[BUILD] Skipping pre-compression (IIS applies its own compression)');
  }

  banner('[BUILD] SUCCESS: bundle ready in dist/');
  console.log(`  environment:  ${environment.variant}`);
  console.log(`  backend:      ${environment.apiBaseUrl}`);
  console.log(`  web origin:   https://${environment.appDomain}`);
  if (webConfig) {
    console.log(`  web.config:   forwards /api and /auth/microsoft to ${webConfig.backendOrigin}`);
  }
  console.log('');
}

try {
  main();
} catch (error) {
  console.error('');
  console.error(`[BUILD] ERROR: ${error.message}`);
  process.exit(1);
}
