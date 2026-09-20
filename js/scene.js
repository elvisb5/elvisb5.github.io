/* ===========================
   Portfolio - scènes 3D (Three.js)
   1) Fond : carte électronique interactive (puce, pistes, LED, écran web)
      + particules. Cliquer la puce envoie un signal sur toutes les pistes.
   2) Sphère des compétences (glisser pour tourner, survoler un mot).
   Sans WebGL, un fond de particules 2D prend le relais.
   =========================== */
import * as THREE from 'three';

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 768px)').matches || matchMedia('(pointer: coarse)').matches;
const C = { violet: 0x7c5cff, cyan: 0x22d3ee, amber: 0xffb547, green: 0x34d399, pink: 0xff5c7a };
const INTERACTIVE = 'a, button, input, summary, .panel, .project, .chip, .thumb, .contact-item, .sphere-box, nav, .lightbox';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const pointer = { x: 0, y: 0, sx: 0, sy: 0, free: false };
function readPointer(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / innerHeight) * 2 - 1);
  pointer.free = !(e.target && e.target.closest && e.target.closest(INTERACTIVE));
}
addEventListener('pointermove', readPointer, { passive: true });
addEventListener('pointerdown', readPointer, { passive: true });

const hud = document.getElementById('hud');
let hudTimer = 0;
function say(text, ms = 2600) {
  if (!hud) return;
  hud.textContent = text; hud.classList.add('on');
  clearTimeout(hudTimer); hudTimer = setTimeout(() => hud.classList.remove('on'), ms);
}

/* ---------- Textures ---------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textSprite(text, color = '#A78BFA', px = 40, shadow = 14) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `700 ${px}px Consolas, "Courier New", monospace`;
  const w = Math.ceil(g.measureText(text).width) + 40, h = px + 40;
  c.width = w; c.height = h;
  g.font = `700 ${px}px Consolas, "Courier New", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = shadow; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.userData.aspect = w / h; s.userData.h = h; return s;
}

/* ---------- Particules (shader) ---------- */
const PARTICLE_VS = `
uniform float uTime; uniform float uPx; uniform float uSize; uniform vec3 uMouse;
attribute float aSeed; attribute vec3 aColor;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec3 p = position; float t = uTime;
  p.x += sin(t * 0.21 + aSeed * 40.0) * 0.35;
  p.y += cos(t * 0.17 + aSeed * 23.0) * 0.35 + sin(t * 0.05 + aSeed * 9.0) * 0.2;
  p.z += sin(t * 0.13 + aSeed * 57.0) * 0.4;
  vec2 d = p.xy - uMouse.xy;
  float f = smoothstep(2.8, 0.0, length(d));
  p.xy += normalize(d + vec2(1e-4)) * f * 0.95;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.7 + 0.3 * sin(t * 1.6 + aSeed * 90.0);
  gl_PointSize = uSize * uPx * (0.5 + fract(aSeed * 13.7)) * tw * (240.0 / -mv.z);
  vColor = aColor * (1.0 + f * 1.6);
  vAlpha = 0.7 * tw;
}`;
const PARTICLE_FS = `
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d); a *= a;
  gl_FragColor = vec4(vColor, a * vAlpha);
  #include <colorspace_fragment>
}`;
function makeParticles(count, sx, sy, sz, px, size) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), col = new Float32Array(count * 3);
  const pal = [new THREE.Color(C.violet), new THREE.Color(C.cyan), new THREE.Color(0xc9d1ff), new THREE.Color(C.amber)];
  for (let i = 0; i < count; i++) {
    pos.set([rand(-sx, sx), rand(-sy, sy), rand(-sz, sz)], i * 3); seed[i] = Math.random();
    const r = Math.random(), c = pal[r < 0.42 ? 0 : r < 0.78 ? 1 : r < 0.95 ? 2 : 3]; col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: px }, uSize: { value: size }, uMouse: { value: new THREE.Vector3(999, 999, 0) } },
    vertexShader: PARTICLE_VS, fragmentShader: PARTICLE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; return pts;
}

