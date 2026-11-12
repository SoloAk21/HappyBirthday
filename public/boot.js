// Start loading the private content while the app bundle is still downloading.
// Without a session the server answers {"authenticated":false} to this probe and
// the app shows the unlock screen. The promise is consumed once by the app.
window.__moonContent = fetch('/api/content', {
  credentials: 'same-origin',
  cache: 'no-store',
  headers: { 'X-Moon-Probe': '1' },
}).catch(function () {
  return null;
});
