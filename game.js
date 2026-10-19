'use strict';
/* =====================================================================
   PLATAFORMA 8-BIT COMPLETA – HTML + CSS + JavaScript puro (Canvas)
   Resolução lógica 256x192, tiles de 16px, tudo desenhado por código.
   Fases: 1-1 overworld (cena do print) · 1-2 subterrâneo · 1-3 plataformas
   noturnas · 1-4 castelo com chefe.
   Inimigos: Goomba, Koopa (casco), planta carnívora, chefe com fogo.
   Itens: cogumelo, flor de fogo, 1-UP, moedas. Bandeira, vidas, game over.
   ===================================================================== */

const W = 256, H = 192, T = 16, ROWS = 12, GR = 10;
const cv = document.getElementById('game');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* ---------------------------- SPRITES ------------------------------ */
function sprite(rows, pal, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch && ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}
function cvs(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  fn((col, x, y, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }, g);
  return c;
}

const MPAL = {
  n: { R: '#D82800', B: '#885000', S: '#FCA044', Y: '#F8B800' },
  f: { R: '#FCFCFC', B: '#D82800', S: '#FCA044', Y: '#F8B800' },
};
const MARIO_TOP = [
  '...RRRRR....', '..RRRRRRRRR.', '..BBBSSBS...', '.BSBSSSBSSS.', '.BSBBSSSBSSS',
  '.BBSSSSBBBB.', '...SSSSSSS..', '..RRBRRR....', '.RRRBRRBRRR.', 'RRRRBBBBRRRR',
  'SSRBYBBYBRSS', 'SSSBBBBBBSSS', 'SSBBBBBBBBSS',
];
const MARIO_LEGS = {
  stand: ['..BBB..BBB..', '.BBBB..BBBB.', 'BBBBB..BBBBB'],
  walk:  ['...BBBBBB...', '..BBBBBBBB..', '..BBB..BBBB.'],
  jump:  ['BBB.....BBB.', '.BBB...BBBB.', '..BB...BBBB.'],
};
const marioCache = {};
function marioImg(power, pose) {
  const key = power + pose;
  if (marioCache[key]) return marioCache[key];
  const small = sprite([...MARIO_TOP, ...MARIO_LEGS[pose]], power === 2 ? MPAL.f : MPAL.n, 12, 16);
  let img = small;
  if (power > 0) {
    img = document.createElement('canvas'); img.width = 16; img.height = 32;
    const g = img.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(small, 0, 0, 12, 16, 0, 0, 16, 32);
  }
  return (marioCache[key] = img);
}

const goombaSpr = sprite([
  '......KKKK......', '....KKBBBBKK....', '...KBBBBBBBBK...', '..KBBBBBBBBBBK..',
  '.KBBBBBBBBBBBBK.', 'KBBKKBBBBBBKKBBK', 'KBBWWKKBBKKWWBBK', 'KBBWWWKBBKWWWBBK',
  'KBBWKWKBBKWKWBBK', 'KBBBBBBBBBBBBBBK', '.KBBBBBBBBBBBBK.', '..KKBSSSSSSBKK..',
  '...KSSSSSSSSK...', '...KSSSSSSSSK...', '.KKKKSSSSSSKKKK.', 'KKKKKK....KKKKKK',
], { B: '#A84000', S: '#FCD8A8', K: '#000000', W: '#FFFFFF' }, 16, 16);

const koopaSpr = [0, 1].map(f => cvs(16, 24, r => {
  r('#000', 1, 0, 8, 10); r('#F8D878', 2, 1, 6, 8); r('#FFF', 3, 2, 3, 3); r('#000', 3, 3, 2, 2);
  r('#000', 5, 8, 11, 13); r('#00A800', 6, 9, 9, 11); r('#005800', 6, 9, 9, 1);
  r('#F8D878', 8, 11, 5, 6); r('#00A800', 9, 12, 3, 4);
  r('#000', f ? 2 : 4, 20, 5, 4); r('#F8D878', f ? 3 : 5, 20, 3, 3);
  r('#000', f ? 9 : 11, 20, 5, 4); r('#F8D878', f ? 10 : 12, 20, 3, 3);
}));
const shellSpr = cvs(16, 16, r => {
  r('#000', 0, 3, 16, 13); r('#00A800', 1, 4, 14, 11); r('#F8D878', 4, 6, 8, 7);
  r('#00A800', 6, 8, 4, 3); r('#F8D878', 1, 13, 14, 2);
});
const piranhaSpr = [0, 1].map(f => cvs(16, 24, r => {
  r('#000', 0, 0, 16, 12); r('#D82800', 1, 1, 14, 10); r('#FFF', 3, 2, 3, 3); r('#FFF', 10, 2, 3, 3);
  r('#000', 1, f ? 5 : 6, 14, f ? 4 : 2); r('#FFF', 3, f ? 5 : 6, 2, 1); r('#FFF', 11, f ? 5 : 6, 2, 1);
  r('#000', 5, 12, 6, 12); r('#00A800', 6, 12, 4, 12);
}));
const mushSpr = cap => cvs(16, 16, r => {
  r('#000', 2, 0, 12, 10); r('#000', 0, 3, 16, 7); r(cap, 3, 1, 10, 8); r(cap, 1, 4, 14, 5);
  r('#FFF', 4, 2, 3, 3); r('#FFF', 9, 2, 3, 3); r('#FFF', 1, 6, 3, 3);
  r('#000', 3, 9, 10, 7); r('#FCD8A8', 4, 10, 8, 5); r('#000', 6, 11, 1, 3); r('#000', 9, 11, 1, 3);
});
const mushRed = mushSpr('#D82800'), mushGreen = mushSpr('#00A800');
const bowserSpr = cvs(32, 32, r => {
  r('#000', 12, 6, 20, 20); r('#00A800', 13, 7, 18, 18);
  r('#FFF', 14, 3, 3, 4); r('#FFF', 20, 3, 3, 4); r('#FFF', 26, 3, 3, 4);
  r('#000', 0, 2, 16, 14); r('#F8B800', 1, 3, 14, 12); r('#D82800', 5, 0, 9, 4);
  r('#FFF', 2, 11, 3, 3); r('#000', 5, 5, 3, 3); r('#FFF', 5, 5, 2, 2);
  r('#000', 4, 14, 12, 10); r('#F8B800', 5, 15, 10, 8);
  r('#F8B800', 6, 24, 7, 8); r('#F8B800', 19, 24, 7, 8); r('#000', 6, 30, 7, 2); r('#000', 19, 30, 7, 2);
  r('#00A800', 28, 18, 4, 5);
});
const fireSpr = cvs(14, 6, r => { r('#D82800', 0, 1, 14, 4); r('#FCA044', 2, 1, 11, 4); r('#FCFCFC', 6, 2, 6, 2); });
const fireballSpr = cvs(8, 8, r => { r('#D82800', 2, 0, 4, 8); r('#D82800', 0, 2, 8, 4); r('#FCA044', 2, 2, 4, 4); r('#FFF', 3, 3, 2, 2); });
const axeSpr = cvs(16, 16, r => {
  r('#000', 3, 0, 11, 10); r('#BCBCBC', 4, 1, 9, 8); r('#FFF', 5, 2, 3, 4); r('#000', 6, 9, 5, 7); r('#885000', 7, 9, 3, 7);
});