/* ---------- Gerbes ---------- */
function makeBursts(tex) {
  const N = 300, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -999;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; let head = 0;
  return {
    object: pts,
    spawn(x, y, z, color, n = 50, speed = 3) {
      const c = new THREE.Color(color);
      for (let k = 0; k < n; k++) {
        const i = head++ % N, th = Math.random() * 6.283, ph = Math.acos(rand(-1, 1)), s = speed * rand(0.35, 1);
        pos.set([x, y, z], i * 3);
        vel.set([Math.sin(ph) * Math.cos(th) * s, Math.abs(Math.cos(ph)) * s, Math.sin(ph) * Math.sin(th) * s], i * 3);
        base.set([c.r, c.g, c.b], i * 3); life[i] = 1;
      }
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue; any = true;
        const k = i * 3, d = Math.max(0, 1 - 1.7 * dt);
        pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
        vel[k] *= d; vel[k + 1] = vel[k + 1] * d - 2.2 * dt; vel[k + 2] *= d;
        life[i] -= dt * 0.9; const f = Math.max(0, life[i]);
        col[k] = base[k] * f; col[k + 1] = base[k + 1] * f; col[k + 2] = base[k + 2] * f;
        if (life[i] <= 0) pos[k + 1] = -999;
      }
      if (any) { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; }
    },
  };
}

function ndcToWorld(camera, nx, ny, z = 0) {
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera), dir = v.sub(camera.position).normalize();
  return camera.position.clone().add(dir.multiplyScalar((z - camera.position.z) / dir.z));
}

function makePath(points) {
  const seg = []; let total = 0;
  for (let i = 0; i < points.length - 1; i++) { const d = points[i].distanceTo(points[i + 1]); seg.push(d); total += d; }
  return {
    length: total, points,
    at(u, out = new THREE.Vector3()) {
      let d = clamp(u, 0, 1) * total;
      for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) return out.lerpVectors(points[i], points[i + 1], seg[i] ? clamp(d / seg[i], 0, 1) : 0); d -= seg[i]; }
      return out.copy(points[points.length - 1]);
    },
  };
}

/* ===========================
   Scène 1 : la carte électronique
   =========================== */
