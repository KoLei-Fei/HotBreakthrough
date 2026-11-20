// enemies.js — 余热突围拆分模块
// ===== 敌人 =====
function createEnemy(typeId, x, y) {
  const def = CONFIG.enemies[typeId];
  const hpMul = (1 + 0.1 * (Game.wave - 1)) * (Game.mode === 'hard' ? CONFIG.hardMode.hpMul : 1);
  const elite = Game.wave >= 2 && rnd() < 0.07;
  const eliteMul = elite ? 1.8 : 1;
  const e = {
    type: typeId,
    def,
    x, y,
    elite,
    w: def.w, h: def.h,
    hp: def.hp * hpMul * eliteMul,
    maxHp: def.hp * hpMul * eliteMul,
    vx: 0, vy: 0,
    onGround: false,
    state: 'SPAWNING',
    stateTimer: 0.8,
    dir4: 0,
    facing: -1,
    hitFlash: 0,
    burn: 0,
    burnTick: 0,
    alive: true,
    score: def.score * (elite ? 2 : 1),
    attackTimer: 0,
    aimAngle: 0,
    chargeDir: 1,
    phasing: false,
    phaseTime: 0,
    shieldFlash: 0,
    axisY: y,
    deadTimer: 0
  };
  Game.enemies.push(e);
  return e;
}

function enemiesAlive() {
  return Game.enemies.filter((e) => e.alive).length;
}

// ===== 敌人 AI =====
function spawnPositionFor(typeId) {
  const p = Game.player;
  const def = CONFIG.enemies[typeId];
  const pcx = p ? p.x + p.w / 2 : FIELD.right / 2;
  const pcy = p ? p.y + p.h / 2 : FIELD.bottom / 2;
  for (let tries = 0; tries < 60; tries++) {
    const ang = rnd() * Math.PI * 2;
    const r = rndRange(380, 860);
    const x = clamp(pcx + Math.cos(ang) * r - def.w / 2, 12, FIELD.right - def.w - 12);
    const y = clamp(pcy + Math.sin(ang) * r - def.h / 2, 12, FIELD.bottom - def.h - 12);
    const cx = x + def.w / 2, cy = y + def.h / 2;
    if (dist(cx, cy, pcx, pcy) >= 300 && !pointHitsObstacle(cx, cy)) {
      return { x, y };
    }
  }
  return { x: clamp(pcx + 420, 12, FIELD.right - def.w - 12), y: clamp(pcy, 12, FIELD.bottom - def.h - 12) };
}

function updateSpawns(dt) {
  if (Game.wavePhase !== 'fighting') return;
  Game.spawnTimer = (Game.spawnTimer || 0) - dt;
  if (Game.pendingSpawn.length > 0 && enemiesActiveCount() < CONFIG.maxActiveEnemies && Game.spawnTimer <= 0) {
    const typeId = Game.pendingSpawn.shift();
    const pos = spawnPositionFor(typeId);
    createEnemy(typeId, pos.x, pos.y);
    Game.spawnTimer = 0.18;
  }
}

function enemiesActiveCount() {
  let n = 0;
  for (const e of Game.enemies) if (e.alive && !e.isBoss) n++;
  return n;
}

