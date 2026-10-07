// Original dallah-albaraka-vms public client identifiers. No private keys.
// Shared by Expo/Metro, app.config.js and the messaging service worker.
(function (root) {
  const config = Object.freeze({
    apiKey: 'AIzaSyAY6g-50Gu5zlB3sbkKHuuG5DpBOLZd_xo',
    authDomain: 'dallah-albaraka-vms.firebaseapp.com',
    projectId: 'dallah-albaraka-vms',
    storageBucket: 'dallah-albaraka-vms.firebasestorage.app',
    messagingSenderId: '913604772710',
    appId: '1:913604772710:web:46c93bf8fbcd061362bea7',
  });
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  } else {
    root.firebaseWebConfig = config;
  }
})(globalThis);
