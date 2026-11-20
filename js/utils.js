// utils.js — 余热突围拆分模块
// ===== 工具函数 =====
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ===== 存储 =====
const Storage = {
  data: {
    hardUnlocked: false,
    normalBest: 0, hardBest: 0,
    normalFastest: 0, hardFastest: 0,
    shake: true, muted: false
  },
  load() {
    try {
      const raw = localStorage.getItem('afterheat_save_v1');
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* 存储不可用不阻断 */ }
    Sfx.muted = !!this.data.muted;
  },
  save() {
    try {
      localStorage.setItem('afterheat_save_v1', JSON.stringify(this.data));
    } catch (e) { /* 忽略 */ }
  }
};

// ===== 随机与种子 =====
function newSeedText() {
  try {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return 'SEED-' + arr[0].toString(16) + arr[1].toString(16);
  } catch (e) {
    return 'SEED-' + (Date.now() % 100000000).toString(16) + '-T';
  }
}
function seedRng(text) {
  Game.seedText = text || '';
  Game.rng = mulberry32(hashString(Game.seedText || 'default'));
}
function rnd() { return Game.rng ? Game.rng() : Math.random(); }
function rndRange(a, b) { return a + rnd() * (b - a); }

// ===== 浮字与粒子 =====
function addFloater(x, y, text, color, size) {
  Game.floaters.push({ x, y, text, color: color || C.TEXT, life: 0.9, maxLife: 0.9, size: size || 18, vy: -46 });
}
function addParticle(x, y, vx, vy, color, life, size, drag) {
  if (Game.particles.length > 350) Game.particles.shift();
  Game.particles.push({ x, y, vx, vy, color, life, maxLife: life, size: size || 3, drag: drag == null ? 0.94 : drag });
}
function burst(x, y, color, count, speed, size) {
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const s = speed * (0.4 + rnd() * 0.8);
    addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 0.35 + rnd() * 0.35, size || 3);
  }
}
function addShake(v) {
  if (Storage.data.shake) Game.shake = Math.min(18, Game.shake + v);
}

