import { resolveEnvironment, publicEnvFor } from '../config/app-environments';
import { API_BASE_URL, MICROSOFT_AUTH_BASE_URL } from '../api/backendUrls';
import { getEnvironmentConfig } from '../config/environments';

const production = 'https://vms.dallah.com';
const stale = 'https://vms-backend-app-qa.replit.app';
let mockWebExtra: Record<string, string> = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { get expoConfig() { return { extra: mockWebExtra }; } },
}));

function webUrlsFor(extra: Record<string, string>) {
  mockWebExtra = extra;
  let urls: typeof import('../api/backendUrls.web');
  jest.isolateModules(() => { urls = require('../api/backendUrls.web'); });
  return urls!;
}

describe('backend targets stay separated by client build', () => {
  it.each(['production', 'preview', 'development', ''])(
    'keeps production variants on the live backend despite stale QA overrides (%s)', appVariant => {
      const resolved = resolveEnvironment({
        appVariant,
        env: {
          EXPO_PUBLIC_API_BASE_URL: stale,
          EXPO_PUBLIC_VMS_API_BASE_URL: stale,
          EXPO_PUBLIC_MICROSOFT_AUTH_URL: stale,
        },
        fileEnv: {
          API_BASE_URL: stale, MICROSOFT_AUTH_URL: stale,
          EXPO_PUBLIC_API_BASE_URL: stale, EXPO_PUBLIC_MICROSOFT_AUTH_URL: stale,
        },
      });
      expect(resolved.apiBaseUrl).toBe(production);
      expect(resolved.microsoftAuthUrl).toBe(production);
      expect(publicEnvFor(resolved)).toMatchObject({
        EXPO_PUBLIC_API_BASE_URL: production,
        EXPO_PUBLIC_VMS_API_BASE_URL: production,
        EXPO_PUBLIC_MICROSOFT_AUTH_URL: production,
      });
    },
  );

  it.each(['qa', 'staging'])('uses QA backend for explicit web QA builds (%s)', appVariant => {
    const resolved = resolveEnvironment({ appVariant, env: { EXPO_PUBLIC_API_BASE_URL: stale } });
    expect(resolved.apiBaseUrl).toBe(stale);
    expect(resolved.microsoftAuthUrl).toBe(stale);
    expect(publicEnvFor(resolved)).toMatchObject({
      EXPO_PUBLIC_API_BASE_URL: stale,
      EXPO_PUBLIC_VMS_API_BASE_URL: stale,
      EXPO_PUBLIC_MICROSOFT_AUTH_URL: stale,
    });
  });

  it('keeps native and helper defaults on production', () => {
    expect([API_BASE_URL, MICROSOFT_AUTH_BASE_URL]).toEqual([production, production]);
    expect(getEnvironmentConfig().backend).toEqual({
      apiBaseUrl: production, vmsApiBaseUrl: production, microsoftAuthUrl: production,
    });
  });

  it.each([production, stale])('web uses its resolved build configuration (%s)', origin => {
    const originalEnv = process.env;
    process.env = {
      EXPO_PUBLIC_API_BASE_URL: origin === production ? stale : production,
      EXPO_PUBLIC_MICROSOFT_AUTH_URL: origin === production ? stale : production,
    };
    try {
      const web = webUrlsFor({ apiBaseUrl: origin, microsoftAuthUrl: origin });
      expect(web.API_BASE_URL).toBe(origin);
      expect(web.MICROSOFT_AUTH_BASE_URL).toBe(origin);
    } finally {
      process.env = originalEnv;
    }
  });

  it('fails explicitly rather than silently falling back to production without web configuration', () => {
    const originalEnv = process.env;
    process.env = {};
    try {
      expect(() => webUrlsFor({})).toThrow('Missing web API configuration');
    } finally {
      process.env = originalEnv;
    }
  });

  it('keeps every configured EAS profile on production', () => {
    const eas = require('../eas.json');
    for (const profile of Object.values(eas.build) as { env: { APP_VARIANT: string } }[]) {
      expect(resolveEnvironment({ appVariant: profile.env.APP_VARIANT, env: {} }).apiBaseUrl).toBe(production);
    }
  });
});