const QMARK = ['..KKKK..', '.KK..KK.', '.KK..KK.', '....KK..', '...KK...', '...KK...', '........', '...KK...'];

function blob(w, h, shapes, fill, edge, openBottom) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const inside = (x, y) => {
    if (openBottom && y >= h) return x >= 0 && x < w;
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return shapes.some(s => s.r !== undefined
      ? (x + .5 - s.x) ** 2 + (y + .5 - s.y) ** 2 <= s.r * s.r
      : s.rx !== undefined ? (x + .5 - s.x) ** 2 / (s.rx * s.rx) + (y + .5 - s.y) ** 2 / (s.ry * s.ry) <= 1
        : (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h));
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    const b = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    g.fillStyle = b ? edge : fill; g.fillRect(x, y, 1, 1);
  }
  return c;
}
const cloudS = blob(32, 24, [{ x: 9, y: 15, r: 7 }, { x: 17, y: 11, r: 9 }, { x: 24, y: 15, r: 7 }, { x: 9, y: 15, w: 15, h: 7 }], '#FFFFFF', '#3CBCFC');
const cloudL = blob(64, 24, [{ x: 10, y: 15, r: 7 }, { x: 20, y: 11, r: 9 }, { x: 32, y: 11, r: 9 }, { x: 44, y: 11, r: 9 }, { x: 54, y: 15, r: 7 }, { x: 10, y: 15, w: 44, h: 7 }], '#FFFFFF', '#3CBCFC');
const bush = blob(32, 16, [{ x: 8, y: 12, r: 8 }, { x: 16, y: 9, r: 9 }, { x: 24, y: 12, r: 8 }], '#00A800', '#005800', true);
const hill = (() => {
  const c = blob(80, 33, [{ x: 40, y: 33, rx: 40, ry: 33 }], '#00A800', '#000000', true);
  const g = c.getContext('2d'); g.fillStyle = '#005800';
  g.fillRect(32, 14, 2, 5); g.fillRect(41, 14, 2, 5); g.fillRect(20, 22, 2, 4); g.fillRect(55, 22, 2, 4);
  return c;
})();

/* ------------------------------ TEMAS ------------------------------ */
const TH = {
  over:   { bg: '#5C94FC', base: '#C84C0C', hi: '#FCA044', hb: '#C86830', hh: '#FCB080', hs: '#7C2800', sky: true },
  night:  { bg: '#000000', base: '#C84C0C', hi: '#FCA044', hb: '#C86830', hh: '#FCB080', hs: '#7C2800', sky: true },
  under:  { bg: '#000000', base: '#0058F8', hi: '#6888FC', hb: '#3858F8', hh: '#A4B8FC', hs: '#0010A0' },
  castle: { bg: '#000000', base: '#808080', hi: '#BCBCBC', hb: '#909090', hh: '#D8D8D8', hs: '#484848' },
};

/* ------------------------------ ESTADO ----------------------------- */
let map, COLS, enemies, items, fireballs, bumps, fx, debris, pops, scene;
let mario, cam, score, coins, lives, time, tick = 0, state, stT, ph, lvl;
let flag, flagY, castleX, theme, bowser, bridgeCol, paused = false;
const NS = new Set([0, 12, 14, 20]);   // tiles não sólidos
const solid = (c, r) => {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  return !NS.has(map[r][c]);
};
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* --------------------------- CONSTRUTORES -------------------------- */
const set = (c, r, t) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) map[r][c] = t; };
const span = (r, a, b, t) => { for (let c = a; c <= b; c++) set(c, r, t); };
const ground = (a, b) => { span(10, a, b, 1); span(11, a, b, 1); };
const lava = (a, b) => { span(10, a, b, 12); span(11, a, b, 12); };
const pipe = (c, h) => {
  for (let i = 0; i < h; i++) { const r = GR - h + i; set(c, r, i ? 8 : 6); set(c + 1, r, i ? 9 : 7); }
};
const stairs = (c, n) => { for (let i = 0; i < n; i++) for (let k = 0; k <= i; k++) set(c + i, 9 - k, 10); };
const sc = (img, x, y) => scene.push([img, x, y]);

function E(type, x, row) {
  const e = { type, x, vx: 0, vy: 0, dir: -1, active: false, flip: false, dead: false, t: 0, ground: false, hitWall: false, state: 'walk', kickT: 0 };
  if (type === 'g') { e.w = 14; e.h = 14; e.y = (row + 1) * T - 14; }
  else if (type === 'k') { e.w = 14; e.h = 22; e.y = (row + 1) * T - 22; }
  else if (type === 'f') { e.w = 14; e.h = 24; e.x = x * T + 9; e.y0 = row * T; e.y = e.y0; e.t = (x * 37) % 100; }
  else if (type === 'b') { e.w = 28; e.h = 28; e.y = (row + 1) * T - 28; e.hp = 5; e.minX = x - 120; e.maxX = x + 24; e.face = -1; }
  enemies.push(e); return e;
}

