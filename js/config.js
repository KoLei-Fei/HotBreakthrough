// config.js — 余热突围拆分模块

// ===== 基础常量与配置 =====
const W = 1280, H = 720;
const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.05;

const C = {
  BG_DEEP: '#241a2e', BG_PANEL: '#2e2338',
  CYAN: '#5ad2c8', CYAN_LIGHT: '#a8f0e6',
  HEAT: '#ff9a3c', PERFECT: '#FFD166',
  DANGER: '#ff5555', WARNING: '#ff7849',
  TEXT: '#f5ece0', TEXT_MUTED: '#b8a898',
  SAND: '#e0a878', SAND_DARK: '#c98d5f'
};

const CONFIG = {
  player: {
    maxHp: 100, moveSpeed: 360, jumpVelocity: -760, gravity: 2000,
    invulnTime: 0.8, waveHeal: 12,
    dashDuration: 0.22, dashImmunity: 0.18, dashCooldown: 1.5,
    w: 30, h: 30
  },
  heat: {
    max: 100, decayDelay: 0.35, decayRate: 18,
    highDamageThreshold: 60, highDamageMul: 1.2,
    perfectMin: 60, perfectMax: 85,
    ventStopTime: 0.75,
    perfectDamage: 30, perfectRadius: 140,
    overheatLock: 1.5, overheatEndHeat: 35,
    valvePerfectMin: 50, valvePerfectMax: 90
  },
  weapons: {
    pulse: { id: 'pulse', name: '脉冲步枪', damage: 12, fireRate: 7, heat: 9, type: 'projectile', speed: 1150 },
    swarm: { id: 'swarm', name: '蜂群霰弹枪', damage: 7, fireRate: 1.4, heat: 20, type: 'projectile', speed: 900, pellets: 8, range: 400, spread: 0.34 },
    rail: { id: 'rail', name: '磁轨枪', damage: 80, fireRate: 0.9, heat: 20, type: 'instant', pierce: 4, range: 1400 }
  },
  enemies: {
    charger: { id: 'charger', name: '冲锋者', hp: 28, damage: 12, score: 100, w: 34, h: 44, color: C.WARNING },
    gunner: { id: 'gunner', name: '瞄准枪手', hp: 55, damage: 10, score: 160, w: 34, h: 48, color: C.DANGER },
    drone: { id: 'drone', name: '浮空无人机', hp: 35, damage: 8, score: 140, w: 36, h: 30, color: C.CYAN },
    shield: { id: 'shield', name: '盾兵', hp: 110, damage: 18, score: 240, w: 42, h: 54, color: C.HEAT },
    bomber: { id: 'bomber', name: '投掷兵', hp: 65, damage: 16, score: 200, w: 34, h: 46, color: C.WARNING }
  },
  boss: {
    hp: 3200, armor: 800, chargeDamage: 20, spreadDamage: 12, bombDamage: 18,
    w: 210, h: 170, score: 3000,
    stage2At: 0.70, stage3At: 0.35,
    coreExposeTime: 1.0, summonCount: 2
  },
  waves: [
    { charger: 6 },
    { charger: 7, gunner: 3 },
    { charger: 8, gunner: 3, drone: 4 },
    { charger: 9, shield: 3, drone: 4 },
    { charger: 8, gunner: 4, drone: 3, bomber: 3 },
    { charger: 9, shield: 3, gunner: 4, drone: 4, bomber: 3 }
  ],
  maxActiveEnemies: 10,
  hardMode: { hpMul: 1.3, bulletSpeedMul: 1.2, scoreMul: 1.5 },
  combo: { window: 4.0, maxStacks: 20, perStack: 0.1, maxMul: 3 },
  pickup: {
    healthChance: 0.06, weaponChance: 0.04, nukeChance: 0.005,
    magnetRange: 135, collectRange: 26, life: 28,
    healthAmount: 5, dryLimit: 14
  }
};

const UPGRADE_DEFS = {
  valve:        { id: 'valve', route: 'vent', name: '扩展安全阀', max: 1, behavioral: true, desc: '完美泄压窗口改为 50—90' },
  vent_burst:   { id: 'vent_burst', route: 'vent', name: '爆裂泄压', max: 2, behavioral: true, desc: '每层完美泄压伤害 +20、半径 +25' },
  burn:         { id: 'burn', route: 'vent', name: '灼热余波', max: 1, behavioral: true, desc: '完美泄压附加灼烧 10 点/秒，持续 3 秒' },
  dash_hit:     { id: 'dash_hit', route: 'dash', name: '相位冲锋', max: 1, behavioral: true, desc: '冲刺造成 35 点伤害' },
  dash_cd:      { id: 'dash_cd', route: 'dash', name: '冲刺电容', max: 2, behavioral: false, desc: '每层冲刺冷却 ×0.8' },
  dash_echo:    { id: 'dash_echo', route: 'dash', name: '冲刺回响', max: 1, behavioral: true, desc: '冲刺后 2 秒内下次射击增加两枚副弹' },
  swift_boots:  { id: 'swift_boots', route: 'mobility', name: '疾行靴', max: 2, behavioral: false, desc: '每层移动速度 +12%' },
  stable_grip:  { id: 'stable_grip', route: 'gun', name: '稳定枪托', max: 1, behavioral: false, desc: '开火热量积累 −20%' },
  rapid:        { id: 'rapid', route: 'gun', name: '快速枪机', max: 2, behavioral: false, desc: '每层射速 +12%' },
  crit:         { id: 'crit', route: 'gun', name: '暴击核心', max: 2, behavioral: false, desc: '每层暴击率 +10%，暴击 ×1.75' },
  bounce:       { id: 'bounce', route: 'gun', name: '弹射弹头', max: 2, behavioral: true, desc: '每层增加一次弹射，后续伤害 60%' },
  pierce:       { id: 'pierce', route: 'gun', name: '贯穿枪芯', max: 1, behavioral: true, desc: '普通子弹额外贯穿一个目标' }
};

