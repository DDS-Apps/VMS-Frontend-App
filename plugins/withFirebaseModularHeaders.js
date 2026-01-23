const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseModularHeaders] Podfile not found, skipping');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Add $RNFirebaseAsStaticFramework = true at the very beginning
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = `$RNFirebaseAsStaticFramework = true\n\n` + podfileContent;
        console.log('[withFirebaseModularHeaders] Added $RNFirebaseAsStaticFramework = true');
      }

      // Add post_install fix for non-modular headers
      const postInstallFix = `
    # Fix React Native Firebase non-modular header warnings
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        if target.name.start_with?('RNFB') || target.name.include?('Firebase') || target.name.include?('GoogleUtilities')
          build_config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
        end
        # Also disable strict modular headers for all pods to ensure compatibility
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      if (!podfileContent.includes('CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE')) {
        // Find post_install block and add our fix
        const postInstallMatch = podfileContent.match(/post_install do \|installer\|/);
        
        if (postInstallMatch) {
          const insertPosition = postInstallMatch.index + postInstallMatch[0].length;
          podfileContent = podfileContent.slice(0, insertPosition) + postInstallFix + podfileContent.slice(insertPosition);
          console.log('[withFirebaseModularHeaders] Added post_install fix');
        }
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('[withFirebaseModularHeaders] Podfile patched successfully');

      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
