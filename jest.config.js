module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify|lottie-react-native|@tanstack)',
  ],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.cache/',
    // Uses node:test, not Jest. Included in npm test via test:ios-auth.
    '/scripts/apple-auth-service-key\\.test\\.js$',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.cache/',
  ],
};
