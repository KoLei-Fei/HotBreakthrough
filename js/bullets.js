// bullets.js — 余热突围拆分模块
// ===== 子弹 =====
function addPlayerBullet(opts) {
  const b = {
    x: opts.x, y: opts.y,
    vx: opts.vx, vy: opts.vy,
    r: opts.r || 4,
    damage: opts.damage,
    source: opts.source || 'BULLET',
    traveled: 0,
    maxRange: opts.maxRange || 1200,
    pierceLeft: opts.pierceLeft || 0,
    bounceLeft: opts.bounceLeft || 0,
    hitSet: new Set(),
    hitDamageMul: 1,
    life: opts.life || 2.5,
    color: opts.color || C.CYAN_LIGHT,
    trail: [],
    crit: !!opts.crit,
    shot: opts.shot || null
  };
  Game.pBullets.push(b);
  return b;
}
function addEnemyBullet(x, y, vx, vy, damage, kind) {
  const mul = Game.mode === 'hard' ? CONFIG.hardMode.bulletSpeedMul : 1;
  Game.eBullets.push({
    x, y, vx: vx * mul, vy: vy * mul,
    r: kind === 'bomb' ? 10 : 6,
    damage, kind: kind || 'shot', life: 6, maxLife: 6,
    groundTimer: 0, warn: kind === 'bomb'
  });
}

// ===== 伤害计算 =====
function comboMultiplier() {
  return 1 + CONFIG.combo.perStack * Math.min(Game.combo, CONFIG.combo.maxStacks);
}

function markShotHit(ref) {
  if (ref && !ref.hit) {
    ref.hit = true;
    Game.shotsHit += 1;
  }
}

function computeBulletDamage(preFireHeat) {
  const w = CONFIG.weapons[Game.weaponId];
  let mul = 1;
  if (preFireHeat >= CONFIG.heat.highDamageThreshold) mul *= CONFIG.heat.highDamageMul;
  const critChance = 0.1 * (Game.upgrades.crit || 0);
  const isCrit = critChance > 0 && rnd() < critChance;
  if (isCrit) mul *= 1.75;
  return { damage: w.damage * mul, crit: isCrit };
}

function sourceDirFromBullet(b) {
  const len = Math.hypot(b.vx, b.vy) || 1;
  return { x: b.vx / len, y: b.vy / len };
}

function damageEnemy(e, amount, source, dir, opts) {
  if (!e.alive) return;
  if (e.isBoss) { damageBoss(amount, opts); return; }
  if (e.spawnProtect) return;
  const o = opts || {};
  let dmg = amount;
  if (e.type === 'shield' && !o.ignoreShield && dir && e.faceV) {
    // 攻击来源方向与盾正面点积为正则视为正面命中
    const fromX = -dir.x, fromY = -dir.y;
    if (fromX * e.faceV.x + fromY * e.faceV.y > 0.3) {
      dmg *= 0.25;
      e.shieldFlash = 0.18;
    }
  }
  e.hp -= dmg;
  e.hitFlash = 0.1;
  const fCol = o.crit ? C.PERFECT : (dmg >= 60 ? C.CYAN_LIGHT : (dmg >= 25 ? C.WARNING : C.TEXT));
  const fSize = o.crit ? 24 : (dmg >= 60 ? 21 : (dmg >= 25 ? 18 : 16));
  addFloater(e.x + e.w / 2, e.y - 6, Math.round(dmg), fCol, fSize);
  if (o.crit) {
    Game.hitStop = Math.max(Game.hitStop, 0.045);
    burst(e.x + e.w / 2, e.y + e.h / 2, C.PERFECT, 10, 220, 3);
  }
  if (e.hp <= 0) killEnemy(e, source);
}

