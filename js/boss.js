// boss.js — 余热突围拆分模块
// ===== Boss =====
function startBoss() {
  Game.wavePhase = 'boss';
  Game.enemies = [];
  Game.eBullets = [];
  Game.events = [];
  Game.horde = null;
  const b = {
    isBoss: true,
    type: 'boss',
    def: { name: '熔炉执法者', color: C.HEAT },
    x: clamp((Game.player ? Game.player.x + Game.player.w / 2 : FIELD.right / 2) + 300,
      20, FIELD.right - CONFIG.boss.w - 20),
    y: clamp((Game.player ? Game.player.y + Game.player.h / 2 : FIELD.bottom / 2) - CONFIG.boss.h / 2,
      20, FIELD.bottom - CONFIG.boss.h - 20),
    w: CONFIG.boss.w,
    h: CONFIG.boss.h,
    hp: CONFIG.boss.hp * (Game.mode === 'hard' ? CONFIG.hardMode.hpMul : 1),
    maxHp: CONFIG.boss.hp * (Game.mode === 'hard' ? CONFIG.hardMode.hpMul : 1),
    armor: CONFIG.boss.armor * (Game.mode === 'hard' ? CONFIG.hardMode.hpMul : 1),
    armorMax: CONFIG.boss.armor * (Game.mode === 'hard' ? CONFIG.hardMode.hpMul : 1),
    armorBroken: false,
    executionReady: false,
    executionUsed: false,
    executionTimer: 0,
    facing: -1,
    state: 'ENTER',
    stateTimer: 2.0,
    stage: 1,
    lastAction: '',
    alive: true,
    hitFlash: 0,
    vx: 0,
    chargeVec: { x: -1, y: 0 },
    summonsUsed: false,
    queue: [],
    coreExposed: false
  };
  Game.boss = b;
  Game.enemies.push(b);
  Game.state = 'PLAYING';
  Game.cam.x = clamp(b.x + b.w / 2 - VIEW.w / 2, 0, FIELD.right - VIEW.w);
  Game.cam.y = clamp(b.y + b.h / 2 - VIEW.h / 2, 0, FIELD.bottom - VIEW.h);
  Game.bossIntroTimer = 2.0;
  Game.killFeed = [];
  Game.ui.banner = null;
  addShake(12);
  Sfx.play('alarm');
}

