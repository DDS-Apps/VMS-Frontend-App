export default ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    extra: {
      ...config.expo?.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_VMS_API_BASE_URL?.replace(/\/api\/?$/, '') || '',
      microsoftAuthUrl: process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || '',
    },
  },
});