function updateEnemies(dt) {
  const p = Game.player;
  for (const e of Game.enemies) {
    if (e.isBoss) continue;
    if (!e.alive) {
      e.deadTimer -= dt;
      continue;
    }
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.shieldFlash = Math.max(0, (e.shieldFlash || 0) - dt);

    // 灼烧
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick += dt;
      if (e.burnTick >= 0.25) {
        e.burnTick -= 0.25;
        damageEnemy(e, 2.5, 'BURN', null, { ignoreShield: true });
        if (!e.alive) continue;
      }
    }

    if (e.state === 'SPAWNING') {
      e.stateTimer -= dt;
      e.spawnProtect = true;
      if (e.stateTimer <= 0) {
        e.state = 'IDLE';
        e.spawnProtect = false;
      }
      continue;
    }
    e.spawnProtect = false;

    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const px = p ? p.x + p.w / 2 : W / 2;
    const py = p ? p.y + p.h / 2 : H / 2;

    if (e.type === 'charger') updateCharger(e, dt, px, py);
    else if (e.type === 'gunner') updateGunner(e, dt, px, py);
    else if (e.type === 'drone') updateDrone(e, dt, px, py);
    else if (e.type === 'shield') updateShield(e, dt, px, py);
    else if (e.type === 'bomber') updateBomber(e, dt, px, py);

    if (e.hp <= 0 && e.alive) killEnemy(e, 'BURN');
  }

  // 清理死亡敌人
  for (let i = Game.enemies.length - 1; i >= 0; i--) {
    const e = Game.enemies[i];
    if (!e.alive && e.deadTimer <= 0 && !e.isBoss) Game.enemies.splice(i, 1);
  }
}

function dir4FromVector(vx, vy) {
  if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 1 : 3;
  return vy > 0 ? 0 : 2;
}

function updateCharger(e, dt, px, py) {
  const p = Game.player;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy) || 1;
  if (e.state === 'CHASE' || e.state === 'IDLE') {
    e.vx = (dx / d) * 130;
    e.vy = (dy / d) * 130;
    e.dir4 = dir4FromVector(e.vx, e.vy);
    if (d < 150) {
      e.state = 'PAUSE';
      e.stateTimer = 0.35;
      e.vx = 0; e.vy = 0;
    }
  } else if (e.state === 'PAUSE') {
    e.stateTimer -= dt;
    e.vx = 0; e.vy = 0;
    if (e.stateTimer <= 0) {
      e.state = 'LUNGE';
      e.stateTimer = 0.42;
      e.lungeVec = { x: dx / d, y: dy / d };
      e.dir4 = dir4FromVector(dx, dy);
      e.lungeHit = false;
    }
  } else if (e.state === 'LUNGE') {
    e.stateTimer -= dt;
    e.vx = e.lungeVec.x * 680;
    e.vy = e.lungeVec.y * 680;
    if (!e.lungeHit && p && !p.dead && aabb(e, p)) {
      e.lungeHit = true;
      hurtPlayer(e.def.damage);
    }
    if (e.stateTimer <= 0) {
      e.state = 'RECOVER';
      e.stateTimer = 0.5;
      e.vx = 0; e.vy = 0;
    }
  } else if (e.state === 'RECOVER') {
    e.stateTimer -= dt;
    e.vx = 0; e.vy = 0;
    if (e.stateTimer <= 0) e.state = 'CHASE';
  }
  moveWithPhysics(e, dt, false);
}

function updateGunner(e, dt, px, py) {
  const p = Game.player;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy) || 1;
  if (e.state === 'IDLE') e.state = 'CHASE';
  if (e.state === 'CHASE') {
    if (d > 420) { e.vx = (dx / d) * 95; e.vy = (dy / d) * 95; }
    else if (d < 240) { e.vx = -(dx / d) * 90; e.vy = -(dy / d) * 90; }
    else { e.vx = 0; e.vy = 0; }
    e.dir4 = dir4FromVector(dx, dy);
    if (d < 460) {
      e.state = 'AIM';
      e.stateTimer = 0.65;
      e.aimAngle = Math.atan2(dy, dx);
    }
  } else if (e.state === 'AIM') {
    e.vx = 0; e.vy = 0;
    e.stateTimer -= dt;
    e.aimAngle = Math.atan2(dy, dx);
    e.dir4 = dir4FromVector(dx, dy);
    if (e.stateTimer <= 0) {
      e.state = 'ATTACK';
      e.stateTimer = 0.36;
      e.burstLeft = 3;
      e.burstTimer = 0;
    }
  } else if (e.state === 'ATTACK') {
    e.vx = 0; e.vy = 0;
    e.stateTimer -= dt;
    e.burstTimer -= dt;
    if (e.burstLeft > 0 && e.burstTimer <= 0) {
      e.burstLeft -= 1;
      e.burstTimer = 0.12;
      const a = e.aimAngle + (rnd() - 0.5) * 0.05;
      addEnemyBullet(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20,
        Math.cos(a) * 430, Math.sin(a) * 430, e.def.damage, 'shot');
    }
    if (e.stateTimer <= 0) {
      e.state = 'RECOVER';
      e.stateTimer = 1.2;
    }
  } else if (e.state === 'RECOVER') {
    e.vx = 0; e.vy = 0;
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) e.state = 'CHASE';
  }
  moveWithPhysics(e, dt, false);
}