function boardScene({ renderer, tex }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05060f, 16, 40);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 8.2, 10.5);

  scene.add(new THREE.AmbientLight(0x8f95d8, 0.75));
  const key = new THREE.DirectionalLight(0xdfe4ff, 1.1); key.position.set(4, 10, 6); scene.add(key);
  const chipLight = new THREE.PointLight(C.cyan, 14, 16, 2); chipLight.position.set(0, 2.6, 0); scene.add(chipLight);

  const particles = makeParticles(MOBILE ? 420 : 1000, 16, 10, 10, renderer.getPixelRatio(), MOBILE ? 1.2 : 1.35);
  particles.position.z = -6; scene.add(particles);

  const root = new THREE.Group(); scene.add(root);
  const board = new THREE.Group(); root.add(board);

  /* carte */
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 9), new THREE.MeshStandardMaterial({ color: 0x0a1030, roughness: 0.78, metalness: 0.2 }));
  pcb.position.y = -0.15; board.add(pcb);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 0.3, 9)), new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.7 }));
  edge.position.y = -0.15; board.add(edge);
  const grid = new THREE.GridHelper(14, 28, C.violet, C.violet); grid.scale.z = 9 / 14; grid.position.y = 0.01;
  grid.material.transparent = true; grid.material.opacity = 0.08; grid.material.depthWrite = false; board.add(grid);
  for (const [x, z] of [[-6.5, -4], [6.5, -4], [-6.5, 4], [6.5, 4]]) {
    const hole = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.26, 24), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.02, z); board.add(hole);
  }

  /* puce centrale */
  const chipGroup = new THREE.Group(); chipGroup.position.y = 0.3; board.add(chipGroup);
  const labelCv = document.createElement('canvas'); labelCv.width = labelCv.height = 256;
  const lg = labelCv.getContext('2d');
  lg.fillStyle = '#0d1230'; lg.fillRect(0, 0, 256, 256);
  lg.strokeStyle = '#22d3ee'; lg.lineWidth = 3; lg.strokeRect(14, 14, 228, 228);
  lg.fillStyle = '#22d3ee'; lg.beginPath(); lg.arc(38, 38, 8, 0, 6.3); lg.fill();
  lg.fillStyle = '#f3f5ff'; lg.font = '900 84px Consolas, monospace'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.fillText('YEB', 128, 112);
  lg.fillStyle = '#a78bfa'; lg.font = '700 20px Consolas, monospace'; lg.fillText('ELEC · INFO IND.', 128, 168);
  lg.fillStyle = '#6d7599'; lg.font = '600 16px Consolas, monospace'; lg.fillText('BIRBA S. Y. E.', 128, 200);
  const labelTex = new THREE.CanvasTexture(labelCv); labelTex.colorSpace = THREE.SRGBColorSpace;
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x10163a, roughness: 0.4, metalness: 0.75, emissive: C.violet, emissiveIntensity: 0.12 });
  const chip = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.4), chipMat); chip.position.y = 0.25; chipGroup.add(chip);
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, emissiveMap: labelTex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.6 });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), labelMat); label.rotation.x = -Math.PI / 2; label.position.y = 0.512; chipGroup.add(label);
  const chipEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4, 0.5, 3.4)), new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.8 }));
  chipEdges.position.y = 0.25; chipGroup.add(chipEdges);
  const chipGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: C.violet, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  chipGlow.scale.set(7, 7, 1); chipGlow.position.y = 0.5; chipGroup.add(chipGlow);

  /* broches et pistes */
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.3, emissive: 0x6a5410, emissiveIntensity: 0.4 });
  const pins = [];
  const PER = 10, HALF = 1.7;
  for (let side = 0; side < 4; side++) {
    const dir = new THREE.Vector3(...[[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0]][side]);
    const perp = new THREE.Vector3(dir.z, 0, dir.x);
    for (let i = 0; i < PER; i++) {
      const off = -1.4 + (2.8 * i) / (PER - 1);
      const base = dir.clone().multiplyScalar(HALF + 0.12).add(perp.clone().multiplyScalar(off));
      const pin = new THREE.Mesh(new THREE.BoxGeometry(dir.x ? 0.36 : 0.16, 0.07, dir.x ? 0.16 : 0.36), pinMat);
      pin.position.set(base.x, 0.1, base.z); chipGroup.add(pin);
      pins.push({ pos: new THREE.Vector3(base.x, 0.02, base.z).add(dir.clone().multiplyScalar(0.2)), dir, perp });
    }
  }
  const traces = [];
  const lineMats = [new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.5 }), new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.6 })];
  const padGeo = new THREE.RingGeometry(0.08, 0.17, 20);
  pins.forEach((p, idx) => {
    if (Math.random() < 0.18) return;
    const pts = [p.pos.clone()];
    let cur = p.pos.clone();
    const go = (v, len) => { cur = cur.clone().add(v.clone().multiplyScalar(len)); pts.push(cur.clone()); };
    go(p.dir, rand(0.5, 1.5));
    const s = Math.random() < 0.5 ? 1 : -1, dd = rand(0.4, 1.3);
    go(p.dir.clone().add(p.perp.clone().multiplyScalar(s)).normalize(), dd * 1.414);
    go(p.dir, rand(0.6, 2.8));
    // ramène le dernier point dans la carte
    const last = pts[pts.length - 1];
    last.x = clamp(last.x, -6.6, 6.6); last.z = clamp(last.z, -4.1, 4.1);
    const path = makePath(pts.map((q) => new THREE.Vector3(q.x, 0.03, q.z)));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.points), lineMats[idx % 2]);
    board.add(line);
    const padMat = new THREE.MeshBasicMaterial({ color: idx % 2 ? C.violet : C.cyan, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const pad = new THREE.Mesh(padGeo, padMat); pad.rotation.x = -Math.PI / 2; pad.position.copy(path.points[path.points.length - 1]); pad.position.y = 0.04; board.add(pad);
    traces.push({ path, pad, padMat, flash: 0 });
  });

  /* composants */
  const resM = new THREE.MeshStandardMaterial({ color: 0xc8a97a, roughness: 0.6 });
  const capM = new THREE.MeshStandardMaterial({ color: 0x122a6b, roughness: 0.4, metalness: 0.3, emissive: 0x0a1a55, emissiveIntensity: 0.4 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xb8c0d8, metalness: 0.85, roughness: 0.3 });
  const icM = new THREE.MeshStandardMaterial({ color: 0x0e1233, roughness: 0.45, metalness: 0.5, emissive: C.violet, emissiveIntensity: 0.1 });
  [[-5.2, -2.7, 0], [-4.4, 2.8, 1], [5.3, 2.4, 0], [4.5, -3, 1], [-2.5, 3.6, 0], [2.9, -3.7, 1]].forEach(([x, z, r]) => {
    const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), resM); b.rotation.z = Math.PI / 2; g.add(b);
    for (const dx of [-0.3, 0.3]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), silver); cap.rotation.z = Math.PI / 2; cap.position.x = dx; g.add(cap); }
    g.position.set(x, 0.13, z); g.rotation.y = r * Math.PI / 2; board.add(g);
  });
  [[-5.7, 0.6], [5.9, -0.7], [-1.6, -3.6], [1.9, 3.5], [-3.4, -3.3]].forEach(([x, z]) => {
    const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.55, 18), capM), t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18), silver);
    t.position.y = 0.29; g.add(b, t); g.position.set(x, 0.28, z); board.add(g);
  });
  [[-4.7, -0.5, 1.0, 0.75], [4.8, 0.7, 1.0, 0.75]].forEach(([x, z, w, d]) => {
    const ic = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), icM); ic.position.set(x, 0.11, z); board.add(ic);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.22, d)), new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.6 })); e.position.copy(ic.position); board.add(e);
  });
  const xt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.32), silver); xt.position.set(2.9, 0.1, 1.9); board.add(xt);

  /* LED cliquables */
  const leds = [];
  [[-6.2, 3.3, C.cyan], [6.2, 3.4, C.amber], [-6.3, -3.5, C.green], [6.2, -3.5, C.pink], [0, 4.1, C.violet], [0, -4.1, C.cyan]].forEach(([x, z, color], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), silver); base.position.y = 0.03;
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1, roughness: 0.25 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), m); bulb.position.y = 0.2; bulb.userData.led = leds.length;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(1.2, 1.2, 1); halo.position.y = 0.25;
    g.add(base, bulb, halo); board.add(g);
    leds.push({ bulb, m, halo, on: true, phase: i * 1.3, boost: 0, color, x, z });
  });

  /* écran web flottant : circuit -> données -> application */
  const scrCv = document.createElement('canvas'); scrCv.width = 320; scrCv.height = 200;
  const sg = scrCv.getContext('2d'); const scrTex = new THREE.CanvasTexture(scrCv); scrTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.125), new THREE.MeshBasicMaterial({ map: scrTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  screen.position.set(4.6, 3.6, -1.4); board.add(screen);
  const scrLabel = textSprite('APPLICATION WEB', '#22D3EE', 30); scrLabel.position.set(4.6, 5.05, -1.4); board.add(scrLabel);
  const boardLabel = textSprite('ÉLECTRONIQUE', '#A78BFA', 30); boardLabel.position.set(0, 0.6, 5.2); board.add(boardLabel);
  let bars = Array.from({ length: 7 }, () => rand(0.3, 0.9)), scrT = 0, scrFlash = 0;
  function drawScreen(dt) {
    scrT += dt; if (scrT < 0.12) return; scrT = 0;
    sg.fillStyle = 'rgba(9,11,26,0.92)'; sg.fillRect(0, 0, 320, 200);
    sg.strokeStyle = scrFlash > 0.05 ? '#ffb547' : '#22d3ee'; sg.lineWidth = 3; sg.strokeRect(2, 2, 316, 196);
    sg.fillStyle = '#ff5c7a'; sg.fillRect(12, 12, 8, 8); sg.fillStyle = '#ffb547'; sg.fillRect(26, 12, 8, 8); sg.fillStyle = '#34d399'; sg.fillRect(40, 12, 8, 8);
    sg.fillStyle = '#a7aecc'; sg.font = '600 15px Consolas, monospace'; sg.fillText('tableau de bord', 62, 21);
    bars = bars.map((b) => clamp(b + rand(-0.06, 0.06) + scrFlash * 0.04, 0.15, 1));
    bars.forEach((b, i) => {
      const h = b * 100, x = 22 + i * 42, grd = sg.createLinearGradient(0, 180 - h, 0, 180);
      grd.addColorStop(0, '#22d3ee'); grd.addColorStop(1, '#7c5cff'); sg.fillStyle = grd; sg.fillRect(x, 180 - h, 28, h);
    });
    sg.strokeStyle = '#ffb547'; sg.lineWidth = 2; sg.beginPath();
    bars.forEach((b, i) => { const x = 36 + i * 42, y = 172 - b * 90 - 14; if (i) sg.lineTo(x, y); else sg.moveTo(x, y); }); sg.stroke();
    scrTex.needsUpdate = true;
  }

  /* impulsions */
  const pulses = Array.from({ length: 22 }, () => {
    const mk = (s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: C.cyan, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sp.visible = false; sp.scale.set(s, s, 1); board.add(sp); return sp; };
    return { active: false, head: mk(0.6), trail: Array.from({ length: 7 }, () => mk(0.4)), t: 0, dur: 1.5, path: null, reverse: false, done: null };
  });
  function spawnPulse(path, color, dur, reverse, done) {
    const p = pulses.find((x) => !x.active); if (!p) return;
    Object.assign(p, { active: true, t: 0, dur, path, reverse, done });
    p.head.material.color.set(color); p.head.visible = true; p.trail.forEach((s) => { s.material.color.set(color); s.visible = true; });
  }
  const tmp = new THREE.Vector3();
  function updatePulses(dt) {
    pulses.forEach((p) => {
      if (!p.active) return;
      p.t += dt / p.dur;
      const at = (u) => p.path.at(p.reverse ? 1 - clamp(u, 0, 1) : clamp(u, 0, 1), tmp).clone();
      const e = easeInOut(clamp(p.t, 0, 1));
      p.head.position.copy(at(e)); p.head.position.y += 0.1;
      p.trail.forEach((s, k) => { s.position.copy(at(e - (k + 1) * 0.035)); s.position.y += 0.1; s.material.opacity = Math.max(0, 0.6 - k * 0.08); s.scale.setScalar(Math.max(0.1, 0.4 - k * 0.04)); });
      if (p.t >= 1) { p.active = false; p.head.visible = false; p.trail.forEach((s) => (s.visible = false)); if (p.done) p.done(); }
    });
  }
  const bursts = makeBursts(tex); board.add(bursts.object);
  const uplink = makePath(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(2.4, 4.6, -0.6), new THREE.Vector3(4.6, 2.5, -1.4)).getPoints(28));

  function sendTrace(i, inward = false) {
    const t = traces[i]; if (!t) return;
    spawnPulse(t.path, inward ? C.amber : (i % 2 ? C.violet : C.cyan), 0.9 + t.path.length * 0.16, inward, () => {
      if (inward) return;
      t.flash = 1; bursts.spawn(t.pad.position.x, 0.15, t.pad.position.z, C.cyan, 6, 1.4);
    });
  }
  function sendUplink() {
    spawnPulse(uplink, C.amber, 1.7, false, () => { scrFlash = 1; bursts.spawn(4.6, 2.5, -1.4, C.amber, 24, 2.4); });
  }

  /* interaction */
  const raycaster = new THREE.Raycaster(), targets = [chip, ...leds.map((l) => l.bulb)];
  let hover = null, lastHover = null, hoverV = 0, overdrive = 0, queue = [], autoT = 0.6, uplinkT = 2.2, spin = 0;
  function pick() {
    if (!pointer.free) return null;
    raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
    const r = raycaster.intersectObjects(targets, false); return r.length ? r[0].object : null;
  }
  function surge() {
    overdrive = 1; scrFlash = 1;
    traces.forEach((_, i) => queue.push({ t: i * 0.035, i }));
    queue.push({ t: 0.3, uplink: true }, { t: 0.8, uplink: true });
    bursts.spawn(0, 0.8, 0, C.cyan, 60, 3.6);
    say('Signal envoyé sur toutes les pistes : puce → données → application web');
  }
  addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest(INTERACTIVE)) return;
    readPointer(e);
    const o = pick(); if (!o) return;
    if (o === chip) surge();
    else if (o.userData.led !== undefined) {
      const l = leds[o.userData.led]; l.on = !l.on; l.boost = 1;
      bursts.spawn(l.x, 0.4, l.z, l.color, 22, 2.2);
      say('LED ' + (l.on ? 'allumée' : 'éteinte'));
    }
  });

  let halfW = 9, aspect = 1.7;
  function layout() {
    const narrow = aspect < 1.05;
    root.scale.setScalar(narrow ? clamp(aspect * 0.9, 0.42, 0.7) : clamp(aspect / 2.6, 0.55, 0.8));
    root.position.x = narrow ? 0 : halfW * 0.36;
    root.position.y = narrow ? 3.0 : 0.2;
  }

  return {
    scene, camera,
    resize(w, h) { aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); halfW = Math.tan(THREE.MathUtils.degToRad(23)) * 10.5 * aspect; layout(); },
    update(t, dt) {
      particles.material.uniforms.uTime.value = t;
      const hit = ndcToWorld(camera, pointer.sx, pointer.sy, -6);
      particles.material.uniforms.uMouse.value.set(hit.x, hit.y, 0);

      const sy = scrollY / innerHeight;
      spin += dt * 0.05;
      board.rotation.y = -0.45 + Math.sin(spin) * 0.18 + pointer.sx * 0.3 + sy * 0.9;
      board.rotation.x = -pointer.sy * 0.1;
      camera.position.y += (8.2 - sy * 1.2 - camera.position.y) * 0.05;
      camera.position.z += (10.5 + clamp(sy, 0, 2) * 1.4 - camera.position.z) * 0.05;
      camera.lookAt(root.position.x * 0.3, 0.6, 0);

      const o = pick(); hover = o;
      document.body.style.cursor = o ? 'pointer' : '';
      hoverV += ((o === chip ? 1 : 0) - hoverV) * 0.15;
      if (o !== lastHover) {
        lastHover = o;
        if (o === chip) say('Cliquez la puce pour envoyer un signal'); else if (o) say('Cliquez la LED pour l’allumer ou l’éteindre');
      }
      overdrive = Math.max(0, overdrive - dt * 0.9); scrFlash = Math.max(0, scrFlash - dt * 1.1);
      chipGroup.position.y = 0.3 + hoverV * 0.25 + overdrive * 0.12;
      chipMat.emissiveIntensity = 0.12 + hoverV * 0.5 + overdrive * 1.2;
      labelMat.emissiveIntensity = 0.4 + hoverV * 0.5 + overdrive * 0.8;
      chipGlow.material.opacity = 0.45 + hoverV * 0.25 + overdrive * 0.4 + Math.sin(t * 2) * 0.05;
      chipLight.intensity = 14 + hoverV * 10 + overdrive * 40;
      lineMats[0].opacity = 0.5 + overdrive * 0.4; lineMats[1].opacity = 0.6 + overdrive * 0.35;

      leds.forEach((l) => {
        l.boost = Math.max(0, l.boost - dt * 1.5);
        const blink = 0.55 + 0.45 * Math.sin(t * 3 + l.phase);
        const v = l.on ? 0.7 + blink * 0.9 + l.boost * 2 : 0.05;
        l.m.emissiveIntensity = v; l.halo.material.opacity = l.on ? 0.25 + blink * 0.4 + l.boost * 0.4 : 0;
      });

      // file d'attente de la surtension
      queue = queue.filter((q) => { q.t -= dt; if (q.t > 0) return true; if (q.uplink) sendUplink(); else sendTrace(q.i, false); return false; });
      autoT -= dt; uplinkT -= dt;
      if (autoT <= 0 && !document.hidden) { autoT = rand(0.35, 0.8); sendTrace(Math.floor(Math.random() * traces.length), Math.random() < 0.3); }
      if (uplinkT <= 0 && !document.hidden) { uplinkT = rand(2.8, 4.6); sendUplink(); }
      updatePulses(dt);
      traces.forEach((tr) => { tr.flash = Math.max(0, tr.flash - dt * 2.2); tr.pad.scale.setScalar(1 + tr.flash * 1.6); tr.padMat.opacity = 0.55 + tr.flash * 0.45; });
      screen.position.y = 3.6 + Math.sin(t * 0.9) * 0.12; scrLabel.position.y = 5.05 + Math.sin(t * 0.9) * 0.12;
      const sc = 0.42 * 1.0; scrLabel.scale.set(sc * scrLabel.userData.aspect * 1.05, sc, 1); boardLabel.scale.set(sc * boardLabel.userData.aspect * 1.05, sc, 1);
      drawScreen(dt);
      bursts.update(dt);
    },
    dim() { return clamp(1 - scrollY / innerHeight * 0.55, 0.3, 1); },
  };
}

