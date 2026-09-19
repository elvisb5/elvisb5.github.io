/* Portfolio : interactions. JavaScript pur, aucune dépendance. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---- Informations personnelles (js/profile.js) ----
  var P = window.PROFILE || {};
  $$('[data-p]').forEach(function (el) {
    var v = P[el.getAttribute('data-p')];
    if (v) el.textContent = v;
  });
  if (P.fullName) {
    document.title = P.fullName + ' · ' + (P.role || 'Portfolio');
    var brandMark = $('.brand-mark');
    if (brandMark) brandMark.textContent = P.fullName.charAt(0).toUpperCase();
  }
  if (P.email) { var mail = $('#mailBtn'); if (mail) mail.href = 'mailto:' + P.email; }
  if (P.github) { var gh = $('#ghBtn'); if (gh) gh.href = P.github; }
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  // ---- Thème clair / sombre ----
  var root = document.documentElement;
  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0b1220' : '#f6f8fc');
  });

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

  // ---- En-tête, barre de progression ----
  var header = $('#header'), progress = $('#progress');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('scrolled', y > 8);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Apparition au défilement + compteurs ----
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target) || reduceMotion) { el.textContent = target; return; }
    var start = null, dur = 1200;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var reveals = $$('.reveal');
  reveals.forEach(function (el, i) { el.style.setProperty('--d', ((i % 4) * 80) + 'ms'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        $$('[data-count]', entry.target).forEach(animateCount);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
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
    ['projets', 'competences', 'apropos', 'contact'].forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // ---- Mots qui défilent dans le titre ----
  var rot = $('#rotator');
  if (rot && !reduceMotion) {
    var words = ['des applications web', 'des PWA installables', 'des outils de gestion', 'des logiciels Windows'];
    var wi = 0;
    setInterval(function () {
      rot.classList.add('swap');
      setTimeout(function () { wi = (wi + 1) % words.length; rot.textContent = words[wi]; rot.classList.remove('swap'); }, 350);
    }, 2800);
  }

  // ---- Filtre des projets ----
  var chips = $$('.chip[data-filter]');
  var projects = $$('.project[data-tags]');
  var empty = $('#emptyFilter');
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

  // ---- Galerie et agrandissement ----
  var thumbs = $$('.thumb');
  var mainImg = $('#galleryImg'), cap = $('#galleryCap'), mainBtn = $('#galleryMain');
  var current = 0;
  function show(i) {
    if (!thumbs.length) return;
    current = (i + thumbs.length) % thumbs.length;
    var t = thumbs[current];
    thumbs.forEach(function (x, k) { x.classList.toggle('active', k === current); });
    if (mainImg) {
      mainImg.classList.add('swap');
      setTimeout(function () {
        mainImg.src = t.getAttribute('data-src');
        mainImg.alt = t.getAttribute('data-alt');
        mainImg.classList.remove('swap');
      }, reduceMotion ? 0 : 160);
    }
    if (cap) cap.textContent = t.getAttribute('data-cap');
  }
  thumbs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });

  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  function fillLightbox() {
    var t = thumbs[current];
    lbImg.src = t.getAttribute('data-src');
    lbImg.alt = t.getAttribute('data-alt');
    lbCap.textContent = t.getAttribute('data-cap');
  }
  function stepLightbox(d) { show(current + d); fillLightbox(); }
  if (lb && mainBtn && typeof lb.showModal === 'function') {
    mainBtn.addEventListener('click', function () { fillLightbox(); lb.showModal(); });
    $('#lbClose').addEventListener('click', function () { lb.close(); });
    $('#lbPrev').addEventListener('click', function () { stepLightbox(-1); });
    $('#lbNext').addEventListener('click', function () { stepLightbox(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  // ---- Copier l'adresse e-mail ----
  var toast = $('#toast'), toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  var copyBtn = $('#copyBtn');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var text = P.email || 'elvisbirba600@gmail.com';
    function done() { showToast('Adresse copiée : ' + text); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { showToast(text); });
    } else {
      showToast(text);
    }
  });
})();
