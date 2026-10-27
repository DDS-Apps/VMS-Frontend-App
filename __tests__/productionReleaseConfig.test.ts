import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const { resolveEnvironment, assertProductionConfig } = require('../config/app-environments');
const app = require('../app.json').expo;
const eas = require('../eas.json');
const root = path.resolve(__dirname, '..');

describe('production release configuration', () => {
  it.each(Object.keys(eas.build))('%s mobile profile selects production API and sign-in', profile => {
    const environment = resolveEnvironment({
      appVariant: eas.build[profile].env.APP_VARIANT,
      ignoreProcessEnv: true,
    });
    expect(environment.variant).toBe('production');
    expect(environment.apiBaseUrl).toBe('https://vms.dallah.com');
    expect(environment.microsoftAuthUrl).toBe('https://vms.dallah.com');
    expect(() => assertProductionConfig(environment)).not.toThrow();
  });

  it('keeps production API selection independent of stale QA file overrides', () => {
    const environment = resolveEnvironment({
      appVariant: 'production',
      ignoreProcessEnv: true,
      fileEnv: {
        API_BASE_URL: 'https://vms-backend-app-qa.replit.app',
        MICROSOFT_AUTH_URL: 'https://vms-backend-app-qa.replit.app',
      },
    });
    expect(environment.apiBaseUrl).toBe('https://vms.dallah.com');
    expect(environment.microsoftAuthUrl).toBe('https://vms.dallah.com');
  });

  it('lets publishing and preview inherit APP_VARIANT while IIS remains explicitly production', () => {
    const config = fs.readFileSync(path.join(root, '.replit'), 'utf8');
    const deployment = config.split('[deployment]')[1].split('\n[')[0];
    expect(deployment).toContain('"scripts/build-web.js"');
    expect(deployment).not.toMatch(/--variant|APP_VARIANT=/);
    expect(deployment).toContain('"--no-web-config"');
    expect(deployment).toContain('"--precompress"');
    const preview = config.split('name = "Start application"')[1].split('[[workflows.workflow]]')[0];
    expect(preview).toContain('start --web');
    expect(preview).not.toMatch(/APP_VARIANT=/);
    const pkg = require('../package.json');
    expect(pkg.scripts['build:web']).toContain('scripts/build-web.js');
    expect(pkg.scripts['build:web']).not.toMatch(/--variant|APP_VARIANT=/);
    expect(pkg.scripts['build:web:production']).toContain('--variant production');
    expect(pkg.scripts['dev:web']).not.toMatch(/APP_VARIANT=/);
    expect(pkg.scripts.web).not.toMatch(/APP_VARIANT=/);
    const environment = resolveEnvironment({ appVariant: 'qa' });
    expect(environment.apiBaseUrl).toBe('https://vms-backend-app-qa.replit.app');
    expect(environment.microsoftAuthUrl).toBe(environment.apiBaseUrl);
    expect(() => assertProductionConfig(environment)).not.toThrow();
  });

  it.each([
    ['qa', 'https://vms-backend-app-qa.replit.app'],
    ['production', 'https://vms.dallah.com'],
  ])('publishing command exports API and sign-in settings for APP_VARIANT=%s', (variant, origin) => {
    const config = fs.readFileSync(path.join(root, '.replit'), 'utf8');
    const deployment = config.split('[deployment]')[1].split('\n[')[0];
    const command = JSON.parse(deployment.match(/^build\s*=\s*(\[.*\])/m)![1]);
    // Exercise the real build argument/environment selection, but intercept
    // the exporter before it can run Metro or modify dist/.
    const driver = `
      require('child_process').spawnSync = (_command, _args, options) => {
        console.log('BUILD_SELECTION=' + JSON.stringify({
          variant: options.env.APP_VARIANT,
          api: options.env.EXPO_PUBLIC_API_BASE_URL,
          vmsApi: options.env.EXPO_PUBLIC_VMS_API_BASE_URL,
          signIn: options.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL,
        }));
        process.exit(0);
      };
      const command = ${JSON.stringify(command)};
      process.argv = [process.execPath, ...command.slice(1)];
      require(require('path').resolve(command[1]));
    `;
    const result = spawnSync(process.execPath, ['-e', driver], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, APP_VARIANT: variant },
      timeout: 20_000,
    });
    expect(result.status).toBe(0);
    const selection = JSON.parse(result.stdout.match(/BUILD_SELECTION=(.*)/)![1]);
    // The export environment uses the established "staging" alias for QA.
    expect(selection).toEqual({
      variant: variant === 'qa' ? 'staging' : 'production',
      api: origin, vmsApi: origin, signIn: origin,
    });
  });

  it.each([
    ['qa', 'https://vms-backend-app-qa.replit.app'],
    ['production', 'https://vms.dallah.com'],
  ])('resolves preview API and sign-in from APP_VARIANT=%s', (variant, origin) => {
    const previousVariant = process.env.APP_VARIANT;
    try {
      process.env.APP_VARIANT = variant;
      jest.isolateModules(() => {
        const configure = require('../app.config');
        const resolved = configure({ config: app });
        expect(resolved.extra.environment).toBe(variant);
        expect(resolved.extra.apiBaseUrl).toBe(origin);
        expect(resolved.extra.microsoftAuthUrl).toBe(origin);
      });
    } finally {
      if (previousVariant === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = previousVariant;
    }
  });

  it('includes the built website in deployment while keeping it out of Git', () => {
    const deploymentIgnores = fs.readFileSync(path.join(root, '.replitignore'), 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    expect(deploymentIgnores).not.toEqual(expect.arrayContaining(['/dist/']));
    expect(deploymentIgnores).not.toEqual(expect.arrayContaining(['dist/']));
    expect(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'))
      .toMatch(/(?:^|\n)\/?dist\/(?:\r?\n|$)/);
  });

  it('keeps package and app release versions aligned without disabling EAS remote counters', () => {
    const pkg = require('../package.json');
    const lock = require('../package-lock.json');
    expect(app.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).toBe(app.version);
    expect(lock.version).toBe(app.version);
    expect(lock.packages[''].version).toBe(app.version);
    expect(Number.isInteger(app.android.versionCode)).toBe(true);
    expect(app.android.versionCode).toBeGreaterThan(0);
    expect(app.ios.buildNumber).toMatch(/^[1-9]\d*$/);
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(eas.build.production.autoIncrement).toBe(true);
  });
});