const LEVELS = [
  { name: '1-1', th: 'over', cols: 92, build() {
    ground(0, 44); ground(47, 57); ground(60, 91);
    pipe(3, 2); pipe(26, 2); pipe(34, 3); pipe(52, 2);
    set(8, 6, 2); set(9, 6, 3); set(10, 6, 2);                       // como no print
    set(20, 6, 5); set(21, 6, 2); set(22, 6, 3); set(23, 6, 2); set(24, 6, 3); set(22, 2, 15);
    set(40, 6, 2); set(41, 6, 2); set(42, 6, 5); set(43, 6, 2);
    span(6, 55, 57, 2); span(4, 29, 32, 20);
    stairs(66, 6); flag = 76; set(76, 9, 10); castleX = (flag + 4) * T;
    [200, 226, 330, 380, 470, 600, 640, 800, 880, 1000, 1030].forEach(x => E('g', x, 9));
    [520, 780].forEach(x => E('k', x, 9));
    [[53, 17, 's'], [189, 31, 'l'], [330, 18, 's'], [440, 34, 'l'], [590, 16, 's'], [700, 30, 'l'], [860, 18, 's'],
     [960, 32, 'l'], [1120, 17, 's'], [1200, 31, 'l']].forEach(([x, y, k]) => sc(k === 's' ? cloudS : cloudL, x, y));
    [-20, 330, 600, 1000].forEach(x => sc(hill, x, GR * T - 33));
    [120, 270, 440, 625, 800, 1010].forEach(x => sc(bush, x, GR * T - 16));
  } },
  { name: '1-2', th: 'under', cols: 114, build() {
    span(0, 0, 113, 2); span(1, 0, 113, 2);
    ground(0, 29); ground(33, 59); ground(64, 113);
    pipe(14, 2); E('f', 14, 8); pipe(24, 3); E('f', 24, 7); pipe(44, 2); E('f', 44, 8);
    span(7, 8, 13, 2); set(10, 7, 5); span(4, 8, 13, 20);
    span(7, 36, 40, 2); set(38, 7, 3); span(4, 36, 40, 20);
    set(48, 6, 3); set(49, 6, 2); set(50, 6, 15 - 10); span(5, 51, 57, 2);
    span(8, 70, 76, 2); span(5, 70, 76, 20); set(73, 8, 5 + 0);
    stairs(96, 4); flag = 104; set(104, 9, 10); castleX = (flag + 4) * T;
    [200, 230, 420, 560, 600, 760, 880, 1100, 1130, 1380, 1400].forEach(x => E('g', x, 9));
    [350, 660, 1250].forEach(x => E('k', x, 9));
  } },
  { name: '1-3', th: 'night', cols: 124, build() {
    ground(0, 8);
    const P = (c, r, n) => span(r, c, c + n - 1, 11);
    P(12, 9, 4); P(19, 8, 5); P(27, 7, 3); P(33, 9, 6); P(43, 8, 3); P(49, 7, 4);
    P(56, 9, 5); P(64, 8, 3); P(70, 6, 4); P(77, 8, 6); P(86, 9, 5);
    ground(93, 123);
    span(6, 13, 15, 20); span(5, 20, 23, 20); span(4, 28, 29, 20); span(5, 71, 73, 20);
    set(35, 5, 5); set(79, 4, 3);
    stairs(100, 4); flag = 108; set(108, 9, 10); castleX = (flag + 4) * T;
    E('k', 33 * 16 + 40, 8); E('g', 19 * 16 + 40, 7); E('k', 77 * 16 + 30, 7); E('g', 86 * 16 + 30, 8);
    E('g', 56 * 16 + 20, 8); E('k', 49 * 16 + 16, 6); E('g', 1520, 9); E('g', 1560, 9);
    [[40, 20, 's'], [180, 40, 'l'], [330, 25, 's'], [520, 35, 'l'], [800, 20, 's'], [1100, 38, 'l'], [1400, 22, 's']]
      .forEach(([x, y, k]) => sc(k === 's' ? cloudS : cloudL, x, y));
  } },
  { name: '1-4', th: 'castle', cols: 90, build() {
    span(0, 0, 89, 2); span(1, 0, 89, 2);
    ground(0, 14); lava(15, 17); ground(18, 24); lava(25, 28); ground(29, 40);
    span(10, 41, 58, 13); span(11, 41, 58, 12);
    ground(59, 89); set(60, 9, 14);
    set(10, 6, 5); span(6, 8, 9, 2); set(34, 6, 5); set(33, 6, 2); set(35, 6, 2);
    span(8, 20, 22, 10);
    E('g', 150, 9); E('k', 330, 9); E('g', 520, 9); E('g', 580, 9);
    bowser = E('b', 54 * 16, 9); bridgeCol = 58;
  } },
];

function buildLevel(i) {
  const L = LEVELS[i];
  COLS = L.cols; theme = TH[L.th];
  map = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  enemies = []; items = []; fireballs = []; bumps = []; fx = []; debris = []; pops = []; scene = [];
  flag = -1; bowser = null; bridgeCol = -1; castleX = -999;
  L.build();
}

function sizeFor(m) { m.w = m.power ? 12 : 10; m.h = m.power ? 32 : 16; }
function newMario() {
  return { x: 40, y: 144, w: 10, h: 16, vx: 0, vy: 0, ground: true, dir: 1, power: 0, inv: 0,
    jumpHeld: false, runHeld: false, chain: 0, hitWall: false };
}
function loadLevel(i, first) {
  lvl = i; buildLevel(i);
  const m = mario; sizeFor(m);
  m.vx = m.vy = 0; m.dir = 1; m.chain = 0; m.inv = 0;
  m.x = first ? 56 : 40; m.y = (first ? 128 : 160) - m.h; m.ground = true;
  cam = 0; time = first ? 367 : 400; tick = 0; state = 'play'; flagY = 52;
}
function startInter() { state = 'inter'; stT = 0; }
function newGame(first) {
  score = first ? 5400 : 0; coins = first ? 22 : 0; lives = 3; mario = newMario();
  loadLevel(0, first);
  if (!first) startInter();
}
function nextLevel() {
  if (lvl + 1 >= LEVELS.length) { state = 'end'; stT = 0; } else { lvl++; startInter(); }
}

