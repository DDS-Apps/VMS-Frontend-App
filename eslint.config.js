// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*"],
  },
  {
    // Custom rules for RTL compliance
    rules: {
      // Warn when using inline flexDirection: 'row' - should use DirectionalRow instead
      // This is a reminder rule, not enforced strictly
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Property[key.name='flexDirection'][value.value='row']",
          message: "⚠️ RTL: Consider using <DirectionalRow> or useDirectionalStyle() instead of flexDirection: 'row'. See docs/RTL_ARCHITECTURE.md"
        }
      ]
    }
  }
]);