function killEnemy(e, source) {
  if (!e.alive) return;
  e.alive = false;
  e.state = 'DEAD';
  e.deadTimer = 0.45;
  Game.combo += 1;
  Game.comboTimer = CONFIG.combo.window;
  Game.maxCombo = Math.max(Game.maxCombo, Game.combo);
  const pl = Game.player;
  if (pl && pl.energy < 100) {
    pl.energy = Math.min(100, pl.energy + 8);
    if (pl.energy >= 100) addFloater(pl.x + pl.w / 2, pl.y - 26, '大招就绪 Q', C.PERFECT, 20);
  }
  const gained = Math.round(e.score * comboMultiplier());
  Game.score += gained;
  Game.killFeed.push({ text: (e.elite ? '精英 ' : '') + e.def.name + '  +' + gained, color: e.elite ? C.PERFECT : e.def.color, life: 2.5 });
  if (Game.killFeed.length > 5) Game.killFeed.shift();
  addFloater(e.x + e.w / 2, e.y - 12, '+' + gained, C.PERFECT, 18);
  burst(e.x + e.w / 2, e.y + e.h / 2, e.def.color, 16, 220, 4);
  Sfx.play('kill');
  if (source !== 'NUKE') {
    if (e.elite) {
      spawnPickup({ x: e.x + e.w / 2, y: e.y + e.h / 2 }, 'chest');
    } else {
      rollDrop(e);
    }
  }
  if (Game.combo > 0 && Game.combo % 5 === 0) {
    addFloater(e.x + e.w / 2, e.y - 38, Game.combo + ' 连击', C.PERFECT, 20);
    addShake(2);
  }
}

function applyBurn(e, duration) {
  e.burn = Math.max(e.burn, duration);
  e.burnTick = 0;
}

// ===== 子弹更新 =====
function updatePlayerBullets(dt) {
  const p = Game.player;
  for (let i = Game.pBullets.length - 1; i >= 0; i--) {
    const b = Game.pBullets[i];
    const stepX = b.vx * dt, stepY = b.vy * dt;
    b.x += stepX; b.y += stepY;
    b.traveled += Math.hypot(stepX, stepY);
    b.life -= dt;
    if (b.trail) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
    }

    let remove = false;
    if (b.life <= 0 || b.traveled >= b.maxRange || b.x < FIELD.left - 40 || b.x > FIELD.right + 40 || b.y < FIELD.top - 40 || b.y > FIELD.bottom + 40) {
      remove = true;
    }
    if (!remove && pointHitsObstacle(b.x, b.y)) {
      burst(b.x, b.y, C.CYAN, 4, 80, 2);
      remove = true;
    }

    if (!remove) {
      for (const e of Game.enemies) {
        if (!e.alive) continue;
        if (b.hitSet.has(e)) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
        if (dist(b.x, b.y, ex, ey) <= Math.max(e.w, e.h) * 0.52 + b.r) {
          const dir = sourceDirFromBullet(b);
          damageEnemy(e, b.damage, b.source, dir, { crit: b.crit });
          b.hitSet.add(e);
          markShotHit(b.shot);
          burst(b.x, b.y, C.CYAN_LIGHT, 6, 120, 2);

          if (b.bounceLeft > 0) {
            b.bounceLeft -= 1;
            b.damage *= 0.6;
            b.source = 'BOUNCE';
            const next = b.bounceLeft > 0 ? nearestUnhitEnemy(b, b.hitSet) : null;
            if (next) {
              const nx = next.x + next.w / 2, ny = next.y + next.h / 2;
              const ang = Math.atan2(ny - b.y, nx - b.x);
              const sp = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(ang) * sp;
              b.vy = Math.sin(ang) * sp;
              b.traveled = 0;
              b.life = Math.min(b.life, 1.2);
            } else {
              remove = true;
            }
          } else if (b.pierceLeft > 0) {
            b.pierceLeft -= 1;
            b.damage *= 0.7;
          } else {
            remove = true;
          }
          break;
        }
      }
    }

    if (remove) Game.pBullets.splice(i, 1);
  }
}