/* ----------------------------- ENTRADA ----------------------------- */
const keys = { left: false, right: false, jump: false, run: false };
const keyMap = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run',
};
addEventListener('keydown', e => {
  if (e.code === 'KeyR') { newGame(true); return; }
  if (e.code === 'KeyP') { paused = !paused; return; }
  const k = keyMap[e.code];
  if (k) { keys[k] = true; e.preventDefault(); }
});
addEventListener('keyup', e => { const k = keyMap[e.code]; if (k) { keys[k] = false; e.preventDefault(); } });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ------------------------------- SOM ------------------------------- */
let ac;
function beep(f, d, slide = 0, type = 'square', v = 0.04) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(t + d);
  } catch (e) { /* sem áudio */ }
}

/* ----------------------------- FÍSICA ------------------------------ */
function moveX(e) {
  e.x += e.vx; e.hitWall = false;
  const top = Math.floor(e.y / T), bot = Math.floor((e.y + e.h - 0.01) / T);
  if (e.vx > 0) {
    const c = Math.floor((e.x + e.w) / T);
    for (let r = top; r <= bot; r++) if (solid(c, r)) { e.x = c * T - e.w; e.vx = 0; e.hitWall = true; break; }
  } else if (e.vx < 0) {
    const c = Math.floor(e.x / T);
    for (let r = top; r <= bot; r++) if (solid(c, r)) { e.x = (c + 1) * T; e.vx = 0; e.hitWall = true; break; }
  }
}
function moveY(e) {
  e.y += e.vy; e.ground = false;
  const l = Math.floor(e.x / T), r = Math.floor((e.x + e.w - 0.01) / T);
  if (e.vy > 0) {
    const row = Math.floor((e.y + e.h) / T);
    for (let c = l; c <= r; c++) if (solid(c, row)) { e.y = row * T - e.h; e.vy = 0; e.ground = true; break; }
  } else if (e.vy < 0) {
    const row = Math.floor(e.y / T);
    let best = -1, bd = 1e9;
    for (let c = l; c <= r; c++) if (solid(c, row)) {
      const d = Math.abs(c * T + T / 2 - (e.x + e.w / 2));
      if (d < bd) { bd = d; best = c; }
    }
    if (best >= 0) { e.y = (row + 1) * T; e.vy = 0; if (e === mario) bump(best, row); }
  }
}

const pop = (x, y, txt) => pops.push({ x, y, txt: String(txt), t: 0 });
function award(x, y) {
  const P = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
  const v = P[Math.min(mario.chain, P.length - 1)]; mario.chain++;
  score += v; pop(x, y, v);
}
function addCoin() {
  coins++; score += 200;
  if (coins >= 100) { coins = 0; lives++; beep(1568, 0.3); }
}

function bump(c, r) {
  const t = map[r][c], m = mario;
  if (t === 2) {
    if (m.power > 0) {
      map[r][c] = 0; score += 50;
      [[-1.5, -5], [1.5, -5], [-1, -3], [1, -3]].forEach(([vx, vy], i) =>
        debris.push({ x: c * T + (i % 2) * 8, y: r * T + (i > 1 ? 8 : 0), vx, vy }));
      beep(110, 0.15, -60, 'sawtooth', 0.05);
    } else { bumps.push({ c, r, t: 0 }); beep(130, 0.08, -40, 'triangle', 0.08); }
  } else if (t === 3) {
    map[r][c] = 4; bumps.push({ c, r, t: 0 }); addCoin();
    fx.push({ x: c * T + 4, y: r * T - 8, vy: -5, t: 0 });
    beep(988, 0.08); setTimeout(() => beep(1319, 0.25), 70);
  } else if (t === 5 || t === 15) {
    map[r][c] = 4; bumps.push({ c, r, t: 0 });
    const type = t === 15 ? 'oneup' : (m.power === 0 ? 'mush' : 'flower');
    items.push({ type, x: c * T + 1, y: r * T + 2, w: 14, h: 14, vx: 0, vy: 0, dir: 1, rise: 16, dead: false });
    beep(220, 0.2, 300, 'triangle', 0.08);
  } else return;
  for (const e of enemies) {
    if (!e.dead && !e.flip && e.type !== 'f' && e.type !== 'b' && e.x + e.w > c * T && e.x < c * T + T && Math.abs(e.y + e.h - r * T) < 3) {
      e.flip = true; e.vy = -3; e.vx = 0.4; score += 100; pop(e.x, e.y, 100);
    }
  }
}

function grow(p) {
  const m = mario;
  if (m.power === 0) { m.power = p; m.y -= 16; sizeFor(m); } else m.power = p;
  beep(392, 0.3, 500);
}
function hurt() {
  const m = mario;
  if (m.inv > 0 || state !== 'play') return;
  if (m.power > 0) { m.power = 0; m.y += 16; sizeFor(m); m.inv = 100; beep(300, 0.3, -200); }
  else die();
}
function die() {
  if (state !== 'play') return;
  const m = mario;
  if (m.power > 0) { m.power = 0; m.y += 16; sizeFor(m); }
  state = 'dead'; stT = 0; m.vy = -5; m.vx = 0; m.inv = 0;
  beep(494, 0.15); setTimeout(() => beep(330, 0.4, -200), 150);
}

const camUpd = () => { cam = Math.max(cam, Math.min(mario.x - 100, COLS * T - W)); };

