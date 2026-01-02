export default ({ config }) => ({
  ...config,
  owner: 'ahsanshafiq',
  extra: {
    ...config.extra,
    eas: {
      projectId: '33b6baff-6c89-44be-905f-006d0da4434d',
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_VMS_API_BASE_URL?.replace(/\/api\/?$/, '') || config.extra?.apiBaseUrl || '',
    microsoftAuthUrl: process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || config.extra?.microsoftAuthUrl || '',
  },
});
