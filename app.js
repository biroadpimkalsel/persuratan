/* Halaman pembungkus Sistem Persuratan Digital.
   - Memuat aplikasi Apps Script dalam iframe "credentialless" (tanpa membawa akun Google browser),
     sehingga error "tidak dapat membuka file" karena banyak akun Google tidak terjadi.
   - Menyimpan sesi login (psd_*) di halaman ini, hanya untuk pesan dari aplikasi di dalam iframe ini. */
(function () {
  'use strict';
  var APP_URL = 'https://script.google.com/macros/s/AKfycbyxKVEydEgWgQY8VK56uiCcvOaY_n2WC2BdJpgs4vmR5SjsdUKRG0NDKF1Brqn1FtUs/exec';
  var ORIGIN_RE = /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/;
  var PREFIX = 'psd_';
  var MAX_LEN = 4000000;

  var frame = document.getElementById('app');
  frame.setAttribute('credentialless', '');           // harus dipasang SEBELUM src
  frame.src = APP_URL;
  frame.addEventListener('load', function () { document.body.classList.add('loaded'); });
  if (!('credentialless' in HTMLIFrameElement.prototype)) document.body.classList.add('no-cl');

  /* Pastikan pengirim pesan benar-benar frame di dalam iframe aplikasi ini (bukan tab/situs lain). */
  function fromOurApp(src) {
    try {
      var queue = [frame.contentWindow];
      for (var depth = 0; depth < 4 && queue.length; depth++) {
        var n = queue.length;
        for (var i = 0; i < n; i++) {
          var w = queue.shift();
          if (w === src) return true;
          for (var j = 0; j < w.frames.length; j++) queue.push(w.frames[j]);
        }
      }
    } catch (e) {}
    return false;
  }
  function ls(fn) { try { return fn(); } catch (e) { return null; } }

  window.addEventListener('message', function (e) {
    if (!ORIGIN_RE.test(e.origin) || !fromOurApp(e.source)) return;
    var d = e.data;
    if (!d || typeof d.type !== 'string') return;
    if (d.type === 'psd-hello') {
      var items = {};
      ls(function () {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) items[k] = localStorage.getItem(k);
        }
      });
      e.source.postMessage({ type: 'psd-snapshot', items: items }, e.origin);
      return;
    }
    if (typeof d.key !== 'string' || d.key.indexOf(PREFIX) !== 0 || d.key.length > 64) return;
    if (d.type === 'psd-set' && typeof d.value === 'string' && d.value.length < MAX_LEN) {
      ls(function () { localStorage.setItem(d.key, d.value); });
    } else if (d.type === 'psd-remove') {
      ls(function () { localStorage.removeItem(d.key); });
    }
  });

})();
