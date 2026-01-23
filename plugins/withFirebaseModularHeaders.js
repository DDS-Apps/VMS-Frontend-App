const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      const postInstallFix = `
  # Fix React Native Firebase non-modular header warnings
  installer.pods_project.targets.each do |target|
    if target.name.start_with?('RNFB')
      target.build_configurations.each do |config|
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
      end
    end
  end
`;

      if (!podfileContent.includes('CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE')) {
        const postInstallMatch = podfileContent.match(/post_install do \|installer\|/);
        
        if (postInstallMatch) {
          const insertPosition = podfileContent.indexOf('post_install do |installer|') + 'post_install do |installer|'.length;
          podfileContent = podfileContent.slice(0, insertPosition) + postInstallFix + podfileContent.slice(insertPosition);
        }
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('[withFirebaseModularHeaders] Patched Podfile to disable RNFB non-modular header warnings');

      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
