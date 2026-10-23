import fs from 'fs';
import path from 'path';

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

  it('uses QA for Replit web preview and publishing without changing production IIS builds', () => {
    const config = fs.readFileSync(path.join(root, '.replit'), 'utf8');
    const deployment = config.split('[deployment]')[1].split('\n[')[0];
    expect(deployment).toMatch(/build\s*=\s*\[.*"--variant",\s*"qa"/);
    expect(config).toContain('APP_VARIANT=qa CI=1');
    const pkg = require('../package.json');
    expect(pkg.scripts['build:web']).toContain('--variant qa');
    expect(pkg.scripts['build:web:production']).toContain('--variant production');
    expect(pkg.scripts['dev:web']).toContain('APP_VARIANT=qa');
    expect(pkg.scripts.web).toContain('APP_VARIANT=qa');
    const environment = resolveEnvironment({ appVariant: 'qa' });
    expect(environment.apiBaseUrl).toBe('https://vms-backend-app-qa.replit.app');
    expect(environment.microsoftAuthUrl).toBe(environment.apiBaseUrl);
    expect(() => assertProductionConfig(environment)).not.toThrow();
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
