// main.js — 余热突围拆分模块
// ===== 画布适配 =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
window.addEventListener('resize', resize);

// ===== 渲染主循环 =====
function render() {
  Game.uiRects = [];
  ctx.save();
  // 世界层使用最近邻放大，保证像素素材清晰；HUD/菜单在 restore 后恢复平滑
  ctx.imageSmoothingEnabled = false;
  drawBackground(Game.time);
  if (Game.state !== 'TITLE') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(VIEW.left, VIEW.top, VIEW.w, VIEW.h);
    ctx.clip();
    const shx = Game.shake > 0 ? (Math.random() - 0.5) * Game.shake : 0;
    const shy = Game.shake > 0 ? (Math.random() - 0.5) * Game.shake : 0;
    ctx.translate(VIEW.left - Game.cam.x + shx, VIEW.top - Game.cam.y + shy);
    drawMap();
    drawEvents();
    for (const e of Game.enemies) drawEnemy(e);
    if (Game.player) drawPlayer();
    drawBullets();
    drawParticles();
    drawPickups();
    ctx.restore();
  }
  ctx.restore();

  if (Game.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.8, Game.flash * 1.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (Game.state !== 'TITLE') drawScreenEffects();
  if (Game.state !== 'TITLE') drawHUD();
  if (Game.state === 'TITLE') drawTitle();
  else if (Game.state === 'UPGRADE') drawUpgrade();
  else if (Game.state === 'PAUSED') drawPause();
  else if (Game.state === 'VICTORY' || Game.state === 'DEFEAT') drawResult();

  if (Game.bossIntroTimer > 0) drawBossIntro();
  drawCrosshair();
}

// ===== 开局与重置 =====
function resetRunState() {
  Game.enemies = [];
  Game.pBullets = [];
  Game.eBullets = [];
  Game.particles = [];
  Game.floaters = [];
  Game.pickups = [];
  Game.events = [];
  Game.killFeed = [];
  Game.horde = null;
  Game.slowMo = 0;
  Game.boss = null;
  Game.bossIntroTimer = 0;
  Game.pendingSpawn = [];
  Game.flash = 0;
  Game.dropDry = 0;
  Game.upgradeChoices = [];
  Game.upgrades = {};
  Game.upgradeSelections = 0;
  Game.time = 0;
  Game.score = 0;
  Game.combo = 0;
  Game.comboTimer = 0;
  Game.maxCombo = 0;
  Game.shotsFired = 0;
  Game.shotsHit = 0;
  Game.perfectVents = 0;
  Game.overheatCount = 0;
  Game.shake = 0;
  Game.lastResult = null;
  Game.newRecordFlags = {};
  Game.ui.banner = null;
  Game.ui.hintTimer = 0;
  Game.blasts = [];
  setMap(MAPS[0]);
  Game.wavePhase = 'fighting';
  Game.wave = 0;
}

function startRun() {
  Sfx.ensure();
  resetRunState();
  Game.player = createPlayer();
  snapCamera();
  seedRng(Game.seedText);
  startWave(1);
  Game.ui.banner = { text: '第 1 波', timer: 1.3, sub: '' };
}

function gotoTitle() {
  resetRunState();
  Game.player = null;
  Game.state = 'TITLE';
  Game.titleState = { editing: false, buffer: Game.seedText || newSeedText() };
}

// ===== 更新分派 =====
function update(dt) {
  if (Input.anyPress) Sfx.ensure();

  if (Game.state === 'PLAYING' && Input.consumePress('Escape')) {
    Game.prevState = 'PLAYING';
    Game.state = 'PAUSED';
    Input.keys.clear();
    return;
  }
  if (Game.state !== 'TITLE' && Input.consumePress('m')) {
    toggleMute();
    return;
  }
  if (Game.state === 'TITLE') updateTitle();
  else if (Game.state === 'PLAYING') updatePlaying(dt);
  else if (Game.state === 'UPGRADE') updateUpgrade();
  else if (Game.state === 'PAUSED') updatePause();
  else if (Game.state === 'VICTORY' || Game.state === 'DEFEAT') updateResult();

  if (Game.ui.banner && Game.ui.banner.timer > 0) Game.ui.banner.timer -= dt;
  if (Game.ui.hintTimer > 0) Game.ui.hintTimer -= dt;
}

