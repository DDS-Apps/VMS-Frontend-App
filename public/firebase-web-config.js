// Public Firebase client identifiers supplied for dallah-vms. No private keys.
// Shared by Expo/Metro, app.config.js and the messaging service worker.
(function (root) {
  const config = Object.freeze({
    apiKey: 'AIzaSyDCXAFTLnvxbG8rH9LblvklbYH5t6pGYkA',
    authDomain: 'dallah-vms.firebaseapp.com',
    projectId: 'dallah-vms',
    storageBucket: 'dallah-vms.firebasestorage.app',
    messagingSenderId: '858912458229',
    appId: '1:858912458229:web:5116cd8e271071a736ccbc',
  });
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  } else {
    root.firebaseWebConfig = config;
  }
})(globalThis);
