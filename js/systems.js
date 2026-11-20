// systems.js — 余热突围拆分模块
// ===== 波次 =====
function startWave(wave) {
  Game.wave = wave;
  setMap(levelSetForWave(wave));
  Game.enemies = [];
  Game.pBullets = [];
  Game.eBullets = [];
  Game.blasts = [];
  Game.particles = [];
  Game.floaters = [];
  Game.events = [];
  Game.horde = null;
  Game.boss = null;
  Game.wavePhase = 'fighting';
  Game.spawnTimer = 0;
  Game.pendingSpawn = [];
  const cfg = CONFIG.waves[wave - 1];
  const types = Object.keys(cfg);
  let maxCount = 0;
  for (const t of types) maxCount = Math.max(maxCount, cfg[t]);
  for (let i = 0; i < maxCount; i++) {
    for (const t of types) if (i < cfg[t]) Game.pendingSpawn.push(t);
  }
  const p = Game.player;
  p.heat = 0;
  p.ventStop = 0;
  p.overheated = 0;
  p.overheatCounted = false;
  p.dashTimer = 0;
  p.dashCooldown = 0;
  Game.state = 'PLAYING';
  if (wave >= 2) {
    if (rnd() < 0.30) spawnEventForWave();
    if (rnd() < 0.35) startHorde();
  }
}

// ===== 升级 =====
function upgradeLevel(id) { return Game.upgrades[id] || 0; }

function rollUpgrades() {
  const candidates = Object.keys(UPGRADE_DEFS).filter((id) => upgradeLevel(id) < UPGRADE_DEFS[id].max);
  const shuffled = candidates.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
  }
  const choices = shuffled.slice(0, 3);
  if (Game.upgradeSelections === 0 && choices.length === 3) {
    const anyBehavioral = choices.some((id) => UPGRADE_DEFS[id].behavioral);
    if (!anyBehavioral) {
      const behavioral = shuffled.find((id) => UPGRADE_DEFS[id].behavioral && !choices.slice(0, 2).includes(id));
      if (behavioral) choices[2] = behavioral;
    }
  }
  if (Game.upgradeSelections >= 2 && choices.length === 3) {
    const routes = choices.map((id) => UPGRADE_DEFS[id].route);
    if (routes[0] === routes[1] && routes[1] === routes[2]) {
      const other = shuffled.find((id) => UPGRADE_DEFS[id].route !== routes[0] && !choices.includes(id));
      if (other) choices[2] = other;
    }
  }
  Game.upgradeChoices = choices;
}

function applyUpgrade(id) {
  if (Game.state !== 'UPGRADE') return;
  const def = UPGRADE_DEFS[id];
  if (!def || upgradeLevel(id) >= def.max) return;
  Game.upgrades[id] = upgradeLevel(id) + 1;
  Game.upgradeSelections += 1;
  Sfx.play('upgrade');
  if (upgradeLevel('valve') > 0 && Game.player) Game.player.heat = Math.min(Game.player.heat, 90);
  Game.state = 'PLAYING';
  if (Game.wave >= 6 && Game.wavePhase === 'cleared') {
    startBoss();
  } else if (Game.wavePhase === 'cleared') {
    startWave(Game.wave + 1);
  } else {
    Game.wavePhase = 'fighting';
  }
}

// ===== 结算 =====
function finalizeRun(win) {
  const d = Storage.data;
  Game.timeStop = Game.time;
  Game.runEndAt = Date.now();
  if (Game.mode === 'hard') {
    Game.score = Math.round(Game.score * CONFIG.hardMode.scoreMul);
  }
  Game.lastResult = {
    win,
    mode: Game.mode,
    weapon: CONFIG.weapons[Game.weaponId].name,
    time: Game.time,
    maxCombo: Game.maxCombo,
    shotsFired: Game.shotsFired,
    shotsHit: Game.shotsHit,
    accuracy: Game.shotsFired > 0 ? Math.min(100, Game.shotsHit / Game.shotsFired * 100) : 0,
    perfectVents: Game.perfectVents,
    overheatCount: Game.overheatCount,
    score: Game.score,
    upgrades: Object.keys(Game.upgrades).filter((k) => Game.upgrades[k] > 0).map((k) => ({ id: k, level: Game.upgrades[k] })),
    seed: Game.seedText,
    playerName: Game.playerName,
    startTime: LeaderboardClient.formatDateTime(Game.runStartAt || Date.now()),
    endTime: LeaderboardClient.formatDateTime(Game.runEndAt)
  };
  Game.newRecordFlags = {};
  if (win) {
    d.hardUnlocked = true;
    const bestKey = Game.mode === 'hard' ? 'hardBest' : 'normalBest';
    const fastKey = Game.mode === 'hard' ? 'hardFastest' : 'normalFastest';
    if (Game.score > (d[bestKey] || 0)) {
      d[bestKey] = Game.score;
      Game.newRecordFlags.best = true;
    }
    if (!d[fastKey] || Game.time < d[fastKey]) {
      d[fastKey] = Game.time;
      Game.newRecordFlags.fastest = true;
    }
  } else {
    const bestKey = Game.mode === 'hard' ? 'hardBest' : 'normalBest';
    if (Game.score > (d[bestKey] || 0)) {
      d[bestKey] = Game.score;
      Game.newRecordFlags.best = true;
    }
  }
  Storage.save();

  // 上报本局记录（失败时由 LeaderboardClient 放入本地待提交队列）
  const p = Game.player;
  let lastStage, winFlag = !!win;
  if (win) {
    lastStage = 8;
  } else if (Game.wavePhase === 'boss') {
    lastStage = 7;
  } else {
    lastStage = Math.max(1, Math.min(6, Game.wave));
  }
  const record = {
    name: Game.playerName || '匿名玩家',
    startTime: LeaderboardClient.formatDateTime(Game.runStartAt || Game.runEndAt),
    endTime: LeaderboardClient.formatDateTime(Game.runEndAt),
    seed: Game.seedText,
    win: winFlag,
    lastStage,
    duration: Math.round(Game.time),
    remainingHp: p ? Math.max(0, Math.round(p.hp)) : 0,
    maxHp: CONFIG.player.maxHp
  };
  if (typeof LeaderboardClient !== 'undefined') LeaderboardClient.submitRun(record);
}

