const { withPodfile } = require('@expo/config-plugins');

/**
 * Config plugin to fix React Native Firebase non-modular header errors
 * with Expo SDK 54+ and useFrameworks: 'static'
 * 
 * Reference: https://github.com/invertase/react-native-firebase/issues/8657
 * 
 * This plugin uses withPodfile mod which runs at the correct time during
 * expo prebuild, after the Podfile has been generated but before pod install.
 */
const withFirebaseModularHeaders = (config) => {
  return withPodfile(config, (config) => {
    const podfileContents = config.modResults.contents;
    
    // Check if fix is already applied
    if (podfileContents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
      console.log('[withFirebaseModularHeaders] Fix already present in Podfile');
      return config;
    }

    const clangFix = `
    # Fix for React Native Firebase non-modular headers (Expo SDK 54+)
    # https://github.com/invertase/react-native-firebase/issues/8657
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

    // Find post_install block and insert after it
    const postInstallMatch = podfileContents.match(/post_install do \|installer\|/);
    
    if (postInstallMatch) {
      const insertPosition = postInstallMatch.index + postInstallMatch[0].length;
      config.modResults.contents = 
        podfileContents.slice(0, insertPosition) + 
        clangFix + 
        podfileContents.slice(insertPosition);
      
      console.log('[withFirebaseModularHeaders] Successfully patched Podfile');
    } else {
      console.warn('[withFirebaseModularHeaders] Could not find post_install block in Podfile');
    }

    return config;
  });
};

module.exports = withFirebaseModularHeaders;
