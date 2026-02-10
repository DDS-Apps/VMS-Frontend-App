module.exports = function (api) {
  api.cache(true);

  const plugins = [
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./",
        },
        extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
      },
    ],
    "react-native-reanimated/plugin",
  ];

  if (process.env.NODE_ENV === "production" || process.env.APP_VARIANT === "production") {
    plugins.unshift([
      "transform-remove-console",
      { exclude: ["warn", "error"] },
    ]);
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
