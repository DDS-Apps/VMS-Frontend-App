const { withAndroidManifest } = require('@expo/config-plugins');

function addToolsNamespace(manifest) {
  if (!manifest.manifest.$) {
    manifest.manifest.$ = {};
  }
  manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  return manifest;
}

function upsertNotificationMetadata(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) return manifest;

  if (!application['meta-data']) {
    application['meta-data'] = [];
  }

  const metaData = application['meta-data'];
  
  const notificationChannelKey = 'com.google.firebase.messaging.default_notification_channel_id';
  const notificationColorKey = 'com.google.firebase.messaging.default_notification_color';

  let channelEntry = metaData.find(
    (item) => item.$?.['android:name'] === notificationChannelKey
  );
  if (!channelEntry) {
    channelEntry = {
      $: {
        'android:name': notificationChannelKey,
        'android:value': 'default',
      },
    };
    metaData.push(channelEntry);
  }
  channelEntry.$['tools:replace'] = 'android:value';

  let colorEntry = metaData.find(
    (item) => item.$?.['android:name'] === notificationColorKey
  );
  if (!colorEntry) {
    colorEntry = {
      $: {
        'android:name': notificationColorKey,
        'android:resource': '@color/notification_color',
      },
    };
    metaData.push(colorEntry);
  }
  colorEntry.$['tools:replace'] = 'android:resource';

  return manifest;
}

module.exports = function withNotificationManifestFix(config) {
  return withAndroidManifest(config, async (config) => {
    config.modResults = addToolsNamespace(config.modResults);
    config.modResults = upsertNotificationMetadata(config.modResults);
    return config;
  });
};