function updateBoss(dt) {
  const b = Game.boss;
  if (!b || !b.alive) return;
  b.hitFlash = Math.max(0, b.hitFlash - dt);
  b.stateTimer -= dt;

  // 装甲破坏硬直 / 处决窗口：Boss 停止攻击
  if (b.state === 'STAGGER') {
    b.coreExposed = true;
    if (b.stateTimer <= 0) {
      b.coreExposed = false;
      b.state = 'IDLE';
      b.stateTimer = 1.0;
    }
    return;
  }
  if (b.state === 'EXECUTE') {
    b.coreExposed = true;
    b.executionTimer -= dt;
    if (b.executionTimer <= 0) {
      b.executionReady = false;
      b.coreExposed = false;
      b.state = 'IDLE';
      b.stateTimer = 1.0;
    }
    return;
  }

  // 阶段切换
  const ratio = b.hp / b.maxHp;
  let newStage = 1;
  if (ratio <= CONFIG.boss.stage3At) newStage = 3;
  else if (ratio <= CONFIG.boss.stage2At) newStage = 2;
  if (newStage !== b.stage) {
    b.stage = newStage;
    Game.eBullets = [];
    b.state = 'STAGE';
    b.stateTimer = 1.0;
    b.coreExposed = false;
    b.queue = [];
    if (newStage === 2 && !b.summonsUsed) {
      b.summonsUsed = true;
      for (let i = 0; i < CONFIG.boss.summonCount; i++) {
        const pos = spawnPositionFor('charger');
        createEnemy('charger', pos.x, pos.y);
      }
    }
    Game.ui.banner = { text: '阶段 ' + newStage, timer: 1.4, sub: '' };
    Sfx.play('alarm');
  }

  if (b.state === 'ENTER') {
    if (b.stateTimer <= 0) { b.state = 'IDLE'; b.stateTimer = b.stage === 3 ? 0.85 : 1.0; }
    return;
  }
  if (b.state === 'STAGE') {
    if (b.stateTimer <= 0) { b.state = 'IDLE'; b.stateTimer = b.stage === 3 ? 0.85 : 1.0; }
    return;
  }
  if (b.state === 'CORE') {
    b.coreExposed = true;
    if (b.stateTimer <= 0) { b.coreExposed = false; b.state = 'IDLE'; b.stateTimer = b.stage === 3 ? 0.85 : 1.0; }
    return;
  }
  if (b.state === 'IDLE') {
    if (b.stateTimer <= 0) chooseBossAction(b);
    return;
  }
  if (b.state === 'WARN_CHARGE') {
    const p = Game.player;
    if (p && !b.chargeLocked) {
      const dx = p.x + p.w / 2 - (b.x + b.w / 2);
      const dy = p.y + p.h / 2 - (b.y + b.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      b.chargeVec = { x: dx / d, y: dy / d };
    }
    if (b.stateTimer <= 0) {
      b.state = 'CHARGE';
      b.stateTimer = b.stage === 3 ? 0.52 : 0.7;
      b.chargeHit = false;
      b.chargeLocked = false;
      Sfx.play('alarm');
    }
    return;
  }
  if (b.state === 'CHARGE') {
    b.x = clamp(b.x + b.chargeVec.x * 520 * dt, FIELD.left, FIELD.right - b.w);
    b.y = clamp(b.y + b.chargeVec.y * 520 * dt, FIELD.top, FIELD.bottom - b.h);
    const p = Game.player;
    if (!b.chargeHit && p && !p.dead && aabb(b, p)) {
      b.chargeHit = true;
      hurtPlayer(CONFIG.boss.chargeDamage);
    }
    if (b.stateTimer <= 0) {
      if (b.stage === 3 && b.chargeAgain) {
        b.chargeAgain = false;
        b.state = 'CHARGE';
        b.stateTimer = 0.52;
        b.chargeVec = { x: -b.chargeVec.x, y: -b.chargeVec.y };
        b.chargeHit = false;
      } else {
        b.state = 'CORE';
        b.stateTimer = CONFIG.boss.coreExposeTime;
      }
    }
    return;
  }
  if (b.state === 'WARN_SPREAD') {
    if (b.stateTimer <= 0) {
      b.state = 'SPREAD';
      b.stateTimer = 0.4;
      b.spreadLeft = 5;
      b.spreadTimer = 0;
    }
    return;
  }
  if (b.state === 'SPREAD') {
    b.spreadTimer -= dt;
    if (b.spreadLeft > 0 && b.spreadTimer <= 0) {
      b.spreadLeft -= 1;
      b.spreadTimer = 0.1;
      const base = Math.atan2(Game.player.y + Game.player.h / 2 - (b.y + b.h / 2), Game.player.x + Game.player.w / 2 - (b.x + b.w / 2));
      const a = base + (b.spreadLeft - 2) * 0.20;
      addEnemyBullet(b.x + b.w / 2, b.y + b.h / 2, Math.cos(a) * 380, Math.sin(a) * 380, CONFIG.boss.spreadDamage, 'shot');
    }
    if (b.stateTimer <= 0) {
      b.state = 'CORE';
      b.stateTimer = CONFIG.boss.coreExposeTime;
    }
    return;
  }
  if (b.state === 'WARN_BOMB') {
    if (b.stateTimer <= 0) {
      b.state = 'BOMB';
      b.stateTimer = 0.3;
    }
    return;
  }
  if (b.state === 'BOMB') {
    const p = Game.player;
    for (let i = 0; i < 3; i++) {
      const tx = clamp(p.x + p.w / 2 + (i - 1) * 130, FIELD.left + 40, FIELD.right - 40);
      const ty = clamp(p.y + p.h / 2 + (i - 1) * 60, FIELD.top + 40, FIELD.bottom - 40);
      addBlast(tx, ty, 66, 0.9, CONFIG.boss.bombDamage, C.DANGER);
    }
    b.state = 'CORE';
    b.stateTimer = CONFIG.boss.coreExposeTime;
    return;
  }
}

function chooseBossAction(b) {
  const s = b.stage;
  let action;
  if (s === 1) {
    action = b.lastAction === 'charge' ? 'spread' : 'charge';
  } else if (s === 2) {
    if (b.lastAction === 'charge') action = 'spread';
    else if (b.lastAction === 'spread') action = 'bomb';
    else action = 'charge';
  } else {
    action = b.lastAction === 'charge' ? 'chargeAlt' : 'charge';
  }
  b.lastAction = action === 'chargeAlt' ? 'charge' : action;
  if (action === 'charge') {
    b.state = 'WARN_CHARGE';
    b.stateTimer = s === 3 ? 0.6 : 0.7;
    b.chargeAgain = false;
  } else if (action === 'chargeAlt') {
    b.state = 'WARN_CHARGE';
    b.stateTimer = 0.6;
    b.chargeAgain = true;
    b.facing = 1;
  } else if (action === 'spread') {
    b.state = 'WARN_SPREAD';
    b.stateTimer = 0.5;
  } else {
    b.state = 'WARN_BOMB';
    b.stateTimer = 0.6;
  }
}

function damageBoss(amount, opts) {
  const b = Game.boss;
  if (!b || !b.alive) return;
  if (b.state === 'ENTER') return;
  let dmg = amount;
  // 装甲先承伤；破甲后核心伤害提升 25%
  if (b.armor > 0) {
    b.armor -= dmg;
    if (b.armor <= 0) {
      dmg = -b.armor;
      b.armor = 0;
      if (!b.armorBroken) {
        b.armorBroken = true;
        b.state = 'STAGGER';
        b.stateTimer = 1.3;
        b.coreExposed = true;
        Game.eBullets = [];
        addShake(12);
        Game.hitStop = Math.max(Game.hitStop, 0.08);
        Game.ui.banner = { text: '装甲破坏', timer: 1.6, sub: '核心暴露' };
        burst(b.x + b.w / 2, b.y + b.h / 2, C.CYAN_LIGHT, 30, 280, 5);
        spawnPickup({ x: b.x + b.w / 2, y: b.y + b.h / 2 + 40 }, 'health');
      }
    } else {
      dmg = 0;
    }
  }
  if (b.armorBroken) dmg *= 1.25;
  b.hitFlash = 0.12;
  if (dmg > 0) b.hp -= dmg;
  addFloater(b.x + b.w / 2, b.y - 8, Math.round(amount), (opts && opts.crit) ? C.PERFECT : C.TEXT, (opts && opts.crit) ? 22 : 16);
  if (opts && opts.crit) {
    Game.hitStop = Math.max(Game.hitStop, 0.045);
    burst(b.x + b.w / 2, b.y + b.h / 2, C.PERFECT, 12, 220, 3);
  }
  if (b.hp <= 0) {
    b.hp = 0;
    b.alive = false;
    burst(b.x + b.w / 2, b.y + b.h / 2, C.HEAT, 40, 320, 5);
    addShake(14);
    Game.state = 'VICTORY';
    Game.score += CONFIG.boss.score;
    finalizeRun(true);
    return;
  }
  // 低血量进入处决窗口
  if (b.hp <= b.maxHp * 0.12 && !b.executionReady && !b.executionUsed) {
    b.executionReady = true;
    b.executionUsed = true;
    b.executionTimer = 3.0;
    b.state = 'EXECUTE';
    b.stateTimer = 3.0;
    b.coreExposed = true;
    Game.eBullets = [];
    Game.flash = Math.max(Game.flash, 0.2);
    Game.ui.banner = { text: '处决机会', timer: 2.0, sub: '靠近后按 F' };
    Sfx.play('alarm');
  }
}

function executeBoss() {
  const b = Game.boss;
  if (!b || !b.alive || !b.executionReady) return false;
  b.executionReady = false;
  b.hp = 0;
  b.armor = 0;
  b.alive = false;
  Game.state = 'VICTORY';
  Game.score += CONFIG.boss.score + 1500;
  Game.flash = 0.5;
  addShake(20);
  Game.hitStop = 0.12;
  burst(b.x + b.w / 2, b.y + b.h / 2, C.PERFECT, 60, 420, 6);
  addFloater(b.x + b.w / 2, b.y + b.h / 2, '处决！', C.PERFECT, 36);
  finalizeRun(true);
  return true;
}