function nearestUnhitEnemy(b, hitSet) {
  let best = null, bestD = 260;
  for (const e of Game.enemies) {
    if (!e.alive || hitSet.has(e)) continue;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    const d = dist(b.x, b.y, ex, ey);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function updateEnemyBullets(dt) {
  const p = Game.player;
  for (let i = Game.eBullets.length - 1; i >= 0; i--) {
    const b = Game.eBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (pointHitsObstacle(b.x, b.y)) {
      burst(b.x, b.y, C.TEXT_MUTED, 4, 80, 2);
      Game.eBullets.splice(i, 1);
      continue;
    }
    if (b.life <= 0 || b.x < FIELD.left - 20 || b.x > FIELD.right + 20 || b.y < FIELD.top - 20 || b.y > FIELD.bottom + 20) {
      Game.eBullets.splice(i, 1);
      continue;
    }
    if (p && !p.dead && p.invuln <= 0 && (p.invulnDash || 0) <= 0) {
      if (dist(b.x, b.y, p.x + p.w / 2, p.y + p.h / 2) <= 14 + b.r) {
        hurtPlayer(b.damage);
        Game.eBullets.splice(i, 1);
      }
    }
  }
}

function hurtPlayer(dmg) {
  const p = Game.player;
  if (!p || p.dead) return;
  if (p.invuln > 0) return;
  if ((p.invulnDash || 0) > 0 && p.dashTimer > 0) return;
  p.hp -= dmg;
  p.invuln = CONFIG.player.invulnTime;
  Game.combo = 0;
  Game.comboTimer = 0;
  Sfx.play('hurt');
  addShake(5);
  addFloater(p.x + p.w / 2, p.y - 10, '-' + dmg, C.DANGER, 16);
  burst(p.x + p.w / 2, p.y + p.h / 2, C.DANGER, 10, 160, 3);
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    Game.state = 'DEFEAT';
    finalizeRun(false);
  }
}

// ===== 范围轰炸（落点预警 → 爆炸） =====
function addBlast(x, y, radius, timer, damage, color) {
  Game.blasts.push({ x, y, r: radius, timer, maxTimer: timer, damage, color: color || C.WARNING });
}
function updateBlasts(dt) {
  const p = Game.player;
  for (let i = Game.blasts.length - 1; i >= 0; i--) {
    const b = Game.blasts[i];
    b.timer -= dt;
    if (b.timer <= 0) {
      burst(b.x, b.y, b.color, 18, 240, 5);
      addShake(4);
      Sfx.play('kill');
      if (p && !p.dead && p.invuln <= 0 && (p.invulnDash || 0) <= 0) {
        if (dist(b.x, b.y, p.x + p.w / 2, p.y + p.h / 2) <= b.r) hurtPlayer(b.damage);
      }
      Game.blasts.splice(i, 1);
    }
  }
}

function updateBomber(e, dt, px, py) {
  const p = Game.player;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy) || 1;
  e.dir4 = dir4FromVector(dx, dy);
  if (e.state === 'IDLE') e.state = 'CHASE';
  if (e.state === 'CHASE') {
    if (d > 420) { e.vx = (dx / d) * 80; e.vy = (dy / d) * 80; }
    else if (d < 260) { e.vx = -(dx / d) * 70; e.vy = -(dy / d) * 70; }
    else { e.vx = 0; e.vy = 0; }
    if (d < 520) {
      e.state = 'THROW_WARN';
      e.stateTimer = 0.5;
    }
  } else if (e.state === 'THROW_WARN') {
    e.vx = 0; e.vy = 0;
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.state = 'RECOVER';
      e.stateTimer = 1.8;
      const tx = px + rndRange(-70, 70);
      const ty = py + rndRange(-70, 70);
      addBlast(tx, ty, 62, 0.9, e.def.damage, C.WARNING);
    }
  } else if (e.state === 'RECOVER') {
    e.vx = 0; e.vy = 0;
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) e.state = 'CHASE';
  }
  moveWithPhysics(e, dt, false);
}

