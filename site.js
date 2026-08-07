/* Rocco's Roofing — shared behaviour for every page.
   Three small things: the mobile menu, the project-photo lightbox, and the
   estimate form. Everything here is progressive enhancement: with JavaScript
   turned off the menu links, the photo links and the form all still work. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- menu */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  if (burger && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    burger.addEventListener('click', function () {
      setMenu(!menu.classList.contains('open'));
    });

    // Escape should close it, and focus goes back to the button that opened it.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ------------------------------------------------------------ lightbox */
  var tiles = document.querySelectorAll('.gallery a.lb');

  if (tiles.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Project photo');
    box.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close photo">&times;</button>' +
      '<button class="lb-nav lb-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
      '<button class="lb-nav lb-next" type="button" aria-label="Next photo">&#8250;</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(box);

    var lbImg = box.querySelector('img');
    var lbCap = box.querySelector('figcaption');
    var current = 0;
    var lastFocus = null;

    var show = function (i) {
      current = (i + tiles.length) % tiles.length;
      var tile = tiles[current];
      var thumb = tile.querySelector('img');
      lbImg.src = tile.getAttribute('href');
      lbImg.alt = thumb ? thumb.alt : '';
      var cap = tile.querySelector('.cap');
      lbCap.textContent = cap ? cap.textContent : '';
    };

    var open = function (i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add('on');
      document.body.classList.add('lb-locked');
      box.querySelector('.lb-close').focus();
    };

    var close = function () {
      box.classList.remove('on');
      document.body.classList.remove('lb-locked');
      lbImg.removeAttribute('src'); // stop a large photo downloading in the background
      if (lastFocus) lastFocus.focus();
    };

    Array.prototype.forEach.call(tiles, function (tile, i) {
      tile.addEventListener('click', function (e) {
        e.preventDefault();
        open(i);
      });
    });

    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });

    // Clicking the backdrop closes; clicking the photo itself does not.
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------------------------------------------------------------- form */
  var form = document.getElementById('estimate-form');

  if (form) {
    var status = document.getElementById('form-status');
    var submit = form.querySelector('button[type="submit"]');
    var submitText = submit ? submit.textContent : '';

    var say = function (kind, html) {
      status.className = 'form-status ' + kind;
      status.innerHTML = html;
    };

    // If the estimate never reaches Joe, the visitor still needs a way through.
    var FALLBACK =
      ' Please call <a href="tel:+16177992976">617-799-2976</a> or email ' +
      '<a href="mailto:joe@roccos-roofing.com">joe@roccos-roofing.com</a>.';

    // The no-JavaScript path posts the form natively; on failure the API sends
    // the visitor back here with ?error=1, so surface that too.
    if (window.location.search.indexOf('error=1') !== -1) {
      say('err', 'Sorry — we could not send that.' + FALLBACK);
    }

    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) return; // let the browser show its own messages
      e.preventDefault();

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      submit.disabled = true;
      submit.textContent = 'Sending…';
      say('', 'Sending your request…');

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { ok: res.ok, json: json };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.json.ok) {
            throw new Error(result.json.error || 'Sorry — we could not send that just now.');
          }
          form.reset();
          say('ok', '<strong>Thanks — your request is in.</strong> Joe will get back to you within one business day.');
        })
        .catch(function (err) {
          say('err', (err.message || 'Something went wrong.') + FALLBACK);
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = submitText;
        });
    });
  }
})();
