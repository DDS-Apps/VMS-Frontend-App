const PRODUCTION_BACKEND_URL = 'https://vms-backend-folio3.replit.app';

export default ({ config }) => ({
  ...config,
  owner: 'ahsanshafiq',
  extra: {
    ...config.extra,
    eas: {
      projectId: '33b6baff-6c89-44be-905f-006d0da4434d',
    },
    apiBaseUrl: PRODUCTION_BACKEND_URL,
    microsoftAuthUrl: PRODUCTION_BACKEND_URL,
  },
});