/* ---------------------------- ATUALIZAÇÃO -------------------------- */
function updMario() {
  const m = mario;
  if (m.inv > 0) m.inv--;
  const maxV = keys.run ? 2.3 : 1.45, acc = keys.run ? 0.1 : 0.07;
  if (keys.right && !keys.left) { m.vx += m.ground ? acc : acc * 0.8; m.dir = 1; }
  else if (keys.left && !keys.right) { m.vx -= m.ground ? acc : acc * 0.8; m.dir = -1; }
  else if (m.ground) { if (Math.abs(m.vx) < 0.06) m.vx = 0; else m.vx -= Math.sign(m.vx) * 0.06; }
  m.vx = Math.max(-maxV, Math.min(maxV, m.vx));

  if (keys.jump && m.ground && !m.jumpHeld) { m.vy = -5.2 - Math.abs(m.vx) * 0.35; m.ground = false; beep(300, 0.18, 400); }
  m.jumpHeld = keys.jump;
  m.vy = Math.min(m.vy + ((keys.jump && m.vy < 0) ? 0.22 : 0.5), 7);

  if (keys.run && !m.runHeld && m.power === 2 && fireballs.length < 2) {
    fireballs.push({ x: m.x + (m.dir > 0 ? m.w : -8), y: m.y + 12, w: 8, h: 8, vx: m.dir * 3.2, vy: 1, dead: false });
    beep(700, 0.08, -300);
  }
  m.runHeld = keys.run;

  moveX(m); moveY(m);
  if (m.ground) m.chain = 0;
  camUpd();
  if (m.x < cam) { m.x = cam; m.vx = 0; }
  if (m.y > H + 8) { die(); return; }

  // interação com tiles não sólidos
  const c0 = Math.floor(m.x / T), c1 = Math.floor((m.x + m.w - .01) / T);
  const r0 = Math.floor(m.y / T), r1 = Math.floor((m.y + m.h - .01) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = map[r] && map[r][c];
    if (t === 20) { map[r][c] = 0; addCoin(); beep(1319, 0.1); }
    else if (t === 12 && m.y + m.h > r * T + 6) { m.inv = 0; die(); return; }
    else if (t === 14 && state === 'play') {
      map[r][c] = 0; state = 'axe'; stT = 0; m.vx = 0;
      if (bowser && !bowser.flip) { bowser.flip = true; bowser.vy = -2; bowser.vx = 0; }
      beep(523, 0.5); return;
    }
  }
  if (flag >= 0 && m.x + m.w >= flag * T - 1 && m.x <= flag * T + 16) { startGoal(); return; }
  if (time <= 0) { die(); return; }
  marioVsEnemies();
}

function startGoal() {
  const m = mario;
  state = 'goal'; ph = 0; stT = 0; m.vx = 0; m.x = flag * T + 7 - m.w;
  const v = 100 * (1 + Math.round(Math.max(0, 160 - (m.y + m.h)) / 112 * 49));
  score += v; pop(m.x, m.y, v); beep(784, 0.4, 600);
}

function stomp(e) { return mario.vy > 0 && (mario.y + mario.h - mario.vy) <= e.y + 8; }
function kick(e, bounce) {
  const m = mario;
  e.state = 'slide'; e.dir = (m.x + m.w / 2 < e.x + e.w / 2) ? 1 : -1; e.kickT = 12;
  score += 400; pop(e.x, e.y, 400); beep(200, 0.1, -50);
  if (bounce) m.vy = -3.5;
}
function marioVsEnemies() {
  const m = mario;
  for (const e of enemies) {
    if (e.dead || e.flip || !e.active || !ov(m, e)) continue;
    if (e.type === 'f' || e.type === 'b' || e.type === 'fire') { hurt(); continue; }
    if (e.type === 'k' && e.state === 'shell') { kick(e, stomp(e)); continue; }
    if (e.type === 'k' && e.state === 'slide') {
      if (e.kickT > 0) continue;
      if (stomp(e)) { e.state = 'shell'; e.vx = 0; m.vy = -3.5; beep(200, 0.1, -80); } else hurt();
      continue;
    }
    if (stomp(e)) {
      award(e.x, e.y); m.vy = -3.5; beep(200, 0.12, -80, 'square', 0.06);
      if (e.type === 'g') { e.dead = true; e.t = 0; }
      else { e.state = 'shell'; e.y += 8; e.h = 14; e.vx = 0; }
    } else hurt();
  }
}

function walker(e, speed) {
  e.vx = e.dir * speed; e.vy = Math.min(e.vy + 0.4, 5);
  moveX(e); if (e.hitWall) e.dir *= -1;
  moveY(e);
  if (e.y > H + 40) { e.dead = true; e.t = 99; }
}

function updEnemies() {
  const m = mario;
  for (const e of enemies) {
    if (e.dead) { e.t++; continue; }
    if (e.flip) { e.vy += 0.4; e.y += e.vy; e.x += e.vx; continue; }
    if (!e.active) { if (e.x < cam + W + 24) e.active = true; else continue; }
    if (e.kickT > 0) e.kickT--;
    switch (e.type) {
      case 'g': walker(e, 0.4); break;
      case 'k':
        if (e.state === 'walk') walker(e, 0.4);
        else if (e.state === 'slide') {
          walker(e, 3.2);
          for (const o of enemies) {
            if (o === e || o.dead || o.flip || !o.active || o.type === 'f' || o.type === 'fire' || o.type === 'b') continue;
            if (ov(e, o)) { o.flip = true; o.vy = -3; o.vx = e.dir * 0.6; score += 500; pop(o.x, o.y, 500); beep(150, 0.1); }
          }
        } else { e.vx = 0; e.vy = Math.min(e.vy + 0.4, 5); moveY(e); if (e.y > H + 40) { e.dead = true; e.t = 99; } }
        break;
      case 'f': {
        const near = Math.abs((m.x + m.w / 2) - (e.x + e.w / 2)) < 30;
        e.t = (e.t + 1) % 200;
        if (e.t >= 100 && near && e.t < 110) e.t = 100;   // fica escondida se o Mario está perto
        const p = e.t;
        const off = p < 20 ? p / 20 * 24 : p < 80 ? 24 : p < 100 ? (100 - p) / 20 * 24 : 0;
        e.y = e.y0 - off;
        break;
      }
      case 'b':
        e.t++;
        e.face = m.x < e.x ? -1 : 1;
        if (e.x < e.minX) e.dir = 1; else if (e.x > e.maxX) e.dir = -1;
        e.vx = e.dir * 0.3;
        if (e.t % 150 === 0 && e.ground) e.vy = -4.5;
        if (e.t % 170 === 100) {
          enemies.push({ type: 'fire', x: e.x + (e.face < 0 ? -14 : e.w), y: e.y + 8, w: 14, h: 6, vx: e.face * 1.6, vy: 0,
            active: true, flip: false, dead: false, t: 0, dir: e.face, state: 'walk', kickT: 0 });
          beep(120, 0.3, -60, 'sawtooth', 0.05);
        }
        e.vy = Math.min(e.vy + 0.3, 5); moveX(e); moveY(e);
        break;
      case 'fire':
        e.x += e.vx; e.t++;
        if (e.x < cam - 40 || e.x > cam + W + 40 || e.t > 400) { e.dead = true; e.t = 99; }
        break;
    }
  }
  enemies = enemies.filter(e => !(e.dead && e.t > 30) && !(e.flip && e.y > H + 60));
}

