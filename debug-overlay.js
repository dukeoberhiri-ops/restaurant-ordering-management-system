// ==========================================================================
// DEBUG OVERLAY — catches any uncaught JS error or unhandled promise
// rejection and renders it as a visible on-page banner. Purely for
// diagnosing issues on mobile where DevTools aren't available. Loaded as a
// plain (non-module) script so it's active before the module script runs
// and can catch module load/import errors too. Safe to leave in place —
// it stays invisible unless something actually throws.
// ==========================================================================
(function () {
  function showError(msg) {
    var el = document.getElementById('debug-error-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'debug-error-banner';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
        'background:#B4392B;color:#fff;padding:14px 16px;font:12px/1.5 monospace;' +
        'white-space:pre-wrap;max-height:60vh;overflow:auto;box-shadow:0 4px 12px rgba(0,0,0,.3)';
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Dismiss';
      closeBtn.style.cssText = 'display:block;margin-top:10px;background:#fff;color:#B4392B;' +
        'border:none;padding:6px 12px;border-radius:4px;font-weight:bold;font-family:inherit';
      closeBtn.onclick = function () { el.remove(); };
      el.appendChild(document.createElement('div')).id = 'debug-error-text';
      el.appendChild(closeBtn);
      document.documentElement.appendChild(el);
    }
    var textEl = document.getElementById('debug-error-text');
    textEl.textContent += (textEl.textContent ? '\n\n' : '') + msg;
  }

  window.addEventListener('error', function (e) {
    var msg = 'JS Error: ' + (e.message || (e.error && e.error.message) || 'Unknown error');
    if (e.filename) msg += '\nFile: ' + e.filename.split('/').slice(-2).join('/') + ':' + e.lineno + ':' + e.colno;
    showError(msg);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    var msg = 'Unhandled promise rejection: ' + (reason && reason.message ? reason.message : String(reason));
    if (reason && reason.code) msg += '\nFirebase code: ' + reason.code;
    showError(msg);
  });
})();
