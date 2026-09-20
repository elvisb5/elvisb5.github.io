/* Portfolio : interactions de la page. JavaScript pur, aucune dépendance.
   (Les scènes 3D sont dans scene.js.) */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---- Informations personnelles (js/profile.js) ----
  var P = window.PROFILE || {};
  $$('[data-p]').forEach(function (el) {
    var v = P[el.getAttribute('data-p')];
    if (v) el.textContent = v;
  });
  if (P.fullName) document.title = P.fullName + ' · ' + (P.role || 'Portfolio');
  if (P.email) { var mail = $('#mailBtn'); if (mail) mail.href = 'mailto:' + P.email; }
  if (P.github) { var gh = $('#ghBtn'); if (gh) gh.href = P.github; }
  (P.phones || []).forEach(function (ph, i) {
    var a = $('#phone' + (i + 1));
    if (!a) return;
    a.href = 'tel:' + ph.tel;
    var b = $('b', a); if (b) b.textContent = ph.label;
  });
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  // ---- Menu mobile ----
  var menuBtn = $('#menuBtn'), nav = $('#nav');
  function closeMenu() { if (nav) nav.classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  // ---- En-tête, progression, ligne du parcours ----
  var header = $('#header'), progress = $('#progress'), timeline = $('#timeline');
  function onScroll() {
    var y = window.scrollY || doc.scrollTop;
    if (header) header.classList.toggle('scrolled', y > 8);
    var max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    if (timeline) {
      var r = timeline.getBoundingClientRect();
      var p = (window.innerHeight * 0.7 - r.top) / (r.height || 1);
      timeline.style.setProperty('--tl', Math.max(0.05, Math.min(1, p)).toFixed(3));
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Projecteur, halo du curseur ----
  var mx = window.innerWidth / 2, my = window.innerHeight * 0.3, cx = mx, cy = my, ticking = false, cursor = null;
  if (finePointer && !reduce) {
    cursor = document.createElement('div'); cursor.className = 'cursor'; cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
  }
  function frame() {
    ticking = false;
    cx += (mx - cx) * 0.22; cy += (my - cy) * 0.22;
    doc.style.setProperty('--mx', mx + 'px'); doc.style.setProperty('--my', my + 'px');
    if (cursor) cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    if (Math.abs(mx - cx) > 0.5 || Math.abs(my - cy) > 0.5) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    if (cursor) {
      cursor.classList.add('on');
      cursor.classList.toggle('big', !!(e.target.closest && e.target.closest('a, button, summary, .chip, .thumb')));
    }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { if (cursor) cursor.classList.remove('on'); });

  // ---- Inclinaison 3D des panneaux + reflet ----
  var tiltEl = null;
  function resetTilt(el) { if (!el) return; el.classList.remove('tilting'); el.style.transform = ''; el.style.transition = ''; }
  if (!reduce) {
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var el = e.target.closest ? e.target.closest('.tilt') : null;
      if (el !== tiltEl) { resetTilt(tiltEl); tiltEl = el; }
      if (!el) return;
      var glare = $(':scope > .glare', el);
      if (!glare) { glare = document.createElement('span'); glare.className = 'glare'; glare.setAttribute('aria-hidden', 'true'); el.appendChild(glare); }
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('tilting');
      el.style.transition = 'transform 90ms linear';
      el.style.transform = 'perspective(900px) translateY(-3px) rotateX(' + ((0.5 - py) * 8).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 10).toFixed(2) + 'deg)';
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    }, { passive: true });
    document.addEventListener('pointerleave', function (e) { if (e.target === tiltEl) { resetTilt(tiltEl); tiltEl = null; } }, true);

    // ondulation + attraction des boutons
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest ? e.target.closest('.btn, .chip') : null;
      if (!b) return;
      var r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
    });
    var magEl = null;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var b = e.target.closest ? e.target.closest('.hero .btn, .contact .btn') : null;
      if (b !== magEl) { if (magEl) magEl.style.translate = ''; magEl = b; }
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.style.translate = ((e.clientX - (r.left + r.width / 2)) * 0.16).toFixed(1) + 'px ' + ((e.clientY - (r.top + r.height / 2)) * 0.22).toFixed(1) + 'px';
    }, { passive: true });
  }

  // ---- Apparition au défilement + compteurs ----
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target) || reduce) { el.textContent = target; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var reveals = $$('.reveal');
  reveals.forEach(function (el, i) { el.style.setProperty('--d', ((i % 5) * 80) + 'ms'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        $$('[data-count]', entry.target).forEach(animateCount);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
    $$('[data-count]').forEach(animateCount);
  }

  // ---- Lien actif dans le menu ----
  var links = $$('.nav a[data-section]');
  if ('IntersectionObserver' in window && links.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-section') === entry.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['parcours', 'projets', 'competences', 'contact'].forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // ---- Machine à écrire du titre ----
  var typed = $('#typed');
  if (typed) {
    var words; try { words = JSON.parse(typed.getAttribute('data-words')); } catch (e) { words = null; }
    if (words && words.length && !reduce) {
      var w = 0, i = 0, del = false;
      (function tick() {
        var word = words[w];
        typed.textContent = word.slice(0, i);
        if (!del && i === word.length) { del = true; return setTimeout(tick, 1700); }
        if (del && i === 0) { del = false; w = (w + 1) % words.length; }
        i += del ? -1 : 1;
        setTimeout(tick, del ? 30 : 62);
      })();
    }
  }

  // ---- Filtre des projets ----
  var chips = $$('.chip[data-filter]'), projects = $$('.project[data-tags]'), empty = $('#emptyFilter');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.toggle('active', c === chip); });
      var f = chip.getAttribute('data-filter'), shown = 0;
      projects.forEach(function (p) {
        var ok = f === 'all' || p.getAttribute('data-tags').split(' ').indexOf(f) !== -1;
        p.classList.toggle('hidden', !ok);
        if (ok) { shown++; p.classList.add('in'); }
      });
      if (empty) empty.hidden = shown !== 0;
    });
  });

  // ---- Galeries (une par projet) et agrandissement ----
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), openGallery = null;
  function makeGallery(root) {
    var thumbs = $$('.thumb', root), img = $('[data-img]', root), cap = $('.gallery-cap', root), mainBtn = $('[data-main]', root), current = 0;
    function show(i) {
      current = (i + thumbs.length) % thumbs.length;
      var t = thumbs[current];
      thumbs.forEach(function (x, k) { x.classList.toggle('active', k === current); });
      img.classList.add('swap');
      setTimeout(function () { img.src = t.getAttribute('data-src'); img.alt = t.getAttribute('data-alt'); img.classList.remove('swap'); }, reduce ? 0 : 160);
      if (cap) cap.textContent = t.getAttribute('data-cap');
    }
    function fill() {
      var t = thumbs[current];
      lbImg.src = t.getAttribute('data-src'); lbImg.alt = t.getAttribute('data-alt'); lbCap.textContent = t.getAttribute('data-cap');
    }
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });
    if (mainBtn && lb && typeof lb.showModal === 'function') {
      mainBtn.addEventListener('click', function () {
        openGallery = { step: function (d) { show(current + d); fill(); } };
        fill(); lb.showModal();
      });
    }
  }
  $$('[data-gallery]').forEach(makeGallery);
  if (lb) {
    $('#lbClose').addEventListener('click', function () { lb.close(); });
    $('#lbPrev').addEventListener('click', function () { if (openGallery) openGallery.step(-1); });
    $('#lbNext').addEventListener('click', function () { if (openGallery) openGallery.step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (!openGallery) return;
      if (e.key === 'ArrowLeft') openGallery.step(-1);
      if (e.key === 'ArrowRight') openGallery.step(1);
    });
  }

  // ---- Copier l'e-mail / le téléphone ----
  var toast = $('#toast'), toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }
  function copy(text, label) {
    function done() { showToast(label + ' copié : ' + text); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () { showToast(text); });
    else showToast(text);
  }
  var cm = $('#copyMail'), cp = $('#copyPhone');
  if (cm) cm.addEventListener('click', function () { copy(P.email || 'elvisbirba600@gmail.com', 'E-mail'); });
  if (cp) cp.addEventListener('click', function () { var ph = (P.phones && P.phones[0]) || { label: '+226 55 61 18 80' }; copy(ph.label, 'Numéro'); });
})();
