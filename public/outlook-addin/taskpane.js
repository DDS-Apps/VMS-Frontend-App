// VMS Outlook Add-in — Task Pane
// Opens the VMS web app with sender details pre-filled via URL query params.
//
// APP_URL comes from window.__VMS_APP_URL__, which the backend injects into
// taskpane.html at serve time using the EXPO_PUBLIC_APP_DOMAIN environment variable.
// Falls back to window.location.origin if the placeholder was never substituted
// (e.g. during local development when the file is served as plain static).
const APP_URL = (
  typeof window.__VMS_APP_URL__ === 'string' &&
  window.__VMS_APP_URL__ &&
  !window.__VMS_APP_URL__.includes('%%')
) ? window.__VMS_APP_URL__ : window.location.origin;

Office.onReady(function () {
  populateSenderPreview();
  document.getElementById('openBtn').addEventListener('click', openRequestForm);
});

function populateSenderPreview() {
  try {
    var item = Office.context.mailbox.item;
    if (!item || !item.from) return;

    var from = item.from;
    var nameEl = document.getElementById('senderName');
    var emailEl = document.getElementById('senderEmail');
    var infoEl = document.getElementById('senderInfo');

    if (from.displayName) nameEl.textContent = from.displayName;
    if (from.emailAddress) emailEl.textContent = from.emailAddress;

    if (from.displayName || from.emailAddress) {
      infoEl.style.display = 'block';
    }
  } catch (e) {
    // Non-critical — preview is optional
  }
}

function openRequestForm() {
  var statusEl = document.getElementById('status');
  statusEl.textContent = 'Opening…';
  statusEl.className = '';

  try {
    var item = Office.context.mailbox.item;
    if (!item) {
      statusEl.textContent = 'Could not read email details.';
      statusEl.className = 'error';
      return;
    }

    var params = new URLSearchParams();
    var from = item.from;
    if (from) {
      if (from.displayName) params.set('name', from.displayName);
      if (from.emailAddress) params.set('email', from.emailAddress);
    }

    var url = APP_URL + '/requests/new?' + params.toString();

    // Opens in the system browser — works in Outlook Desktop and OWA
    Office.context.ui.openBrowserWindow(url);
    statusEl.textContent = 'Opened in browser.';
  } catch (e) {
    statusEl.textContent = 'Error: ' + (e.message || 'Could not open browser.');
    statusEl.className = 'error';
  }
}
