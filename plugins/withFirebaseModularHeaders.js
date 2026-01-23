const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix React Native Firebase non-modular header errors
 * with Expo SDK 54+ and useFrameworks: 'static'
 * 
 * This plugin uses TWO approaches for maximum reliability:
 * 1. withXcodeProject - Sets build settings directly on the main project
 * 2. withDangerousMod - Patches Podfile for pods project settings
 * 
 * Reference: https://github.com/invertase/react-native-firebase/issues/8657
 */

const CLANG_SETTING = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';

// Approach 1: Set build settings via Xcode project modification
const withXcodeProjectSettings = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    console.log('[withFirebaseModularHeaders] Setting build config on Xcode project...');
    
    // Get all build configurations
    const buildConfigurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in buildConfigurations) {
      const buildConfig = buildConfigurations[key];
      if (buildConfig.buildSettings) {
        buildConfig.buildSettings[CLANG_SETTING] = 'YES';
      }
    }
    
    console.log('[withFirebaseModularHeaders] Xcode project build settings updated');
    return config;
  });
};

// Approach 2: Patch Podfile to ensure Pods project also gets the setting
const withPodfileSettings = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      console.log('[withFirebaseModularHeaders] Checking Podfile at:', podfilePath);

      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseModularHeaders] Podfile not found yet, will be created by prebuild');
        return config;
      }

      let podfileContents = fs.readFileSync(podfilePath, 'utf-8');

      // Check if already patched
      if (podfileContents.includes(CLANG_SETTING)) {
        console.log('[withFirebaseModularHeaders] Podfile already contains fix');
        return config;
      }

      // The fix to inject into post_install
      const clangFix = `
    # [withFirebaseModularHeaders] Fix for RNFirebase non-modular headers
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['${CLANG_SETTING}'] = 'YES'
      end
    end
`;

      // Try multiple patterns to find post_install block
      const patterns = [
        /post_install do \|installer\|\n/,
        /post_install do \|installer\|/,
      ];

      let patched = false;
      for (const pattern of patterns) {
        if (pattern.test(podfileContents)) {
          podfileContents = podfileContents.replace(pattern, (match) => {
            return match + clangFix;
          });
          patched = true;
          console.log('[withFirebaseModularHeaders] Successfully patched Podfile');
          break;
        }
      }

      if (!patched) {
        // If no post_install found, append one at the end
        console.log('[withFirebaseModularHeaders] No post_install found, appending new block');
        podfileContents += `
post_install do |installer|
${clangFix}
end
`;
        patched = true;
      }

      fs.writeFileSync(podfilePath, podfileContents);
      console.log('[withFirebaseModularHeaders] Podfile saved');

      return config;
    },
  ]);
};

// Combine both approaches
const withFirebaseModularHeaders = (config) => {
  config = withXcodeProjectSettings(config);
  config = withPodfileSettings(config);
  return config;
};

module.exports = withFirebaseModularHeaders;
