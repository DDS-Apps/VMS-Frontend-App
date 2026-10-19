import { resolveEnvironment, publicEnvFor } from '../config/app-environments';
import { API_BASE_URL, MICROSOFT_AUTH_BASE_URL } from '../api/backendUrls';
import { API_BASE_URL as WEB_API, MICROSOFT_AUTH_BASE_URL as WEB_AUTH } from '../api/backendUrls.web';
import { getEnvironmentConfig } from '../config/environments';

const production = 'https://vms.dallah.com';
const stale = 'https://vms-backend-app-qa.replit.app';

describe('backend variant isolation', () => {
  it.each(['production', 'qa', 'staging', 'preview', 'development', ''])(
    'ignores stale backend overrides for %s', appVariant => {
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
      const expected = appVariant === 'qa' || appVariant === 'staging' ? stale : production;
      expect(resolved.apiBaseUrl).toBe(expected);
      expect(resolved.microsoftAuthUrl).toBe(expected);
      expect(publicEnvFor(resolved)).toMatchObject({
        EXPO_PUBLIC_API_BASE_URL: expected,
        EXPO_PUBLIC_VMS_API_BASE_URL: expected,
        EXPO_PUBLIC_MICROSOFT_AUTH_URL: expected,
      });
    },
  );

  it('uses the same origin for native, web, and configuration helpers', () => {
    expect([API_BASE_URL, MICROSOFT_AUTH_BASE_URL, WEB_API, WEB_AUTH]).toEqual(Array(4).fill(production));
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
