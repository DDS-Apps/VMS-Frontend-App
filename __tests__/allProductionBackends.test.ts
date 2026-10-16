import { resolveEnvironment, publicEnvFor } from '../config/app-environments';
import { API_BASE_URL, MICROSOFT_AUTH_BASE_URL } from '../api/backendUrls';
import { API_BASE_URL as WEB_API, MICROSOFT_AUTH_BASE_URL as WEB_AUTH } from '../api/backendUrls.web';
import { getEnvironmentConfig } from '../config/environments';

const production = 'https://vms.dallah.com';
const stale = 'https://vms-backend-app-qa.replit.app';

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

  it('keeps native and helper defaults on production while web accepts its build-time target', () => {
    expect([API_BASE_URL, MICROSOFT_AUTH_BASE_URL]).toEqual([production, production]);
    expect([WEB_API, WEB_AUTH]).toEqual([
      process.env.EXPO_PUBLIC_API_BASE_URL || production,
      process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || process.env.EXPO_PUBLIC_API_BASE_URL || production,
    ]);
    expect(getEnvironmentConfig().backend).toEqual({
      apiBaseUrl: production, vmsApiBaseUrl: production, microsoftAuthUrl: production,
    });
  });

  it('keeps every configured EAS profile on production', () => {
    const eas = require('../eas.json');
    for (const profile of Object.values(eas.build) as { env: { APP_VARIANT: string } }[]) {
      expect(resolveEnvironment({ appVariant: profile.env.APP_VARIANT, env: {} }).apiBaseUrl).toBe(production);
    }
  });
});
