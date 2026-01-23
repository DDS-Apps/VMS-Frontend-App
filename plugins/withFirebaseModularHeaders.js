const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseModularHeaders] Podfile not found, skipping');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      const clangFix = `
    # Fix for React Native Firebase non-modular headers (Expo SDK 54+)
    # https://github.com/invertase/react-native-firebase/issues/8657
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const postInstallMatch = podfileContent.match(/post_install do \|installer\|/);
        
        if (postInstallMatch) {
          const insertPosition = postInstallMatch.index + postInstallMatch[0].length;
          podfileContent = podfileContent.slice(0, insertPosition) + clangFix + podfileContent.slice(insertPosition);
          fs.writeFileSync(podfilePath, podfileContent);
          console.log('[withFirebaseModularHeaders] Successfully patched Podfile with CLANG_ALLOW_NON_MODULAR_INCLUDES fix');
        } else {
          console.warn('[withFirebaseModularHeaders] Could not find post_install block in Podfile');
        }
      } else {
        console.log('[withFirebaseModularHeaders] Podfile already contains the fix');
      }

      return config;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;