// ===== 状态迁移与主更新 =====
function waveCleared() {
  const p = Game.player;
  p.hp = Math.min(CONFIG.player.maxHp, p.hp + CONFIG.player.waveHeal);
  Game.eBullets = [];
  if (Game.wave >= 6) {
    Game.wavePhase = 'cleared';
  } else {
    Game.wavePhase = 'cleared';
  }
  Game.upgradeChoices = [];
  rollUpgrades();
  Game.state = 'UPGRADE';
}

function updatePlaying(dt) {
  const p = Game.player;
  const freeze = Game.hitStop > 0;
  if (freeze) Game.hitStop -= dt;
  if (Game.slowMo > 0) Game.slowMo -= dt;
  if (Game.bossIntroTimer > 0) Game.bossIntroTimer -= dt;
  const edt = freeze ? 0 : dt * (Game.slowMo > 0 ? 0.35 : 1);

  // 1. 输入已在 updatePlayer 内读取
  // 2. 泄压/过热
  updatePlayer(dt);

  // Boss 处决
  if (Game.boss && Game.boss.executionReady && Game.boss.executionTimer > 0 && Input.consumePress('f')) {
    const p = Game.player;
    const b = Game.boss;
    if (p && dist(p.x + p.w / 2, p.y + p.h / 2, b.x + b.w / 2, b.y + b.h / 2) < 190) {
      executeBoss();
    } else {
      Game.ui.hintTimer = 1.2;
      Game.ui.hintText = '靠近 Boss 再按 F';
    }
  }

  // 3. 玩家子弹
  updatePlayerBullets(dt);

  // 4. 敌人与 Boss（慢动作/顿帧只影响敌方）
  updateSpawns(edt);
  updateEnemies(edt);
  if (Game.boss) updateBoss(edt);

  // 范围轰炸
  updateBlasts(edt);

  // 5. 敌弹与玩家受击
  updateEnemyBullets(edt);
  updatePickups(dt);
  updateEvents(dt);
  updateHorde(dt);

  // 6. 计时与统计
  Game.time += dt;
  if (Game.comboTimer > 0) {
    Game.comboTimer -= dt;
    if (Game.comboTimer <= 0) Game.combo = 0;
  }
  updateEffects(dt);

  // 7. 波次/Boss/胜负判定
  if (Game.state === 'PLAYING' && Game.wavePhase === 'fighting') {
    const active = enemiesActiveCount();
    if (active === 0 && Game.pendingSpawn.length === 0 && Game.enemies.every((e) => !e.alive) &&
        !(Game.horde && Game.horde.timer > 0)) {
      waveCleared();
    }
  }
  if (Game.state === 'PLAYING' && p && p.hp <= 0 && !p.dead) {
    p.dead = true;
    Game.state = 'DEFEAT';
    finalizeRun(false);
  }
  updateCamera(dt);
}

function updateEffects(dt) {
  for (let i = Game.particles.length - 1; i >= 0; i--) {
    const pt = Game.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { Game.particles.splice(i, 1); continue; }
    if (!pt.rail) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= pt.drag;
      pt.vy *= pt.drag;
    }
  }
  for (let i = Game.floaters.length - 1; i >= 0; i--) {
    const f = Game.floaters[i];
    f.life -= dt;
    if (f.life <= 0) { Game.floaters.splice(i, 1); continue; }
    f.y += f.vy * dt;
    f.vy *= 0.92;
  }
  for (let i = Game.killFeed.length - 1; i >= 0; i--) {
    Game.killFeed[i].life -= dt;
    if (Game.killFeed[i].life <= 0) Game.killFeed.splice(i, 1);
  }
  if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - dt * 30);
  if (Game.flash > 0) Game.flash = Math.max(0, Game.flash - dt);
}