/* ===========================
   Scène 2 : sphère des compétences
   =========================== */
function skillsSphere(box, tip) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.setClearColor(0x000000, 0);
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50); camera.position.set(0, 0, 9.6);
  const tex = glowTexture();
  const group = new THREE.Group(); scene.add(group);

  const words = [
    ['Électronique', 1], ['Python', 0], ['Flask', 0], ['Node.js', 0], ['Express', 0], ['Socket.IO', 0], ['JavaScript', 0], ['Three.js', 0], ['HTML5', 0], ['CSS3', 0],
    ['SQLite', 0], ['Informatique industrielle', 1], ['MySQL', 0], ['SQLAlchemy', 0], ['JWT', 0], ['PWA', 0], ['Chart.js', 0], ['Bootstrap', 0], ['Git', 0], ['Automatismes', 1],
    ['GitHub', 0], ['PyInstaller', 0], ['Firebase', 0], ['Tests', 0], ['Sécurité', 0], ['API JSON', 0], ['WebSockets', 0], ['Circuits', 1],
  ];
  const R = 2.55, N = words.length, sprites = [];
  words.forEach(([w, hot], i) => {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
    const s = textSprite(w, hot ? '#FFB547' : '#E4E8FF', 52, hot ? 22 : 10);
    s.position.set(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R);
    s.userData.base = 0.3; s.userData.word = w; s.userData.hot = hot; s.userData.k = 0;
    group.add(s); sprites.push(s);
  });
  const core = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 0.93, 2)), new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.16 }));
  group.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: C.violet, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(9, 9, 1); scene.add(halo);

  let drag = false, lx = 0, ly = 0, vx = 0, vy = 0, rx = 0, ry = 0, hovered = null, visible = true;
  const mouse = new THREE.Vector2(9, 9), raycaster = new THREE.Raycaster();
  const size = () => { const w = box.clientWidth || 500, h = box.clientHeight || 500; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = 9.6 / Math.min(1, w / h); camera.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(box);
  box.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointerup', () => { drag = false; });
  box.addEventListener('pointermove', (e) => {
    const r = box.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (drag) { vy = (e.clientX - lx) * 0.006; vx = (e.clientY - ly) * 0.006; ry += vy; rx += vx; lx = e.clientX; ly = e.clientY; }
  });
  box.addEventListener('pointerleave', () => { mouse.set(9, 9); tip.style.opacity = 0; hovered = null; });
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(box);

  let last = performance.now(), t = 0;
  const v = new THREE.Vector3();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    if (!visible || document.hidden) return;
    t += dt;
    if (!drag) { vx *= 0.94; vy *= 0.94; ry += vy + (REDUCE || hovered ? 0.0006 : 0.0032); rx += vx; }
    rx = clamp(rx, -1.1, 1.1);
    group.rotation.set(rx, ry, 0); core.rotation.y = t * 0.05;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(sprites, false); hovered = hit.length ? hit[0].object : null;
    if (hovered) { tip.textContent = hovered.userData.word; tip.style.opacity = 1; box.style.cursor = 'pointer'; } else { tip.style.opacity = 0; box.style.cursor = ''; }
    sprites.forEach((s) => {
      s.getWorldPosition(v);
      const depth = clamp((v.z + R) / (2 * R), 0, 1), on = s === hovered;
      s.userData.k += ((on ? 1 : 0) - s.userData.k) * 0.18;
      const base = s.userData.base * (0.7 + depth * 0.55) * (1 + s.userData.k * 0.35);
      s.scale.set(base * s.userData.aspect * 1.05, base, 1);
      s.material.opacity = clamp(0.22 + depth * 0.9 + s.userData.k, 0, 1);
      s.material.color.setHex(on ? 0x67e8f9 : 0xffffff);
    });
    renderer.render(scene, camera);
  })(last);
}

