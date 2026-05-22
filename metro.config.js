const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Exclude .local directory (contains Replit workflow logs and state files
// that are created/deleted dynamically and cause Metro's FallbackWatcher to crash)
const localDir = path.resolve(__dirname, '.local');
const existingBlockList = config.resolver.blockList;
const blockListRegex = new RegExp(
  `^${localDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`
);
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, blockListRegex];
} else if (existingBlockList) {
  config.resolver.blockList = [existingBlockList, blockListRegex];
} else {
  config.resolver.blockList = [blockListRegex];
}

module.exports = config;