function updItems() {
  const m = mario;
  for (const it of items) {
    if (it.rise > 0) { it.y -= 1; it.rise--; continue; }
    if (it.type !== 'flower') {
      it.vx = it.dir * 0.8; it.vy = Math.min(it.vy + 0.4, 4);
      moveX(it); if (it.hitWall) it.dir *= -1;
      moveY(it);
    }
    if (it.y > H + 20) { it.dead = true; continue; }
    if (ov(it, m)) {
      it.dead = true;
      if (it.type === 'oneup') { lives++; pop(it.x, it.y, '1UP'); beep(1047, 0.1); setTimeout(() => beep(1568, 0.25), 100); }
      else {
        if (it.type === 'mush') { if (m.power === 0) grow(1); } else grow(2);
        score += 1000; pop(it.x, it.y, 1000);
      }
    }
  }
  items = items.filter(i => !i.dead);
}

function updFire() {
  for (const f of fireballs) {
    f.vy = Math.min(f.vy + 0.35, 4);
    f.x += f.vx;
    const c = Math.floor((f.x + (f.vx > 0 ? f.w : 0)) / T), r = Math.floor((f.y + f.h / 2) / T);
    if (solid(c, r)) f.dead = true;
    f.y += f.vy;
    if (f.vy > 0) {
      const row = Math.floor((f.y + f.h) / T), c2 = Math.floor((f.x + f.w / 2) / T);
      if (solid(c2, row)) { f.y = row * T - f.h; f.vy = -3.2; }
    } else if (solid(Math.floor((f.x + f.w / 2) / T), Math.floor(f.y / T))) f.dead = true;
    if (f.y > H || f.x < cam - 16 || f.x > cam + W + 16) f.dead = true;
    for (const e of enemies) {
      if (f.dead || e.dead || e.flip || !e.active || e.type === 'fire' || !ov(f, e)) continue;
      f.dead = true;
      if (e.type === 'b') {
        if (--e.hp <= 0) { e.flip = true; e.vy = -3; score += 5000; pop(e.x, e.y, 5000); }
        beep(150, 0.1);
      } else { e.flip = true; e.vy = -3; e.vx = f.vx > 0 ? 0.5 : -0.5; score += 100; pop(e.x, e.y, 100); beep(150, 0.1); }
    }
  }
  fireballs = fireballs.filter(f => !f.dead);
}

function updFx() {
  bumps.forEach(b => b.t++); bumps = bumps.filter(b => b.t < 8);
  fx.forEach(f => { f.vy += 0.4; f.y += f.vy; f.t++; }); fx = fx.filter(f => f.t < 32);
  debris.forEach(d => { d.vy += 0.4; d.x += d.vx; d.y += d.vy; }); debris = debris.filter(d => d.y < H + 20);
  pops.forEach(p => { p.t++; p.y -= 0.4; }); pops = pops.filter(p => p.t < 45);
}

function goal() {
  const m = mario; stT++;
  if (ph === 0) {
    m.vy = 2; m.vx = 0; moveY(m); flagY = Math.min(flagY + 2, 128);
    if (m.ground) { ph = 1; stT = 0; }
  } else if (ph === 1) {
    flagY = Math.min(flagY + 2, 128);
    if (stT > 25) { m.x = flag * T + 10; m.dir = 1; ph = 2; }
  } else if (ph === 2) {
    m.vx = 1.3; m.vy = Math.min(m.vy + 0.5, 7); moveX(m); moveY(m); camUpd();
    if (m.x >= castleX + 24) { ph = 3; stT = 0; }
  } else if (ph === 3) {
    if (time > 0) { const d = Math.min(time, 2); time -= d; score += 50 * d; if (tick % 3 === 0) beep(1200, 0.02); }
    else { ph = 4; stT = 0; }
  } else if (stT > 50) nextLevel();
  updFx();
}

function axe() {
  const m = mario; stT++;
  if (stT % 3 === 0 && bridgeCol >= 41) { map[10][bridgeCol] = 0; bridgeCol--; }
  for (const e of enemies) if (e.flip) { e.vy += 0.4; e.y += e.vy; }
  m.vx = 0; m.vy = Math.min(m.vy + 0.5, 7); moveY(m);
  updFx();
  if (stT > 180) nextLevel();
}

function update() {
  tick++;
  switch (state) {
    case 'play':
      if (tick % 25 === 0 && time > 0) time--;
      updMario();
      if (state !== 'play') break;
      updEnemies(); updItems(); updFire(); updFx();
      break;
    case 'dead':
      stT++;
      if (stT > 25) { mario.vy = Math.min(mario.vy + 0.3, 6); mario.y += mario.vy; }
      if (stT > 200) { lives--; if (lives <= 0) { state = 'gameover'; stT = 0; } else { mario.power = 0; startInter(); } }
      break;
    case 'goal': goal(); break;
    case 'axe': axe(); break;
    case 'inter': if (++stT > 110) loadLevel(lvl, false); break;
    case 'gameover': if (++stT > 220) newGame(false); break;
    case 'end': stT++; break;
  }
}

