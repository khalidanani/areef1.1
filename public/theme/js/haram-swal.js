/* ════════════════════════════════════════════════════════════════════════
   HARAM SweetAlert2 theme — global JS patch
   --------------------------------------------------------------------
   Wraps `Swal.fire` so every call across the app picks up the new design
   without touching individual view files. Idempotent + safe to load before
   SweetAlert (polls briefly until window.Swal is available).

   What it does on every call:
     1. Adds `haram-swal` to customClass.popup (preserves any existing classes
        like `swal2-border-radius`).
     2. For toasts (`toast: true`), also adds the matching `haram-toast-{type}`
        colour variant class based on the `icon`.
     3. Adds default customClass entries for container/title/htmlContainer/
        confirmButton/cancelButton/denyButton (caller can override).
     4. If `icon` is set but `iconHtml` is absent, injects the matching Tabler
        glyph so the popup uses our outlined icon style.
     5. Applies our show/hide animation classes by default.
     6. Sets `buttonsStyling: false` and `reverseButtons: true` so callers
        don't need to repeat these.

   Exposes `window.haramSwal` as a convenience alias for `Swal.fire`.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var ICON_MAP = {
    success:  'tabler-check',
    error:    'tabler-x',
    warning:  'tabler-alert-triangle',
    info:     'tabler-info-circle',
    question: 'tabler-help-circle'
  };

  var TOAST_TYPE_CLASS = {
    success:  'haram-toast-success',
    error:    'haram-toast-error',
    warning:  'haram-toast-warning',
    info:     'haram-toast-info',
    question: 'haram-toast-info'
  };

  function mergePopupClass(existing, addition) {
    if (!existing) return addition;
    // Avoid duplicating `haram-swal` if caller already included it
    var parts = existing.split(/\s+/).filter(Boolean);
    addition.split(/\s+/).forEach(function (cls) {
      if (cls && parts.indexOf(cls) === -1) parts.push(cls);
    });
    return parts.join(' ');
  }

  function patchSwalOptions(opts) {
    if (!opts || typeof opts !== 'object') return opts;

    var isToast = opts.toast === true;
    var iconType = opts.icon;
    var ccIn = opts.customClass || {};

    // Build the popup class — always include haram-swal; for toasts add the
    // colour-variant class matching the icon type.
    var popupAdds = 'haram-swal';
    if (isToast && iconType && TOAST_TYPE_CLASS[iconType]) {
      popupAdds += ' ' + TOAST_TYPE_CLASS[iconType];
    }

    var mergedCustomClass = Object.assign({
      container:     'haram-swal-container',
      title:         'haram-swal-title',
      htmlContainer: 'haram-swal-text',
      confirmButton: 'btn btn-primary',
      cancelButton:  'btn btn-outline-secondary',
      denyButton:    'btn btn-outline-danger'
    }, ccIn);
    mergedCustomClass.popup = mergePopupClass(ccIn.popup, popupAdds);

    // Auto-inject Tabler iconHtml if icon set without iconHtml
    var iconHtml = opts.iconHtml;
    if (iconType && !iconHtml && ICON_MAP[iconType]) {
      iconHtml = '<i class="ti ' + ICON_MAP[iconType] + '"></i>';
    }

    // Animation classes — modal uses backdrop + popup; toast skips backdrop
    var showClass = opts.showClass || (isToast
      ? { popup: 'haram-swal-show' }
      : { popup: 'haram-swal-show', backdrop: 'haram-swal-backdrop-show' });
    var hideClass = opts.hideClass || (isToast
      ? { popup: 'haram-swal-hide' }
      : { popup: 'haram-swal-hide', backdrop: 'haram-swal-backdrop-hide' });

    var patched = Object.assign({
      buttonsStyling: false,
      reverseButtons: true
    }, opts, {
      customClass: mergedCustomClass,
      showClass: showClass,
      hideClass: hideClass
    });

    if (iconHtml) patched.iconHtml = iconHtml;

    return patched;
  }

  function applyPatch() {
    if (!window.Swal || window.Swal._haramPatched) return false;

    var origFire = window.Swal.fire.bind(window.Swal);

    window.Swal.fire = function () {
      // Swal.fire supports positional args: (title, text, icon)
      // For those, just pass through unchanged — the user is using a
      // simple legacy form and we don't auto-inject our theme there.
      if (arguments.length !== 1 || typeof arguments[0] !== 'object' || arguments[0] === null) {
        return origFire.apply(null, arguments);
      }
      var patched = patchSwalOptions(arguments[0]);
      return origFire(patched);
    };

    // Convenience alias
    window.haramSwal = window.Swal.fire;
    window.Swal._haramPatched = true;
    return true;
  }

  // Try immediately, then poll if SweetAlert hasn't loaded yet
  if (!applyPatch()) {
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;
      if (applyPatch() || attempts >= 50) clearInterval(interval);
    }, 100);
  }
})();