/* ===========================
   Repli 2D (sans WebGL)
   =========================== */
function fallback2D(canvas) {
  const g = canvas.getContext('2d');
  const dots = Array.from({ length: MOBILE ? 36 : 70 }, () => ({ x: Math.random(), y: Math.random(), vx: rand(-0.02, 0.02), vy: rand(-0.02, 0.02), c: Math.random() < 0.5 ? '124,92,255' : '34,211,238' }));
  const size = () => { canvas.width = innerWidth; canvas.height = innerHeight; }; size(); addEventListener('resize', size);
  let last = performance.now();
  (function loop(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    g.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((d) => { d.x = (d.x + d.vx * dt * 6 + 1) % 1; d.y = (d.y + d.vy * dt * 6 + 1) % 1; g.fillStyle = 'rgba(' + d.c + ',0.8)'; g.beginPath(); g.arc(d.x * canvas.width, d.y * canvas.height, 2, 0, 6.3); g.fill(); });
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
      const dx = (dots[i].x - dots[j].x) * canvas.width, dy = (dots[i].y - dots[j].y) * canvas.height, d2 = dx * dx + dy * dy;
      if (d2 < 22000) { g.strokeStyle = 'rgba(124,92,255,' + 0.25 * (1 - d2 / 22000) + ')'; g.beginPath(); g.moveTo(dots[i].x * canvas.width, dots[i].y * canvas.height); g.lineTo(dots[j].x * canvas.width, dots[j].y * canvas.height); g.stroke(); }
    }
    if (!document.hidden && !REDUCE) requestAnimationFrame(loop);
  })(last);
  canvas.classList.add('ready');
}