/* ------------------------------ DESENHO ---------------------------- */
function blit(img, x, y, fx_, fy_) {
  ctx.save();
  ctx.translate(x + (fx_ ? img.width : 0), y + (fy_ ? img.height : 0));
  ctx.scale(fx_ ? -1 : 1, fy_ ? -1 : 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function drawTile(t, x, y) {
  const g = ctx, th = theme;
  switch (t) {
    case 1:
      g.fillStyle = th.base; g.fillRect(x, y, 16, 16);
      g.fillStyle = th.hi; g.fillRect(x, y, 15, 1); g.fillRect(x, y + 8, 7, 1);
      g.fillStyle = '#000';
      g.fillRect(x, y + 7, 16, 1); g.fillRect(x, y + 15, 16, 1); g.fillRect(x + 15, y, 1, 8); g.fillRect(x + 7, y + 8, 1, 8);
      break;
    case 2:
      g.fillStyle = th.base; g.fillRect(x, y, 16, 16);
      for (let r = 0; r < 4; r++) {
        const yy = y + r * 4;
        g.fillStyle = th.hi; g.fillRect(x, yy, 16, 1);
        g.fillStyle = '#000'; g.fillRect(x, yy + 3, 16, 1);
        (r % 2 === 0 ? [7, 15] : [3, 11]).forEach(j => g.fillRect(x + j, yy, 1, 3));
      }
      break;
    case 3: case 5: case 15: {
      const cols = ['#FCA044', '#FCA044', '#FCA044', '#FCA044', '#E49000', '#A84000', '#E49000'];
      g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
      g.fillStyle = cols[(tick >> 3) % cols.length]; g.fillRect(x + 1, y + 1, 14, 14);
      g.fillStyle = '#7C2800';
      [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([a, b]) => g.fillRect(x + a, y + b, 2, 2));
      QMARK.forEach((row, j) => { for (let i = 0; i < 8; i++) if (row[i] === 'K') g.fillRect(x + 4 + i, y + 4 + j, 1, 1); });
      break;
    }
    case 4:
      g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#A84000'; g.fillRect(x + 1, y + 1, 14, 14);
      g.fillStyle = '#000';
      [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([a, b]) => g.fillRect(x + a, y + b, 2, 2));
      break;
    case 10:
      g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
      g.fillStyle = th.hb; g.fillRect(x + 1, y + 1, 14, 14);
      g.fillStyle = th.hh; g.fillRect(x + 1, y + 1, 14, 2); g.fillRect(x + 1, y + 1, 2, 14);
      g.fillStyle = th.hs; g.fillRect(x + 13, y + 1, 2, 14); g.fillRect(x + 1, y + 13, 14, 2);
      break;
    case 6: case 7: case 8: case 9: {
      const left = (t === 6 || t === 8), cap = (t === 6 || t === 7);
      const x0 = cap ? 0 : (left ? 2 : 0), x1 = cap ? 16 : (left ? 16 : 14);
      g.fillStyle = '#000'; g.fillRect(x + x0, y, x1 - x0, 16);
      g.fillStyle = '#00A800';
      g.fillRect(x + x0 + (left ? 1 : 0), y + (cap ? 1 : 0), x1 - x0 - 1, 16 - (cap ? 2 : 0));
      if (left) { g.fillStyle = '#B8F818'; g.fillRect(x + x0 + 3, y + (cap ? 1 : 0), 3, 16 - (cap ? 2 : 0)); }
      else { g.fillStyle = '#006800'; g.fillRect(x + x1 - 6, y + (cap ? 1 : 0), 4, 16 - (cap ? 2 : 0)); }
      break;
    }
    case 11:
      g.fillStyle = '#005800'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#00A800'; g.fillRect(x, y, 16, 12);
      g.fillStyle = '#B8F818'; g.fillRect(x, y, 16, 2);
      g.fillStyle = '#FFF'; g.fillRect(x + 3, y + 5, 3, 3); g.fillRect(x + 10, y + 6, 3, 3);
      break;
    case 12:
      g.fillStyle = '#D82800'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#FCA044';
      for (let i = 0; i < 4; i++) g.fillRect(x + ((i * 5 + (tick >> 3) * 2) % 14), y + 2 + i * 4 - (i % 2), 4, 2);
      break;
    case 13:
      g.fillStyle = '#000'; g.fillRect(x, y, 16, 8);
      g.fillStyle = '#C86830'; g.fillRect(x, y + 1, 16, 6);
      g.fillStyle = '#7C2800'; g.fillRect(x + 7, y + 1, 2, 6); g.fillRect(x, y + 6, 16, 1);
      break;
    case 14: blit(axeSpr, x, y); break;
    case 20: {
      const w = Math.abs(Math.cos((tick + x) / 10)) * 6 + 1;
      g.fillStyle = '#F8B800'; g.fillRect(Math.round(x + 8 - w / 2), y + 1, Math.round(w), 14);
      g.fillStyle = '#FCE0A8'; g.fillRect(Math.round(x + 8 - w / 2), y + 1, 1, 14);
      break;
    }
  }
}

function drawCastle(x) {
  const g = ctx, y0 = GR * T, b = theme.base;
  g.fillStyle = '#000'; g.fillRect(x, y0 - 48, 64, 48); g.fillRect(x + 15, y0 - 80, 34, 34);
  g.fillStyle = b; g.fillRect(x + 1, y0 - 47, 62, 47); g.fillRect(x + 16, y0 - 79, 32, 32);
  g.fillStyle = '#000';
  [0, 16, 32, 48].forEach(i => g.fillRect(x + i, y0 - 56, 8, 8));
  [16, 28, 40].forEach(i => g.fillRect(x + i, y0 - 88, 8, 8));
  g.fillStyle = b;
  [0, 16, 32, 48].forEach(i => g.fillRect(x + i + 1, y0 - 55, 6, 8));
  [16, 28, 40].forEach(i => g.fillRect(x + i + 1, y0 - 87, 6, 8));
  g.fillStyle = '#000'; g.fillRect(x + 26, y0 - 20, 12, 20); g.fillRect(x + 22, y0 - 70, 6, 10); g.fillRect(x + 36, y0 - 70, 6, 10);
}

function drawEnemy(e) {
  const x = Math.round(e.x), y = Math.round(e.y);
  switch (e.type) {
    case 'g':
      if (e.dead) ctx.drawImage(goombaSpr, 0, 0, 16, 16, x - 1, y - 2 + 8, 16, 8);
      else blit(goombaSpr, x - 1, y - 2, (tick >> 3) & 1, e.flip);
      break;
    case 'k':
      if (e.state === 'walk') blit(koopaSpr[(tick >> 3) & 1], x - 1, y + e.h - 24, e.dir > 0, e.flip);
      else blit(shellSpr, x - 1, y - 2, 0, e.flip);
      break;
    case 'f': blit(piranhaSpr[(tick >> 3) & 1], x - 1, y); break;
    case 'b': blit(bowserSpr, x - 2, y - 4, e.face > 0, e.flip); break;
    case 'fire': blit(fireSpr, x, y, e.vx > 0); break;
  }
}

function text(s, x, y, color = '#FFFFFF') {
  ctx.fillStyle = '#7C2800'; ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
const pad = (n, l) => String(Math.max(0, n)).padStart(l, '0');
function center(s, y) { ctx.textAlign = 'center'; text(s, W / 2, y); ctx.textAlign = 'left'; }

function draw() {
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, W, H);
  const cx = Math.round(cam);
  ctx.save(); ctx.translate(-cx, 0);

  scene.forEach(([img, x, y]) => ctx.drawImage(img, x, y));
  if (flag >= 0) {
    drawCastle(castleX);
    const px = flag * T + 7;
    ctx.fillStyle = '#80D010'; ctx.fillRect(px, 48, 2, 112);
    ctx.fillStyle = '#00A800'; ctx.fillRect(px - 1, 45, 4, 4);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(px, flagY); ctx.lineTo(px - 14, flagY + 6); ctx.lineTo(px, flagY + 12); ctx.fill();
  }

  enemies.forEach(e => { if (e.x > cx - 40 && e.x < cx + W + 40) drawEnemy(e); });
  items.forEach(it => {
    const x = Math.round(it.x), y = Math.round(it.y);
    if (it.type === 'flower') {
      const c = ['#D82800', '#FCA044', '#000000'][(tick >> 2) % 3];
      ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y - 1, 12, 10);
      ctx.fillStyle = c; ctx.fillRect(x + 3, y, 10, 8);
      ctx.fillStyle = '#FFF'; ctx.fillRect(x + 6, y + 2, 4, 4);
      ctx.fillStyle = '#00A800'; ctx.fillRect(x + 7, y + 8, 2, 6); ctx.fillRect(x + 2, y + 10, 5, 3); ctx.fillRect(x + 9, y + 10, 5, 3);
    } else blit(it.type === 'oneup' ? mushGreen : mushRed, x - 1, y - 2);
  });

  const c0 = Math.max(0, Math.floor(cx / T)), c1 = Math.min(COLS - 1, c0 + W / T + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const t = map[r][c]; if (!t) continue;
    let off = 0;
    for (const b of bumps) if (b.c === c && b.r === r) off = -Math.sin(b.t / 8 * Math.PI) * 4;
    drawTile(t, c * T, r * T + Math.round(off));
  }

  fireballs.forEach(f => blit(fireballSpr, Math.round(f.x), Math.round(f.y)));
  debris.forEach(d => { ctx.fillStyle = theme.base; ctx.fillRect(Math.round(d.x), Math.round(d.y), 8, 8); ctx.fillStyle = '#000'; ctx.fillRect(Math.round(d.x), Math.round(d.y) + 3, 8, 1); });
  fx.forEach(f => {
    const w = Math.abs(Math.cos(f.t / 3)) * 6 + 1;
    ctx.fillStyle = '#F8B800'; ctx.fillRect(Math.round(f.x + 4 - w / 2), Math.round(f.y), Math.round(w), 14);
  });

  // Mario
  const m = mario;
  const hidden = state === 'goal' && ph >= 3;
  const flick = m.inv > 0 && ((tick >> 2) & 1);
  if (!hidden && !flick) {
    const pw = state === 'dead' ? 0 : m.power;
    const pose = (!m.ground || state === 'dead' || (state === 'goal' && ph < 2)) ? 'jump'
      : Math.abs(m.vx) > 0.1 ? ((tick >> 3) & 1 ? 'walk' : 'stand') : 'stand';
    const img = marioImg(pw, pose);
    blit(img, Math.round(m.x) - (pw ? 2 : 1), Math.round(m.y), m.dir < 0 && !(state === 'goal' && ph === 0), state === 'dead');
  }
  pops.forEach(p => { ctx.font = '8px "Press Start 2P", monospace'; ctx.textBaseline = 'top'; text(p.txt, Math.round(p.x), Math.round(p.y) - 6); });
  ctx.restore();

  // telas
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textBaseline = 'top';
  if (state === 'inter' || state === 'gameover') {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  }
  // HUD
  text('MARIO', 18, 4); text(pad(score, 6), 18, 12);
  if ((tick >> 4) % 3 !== 2) { ctx.fillStyle = '#F8B800'; ctx.fillRect(87, 12, 4, 8); ctx.fillStyle = '#A84000'; ctx.fillRect(89, 12, 2, 8); }
  text('x' + pad(coins, 2), 95, 12);
  text('WORLD', 145, 4); text(LEVELS[lvl].name, 153, 12);
  text('TIME', 206, 4); text(state === 'inter' ? '' : pad(time, 3), 214, 12);

  if (state === 'inter') {
    center('WORLD ' + LEVELS[lvl].name, 72);
    ctx.drawImage(marioImg(0, 'stand'), 100, 94);
    text('x  ' + lives, 124, 98);
  } else if (state === 'gameover') center('GAME OVER', 88);
  else if (state === 'end') {
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 40, W, 112);
    center('THANK YOU MARIO!', 62); center('YOUR QUEST IS OVER.', 82);
    center('FINAL SCORE', 108); center(pad(score, 6), 122); center('PRESS R', 140);
  } else if (paused) center('PAUSED', 88);
}

/* ------------------------------ LOOP ------------------------------- */
newGame(true);
let last = 0, accT = 0;
function frame(now) {
  accT += Math.min(now - last, 100); last = now;
  while (accT >= 1000 / 60) { if (!paused) update(); accT -= 1000 / 60; }
  draw();
  requestAnimationFrame(frame);
}
const start = () => requestAnimationFrame(t => { last = t; frame(t); });
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(start, start);
else start();