function updateDrone(e, dt, px, py) {
  e.phaseTime += dt;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy) || 1;
  if (e.state === 'IDLE') e.state = 'PATROL';
  if (e.state === 'PATROL') {
    // 悬浮漂移：环绕接近 + 正弦浮动
    const drift = Math.sin(e.phaseTime * 2.2) * 40;
    e.vx = (dx / d) * 90 + -(dy / d) * drift * 0.4;
    e.vy = (dy / d) * 90 + (dx / d) * drift * 0.4 + Math.cos(e.phaseTime * 2.2) * 30;
    e.x = clamp(e.x + e.vx * dt, FIELD.left, FIELD.right - e.w);
    e.y = clamp(e.y + e.vy * dt, FIELD.top, FIELD.bottom - e.h);
    e.dir4 = dir4FromVector(dx, dy);
    if (d < 300) {
      e.state = 'FLASH';
      e.stateTimer = 0.5;
    }
  } else if (e.state === 'FLASH') {
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.state = 'ATTACK';
      e.stateTimer = 0.25;
      e.burstLeft = 5;
      e.burstAngle = Math.atan2(dy, dx);
    }
  } else if (e.state === 'ATTACK') {
    e.stateTimer -= dt;
    if (e.burstLeft > 0) {
      e.burstLeft -= 1;
      const a = e.burstAngle + (e.burstLeft - 2) * 0.16;
      addEnemyBullet(cx, cy + 6, Math.cos(a) * 360, Math.sin(a) * 360, e.def.damage, 'shot');
    }
    if (e.stateTimer <= 0) {
      e.state = 'RECOVER';
      e.stateTimer = 1.6;
    }
  } else if (e.state === 'RECOVER') {
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) e.state = 'PATROL';
  }
}

function updateShield(e, dt, px, py) {
  const p = Game.player;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy) || 1;
  // 盾牌朝向（朝玩家单位向量），缓慢转身
  const targetA = Math.atan2(dy, dx);
  if (e.faceA == null) e.faceA = targetA;
  let diff = targetA - e.faceA;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  e.faceA += clamp(diff, -1.6 * dt, 1.6 * dt);
  e.faceV = { x: Math.cos(e.faceA), y: Math.sin(e.faceA) };
  e.dir4 = dir4FromVector(e.faceV.x, e.faceV.y);

  if (e.state === 'IDLE') e.state = 'CHASE';
  if (e.state === 'CHASE') {
    e.vx = (dx / d) * 70;
    e.vy = (dy / d) * 70;
    if (d < 90) {
      e.state = 'MELEE_WARN';
      e.stateTimer = 0.7;
      e.vx = 0; e.vy = 0;
    }
  } else if (e.state === 'MELEE_WARN') {
    e.vx = 0; e.vy = 0;
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.state = 'MELEE';
      e.stateTimer = 0.25;
      if (d < 100 && p && !p.dead) hurtPlayer(e.def.damage);
      addShake(4);
      burst(cx + e.faceV.x * 30, cy + e.faceV.y * 30, C.HEAT, 12, 200, 4);
    }
  } else if (e.state === 'MELEE') {
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.state = 'RECOVER';
      e.stateTimer = 1.0;
    }
  } else if (e.state === 'RECOVER') {
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) e.state = 'CHASE';
  }
  moveWithPhysics(e, dt, false);
}