// ===== 初始化 =====
Storage.load();
Assets.load();
Sfx.init();
resize();
Input.init(canvas);
canvas.style.cursor = 'none';
seedRng(newSeedText());
Game.titleState = { editing: false, buffer: Game.seedText };
setMap(MAPS[0]);

window.addEventListener('blur', () => {
  if (Game.state === 'PLAYING') {
    Game.prevState = 'PLAYING';
    Game.state = 'PAUSED';
  }
  Input.keys.clear();
});

// ===== 主循环（固定步长） =====
let lastTime = performance.now();
let accumulator = 0;
function frame(now) {
  let delta = (now - lastTime) / 1000;
  lastTime = now;
  if (delta > MAX_FRAME_DT) delta = MAX_FRAME_DT;
  accumulator += delta;
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < 4) {
    update(FIXED_DT);
    accumulator -= FIXED_DT;
    steps += 1;
  }
  render();
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ===== 调试接口（仅本地测试用） =====
window.__afterheatDebug = {
  Game: Game,
  start(weapon, mode) {
    if (weapon) Game.weaponId = weapon;
    if (mode) Game.mode = mode;
    Game.seedText = Game.seedText || newSeedText();
    startRun();
  },
  gotoTitle: gotoTitle,
  snapshot() {
    return {
      state: Game.state,
      mode: Game.mode,
      weapon: Game.weaponId,
      wave: Game.wave,
      wavePhase: Game.wavePhase,
      enemies: Game.enemies.length,
      active: enemiesActiveCount(),
      hp: Game.player ? Game.player.hp : null,
      heat: Game.player ? Game.player.heat : null,
      score: Game.score,
      combo: Game.combo,
      shotsFired: Game.shotsFired,
      shotsHit: Game.shotsHit,
      upgrades: Game.upgrades,
      boss: Game.boss ? { hp: Game.boss.hp, stage: Game.boss.stage, state: Game.boss.state } : null
    };
  },
  step(n) {
    for (let i = 0; i < n; i++) {
      update(FIXED_DT);
      Input.endFrame();
    }
    render();
  },
  setKey(k, down) {
    if (down) { Input.keys.add(k); Input.pressed.add(k); }
    else Input.keys.delete(k);
  },
  tapKey(k) { Input.pressed.add(k); },
  setMouse(x, y, down) {
    Input.mouse.x = x; Input.mouse.y = y;
    Input.mouse.down = down;
    if (down) Input.mouse.pressed = true;
  },
  // 世界坐标 -> 屏幕坐标（测试瞄准用）
  screenPoint(x, y) {
    return { x: x - Game.cam.x + VIEW.left, y: y - Game.cam.y + VIEW.top };
  },
  aimAt(x, y, down) {
    const s = this.screenPoint(x, y);
    this.setMouse(s.x, s.y, down);
  },
  spawnPickupAt(offsetX, offsetY, type, weaponId) {
    const p = Game.player;
    if (!p) return;
    spawnPickup({ x: p.x + p.w / 2 + (offsetX || 40), y: p.y + p.h / 2 + (offsetY || 0) }, type, weaponId);
  },
  forceHorde() { startHorde(); },
  forceEvent(type) {
    const p = Game.player;
    if (!p) return;
    Game.events.push({
      type: type || 'altar',
      x: p.x + p.w / 2 + 120,
      y: p.y + p.h / 2,
      bob: 0, cool: 0
    });
  },
  grantUpgrade(id) {
    const def = UPGRADE_DEFS[id];
    if (def) Game.upgrades[id] = Math.min(def.max, upgradeLevel(id) + 1);
  },
  killAll() {
    for (const e of Game.enemies) if (e.alive) killEnemy(e, 'BULLET');
  },
  hitBoss(n) { damageBoss(n || 1, {}); },
  pickUpgrade(index) { selectUpgrade(index); },
  enemyPositions() {
    return Game.enemies.filter((e) => e.alive).map((e) => ({
      type: e.type, x: e.x + e.w / 2, y: e.y + e.h / 2, hp: e.hp
    }));
  },
  setHeat(v) { if (Game.player) Game.player.heat = v; },
  startBoss() { startBoss(); },
  missingAssets() {
    const missing = [];
    for (const k in Assets.images) if (!Assets.get(k)) missing.push(k);
    return missing;
  },
  upgradeAudit() {
    return Object.keys(Game.upgrades).map((id) => ({
      id, level: Game.upgrades[id], max: UPGRADE_DEFS[id] ? UPGRADE_DEFS[id].max : -1
    }));
  }
};

