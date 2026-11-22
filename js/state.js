// state.js — 余热突围拆分模块
// ===== 游戏状态 =====
const Game = {
  state: 'TITLE',
  prevState: null,
  mode: 'normal',
  weaponId: 'pulse',
  playerName: '匿名玩家',
  runStartAt: 0,
  runEndAt: 0,
  seedText: '',
  rng: null,
  time: 0,
  wave: 0,
  score: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  shotsFired: 0,
  shotsHit: 0,
  perfectVents: 0,
  overheatCount: 0,
  player: null,
  enemies: [],
  pBullets: [],
  eBullets: [],
  particles: [],
  floaters: [],
  boss: null,
  pendingSpawn: [],
  upgrades: {},
  wavePhase: 'fighting', // fighting | cleared | boss | victory
  shake: 0,
  hitStop: 0,
  upgradeChoices: [],
  upgradeHadBehavioral: false,
  upgradeSelections: 0,
  ui: { hover: null, pressed: null, hintTimer: 0, hintText: '' },
  banner: null,
  platforms: [],
  map: null,
  obstacles: [],
  decor: [],
  blasts: [],
  bossIntroTimer: 0,
  lastResult: null,
  newRecordFlags: {},
  cam: { x: 0, y: 0 },
  pickups: [],
  events: [],
  killFeed: [],
  horde: null,
  slowMo: 0,
  flash: 0,
  dropDry: 0
};

// ===== 相机 =====
function snapCamera() {
  const p = Game.player;
  if (!p) { Game.cam.x = 0; Game.cam.y = 0; return; }
  const vw = VIEW.w / CAMERA_ZOOM, vh = VIEW.h / CAMERA_ZOOM;
  Game.cam.x = clamp(p.x + p.w / 2 - vw / 2, 0, FIELD.right - vw);
  Game.cam.y = clamp(p.y + p.h / 2 - vh / 2, 0, FIELD.bottom - vh);
}

function updateCamera(dt) {
  const p = Game.player;
  if (!p) return;
  const vw = VIEW.w / CAMERA_ZOOM, vh = VIEW.h / CAMERA_ZOOM;
  const px = p.x + p.w / 2, py = p.y + p.h / 2;
  let tx = Game.cam.x, ty = Game.cam.y;
  if (Game.bossIntroTimer > 0 && Game.boss && Game.boss.alive) {
    const b = Game.boss;
    const mx = (px + b.x + b.w / 2) / 2, my = (py + b.y + b.h / 2) / 2;
    tx = clamp(mx - vw / 2, 0, FIELD.right - vw);
    ty = clamp(my - vh / 2, 0, FIELD.bottom - vh);
    const kk = 1 - Math.pow(0.0008, dt);
    Game.cam.x = lerp(Game.cam.x, tx, kk);
    Game.cam.y = lerp(Game.cam.y, ty, kk);
    return;
  }
  // 中央死区，角色接近视口边缘时镜头才跟进（按屏幕像素判断）
  const screenX = (px - Game.cam.x) * CAMERA_ZOOM;
  const screenY = (py - Game.cam.y) * CAMERA_ZOOM;
  if (screenX < VIEW.w * 0.32) tx = px - (VIEW.w * 0.32) / CAMERA_ZOOM;
  else if (screenX > VIEW.w * 0.68) tx = px - (VIEW.w * 0.68) / CAMERA_ZOOM;
  if (screenY < VIEW.h * 0.30) ty = py - (VIEW.h * 0.30) / CAMERA_ZOOM;
  else if (screenY > VIEW.h * 0.70) ty = py - (VIEW.h * 0.70) / CAMERA_ZOOM;
  tx = clamp(tx, 0, FIELD.right - vw);
  ty = clamp(ty, 0, FIELD.bottom - vh);
  const k = 1 - Math.pow(0.0015, dt);
  Game.cam.x = clamp(lerp(Game.cam.x, tx, k), 0, FIELD.right - vw);
  Game.cam.y = clamp(lerp(Game.cam.y, ty, k), 0, FIELD.bottom - vh);
}