/* ===========================
   Démarrage
   =========================== */
function start() {
  const box = document.getElementById('sphereBox'), tip = document.getElementById('sphereTip');
  if (box && tip) skillsSphere(box, tip);

  const canvas = document.createElement('canvas'); canvas.id = 'scene'; canvas.setAttribute('aria-hidden', 'true'); document.body.appendChild(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, alpha: true, powerPreference: 'high-performance' }); } catch (e) { fallback2D(canvas); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.25 : 1.6)); renderer.setClearColor(0x000000, 0);
  const tex = glowTexture(), world = boardScene({ renderer, tex });
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); world.resize(innerWidth, innerHeight); };
  resize(); addEventListener('resize', resize);

  let last = performance.now(), t = 0, frames = 0, fade = 0, slow = 0, degraded = false, t0 = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    if (!t0) t0 = now;
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    if (!REDUCE) t += dt;
    pointer.sx += (pointer.x - pointer.sx) * 0.08; pointer.sy += (pointer.y - pointer.sy) * 0.08;
    world.update(t, REDUCE ? 0 : dt);
    renderer.render(world.scene, world.camera);
    if (frames > 1) { fade = Math.min(1, (now - t0) / 1200); canvas.style.opacity = (fade * world.dim()).toFixed(3); canvas.classList.add('ready'); }
    frames++;
    if (!degraded && frames > 90 && frames <= 240) { if (dt > 0.034) slow++; if (frames === 240 && slow > 120) { degraded = true; renderer.setPixelRatio(1); resize(); } }
  })(last);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
