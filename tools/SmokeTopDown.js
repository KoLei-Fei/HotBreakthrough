// 俯视版冒烟测试：素材、开局射击、6 波升级链、Boss、胜利
// 输出截图到 D:/ClaudeWork/temp/hb-smoke/，不覆盖 preview/
const { spawn } = require('child_process');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/ClaudeWork/HotBreakthrough/index.html?debug=1';
const PORT = 9361;
const OUT_DIR = 'D:/ClaudeWork/temp/hb-smoke';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJson() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* retry */ }
    await sleep(250);
  }
  throw new Error('CDP 端口未就绪');
}
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = {};
    let nextId = 1;
    const events = [];
    ws.onopen = () => resolve({ send, onEvent: (fn) => events.push(fn) });
    ws.onerror = () => reject(new Error('ws error'));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending[msg.id]) {
        const p = pending[msg.id]; delete pending[msg.id];
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      } else if (msg.method) for (const fn of events) fn(msg);
    };
    function send(method, params) {
      return new Promise((res, rej) => {
        const id = nextId++;
        pending[id] = { resolve: res, reject: rej };
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }
  });
}
async function ev(send, expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('JS 异常: ' + JSON.stringify(r.exceptionDetails));
  return r.result ? r.result.value : undefined;
}
async function shot(send, name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT_DIR + '/' + name + '.png', Buffer.from(r.data, 'base64'));
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=D:/ClaudeWork/temp/edge-profile-smoke',
    '--window-size=1280,720', URL
  ], { stdio: 'ignore' });

  const errors = [];
  const results = {};
  const checks = [];
  const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
  try {
    const page = await waitJson();
    const c = await connect(page.webSocketDebuggerUrl);
    await c.send('Runtime.enable');
    c.onEvent((e) => {
      if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.text);
    });
    await sleep(300);
    for (let i = 0; i < 80; i++) {
      if (await ev(c.send, 'typeof window.__afterheatDebug !== "undefined"')) break;
      await sleep(250);
    }
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

    await ev(c.send, '__afterheatDebug.preloadAll()');
    let missingAssets = [];
    for (let i = 0; i < 60; i++) {
      missingAssets = await ev(c.send, '__afterheatDebug.missingAssets()');
      if (missingAssets.length === 0) break;
      await sleep(200);
    }
    results.missingAssets = missingAssets;
    check('素材全部加载', missingAssets.length === 0, missingAssets);

    await shot(c.send, '00_title');

    // 排行榜面板可打开
    await ev(c.send, '__afterheatDebug.openLeaderboard()');
    await sleep(300);
    await ev(c.send, '__afterheatDebug.step(1)');
    results.leaderboard = await ev(c.send, '__afterheatDebug.leaderboardState()');
    check('排行榜面板可打开', results.leaderboard.open === true, JSON.stringify(results.leaderboard));
    await ev(c.send, '__afterheatDebug.closeLeaderboard()');
    await ev(c.send, '__afterheatDebug.step(1)');

    // 拾取物：生命 +5 / 换枪 / 核弹清场
    await ev(c.send, "__afterheatDebug.setPlayerName('玩家123')");
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, '__afterheatDebug.Game.player.hp = 50');
    await ev(c.send, "__afterheatDebug.spawnPickupAt(60, -10, 'health')");
    await ev(c.send, '__afterheatDebug.step(24)');
    results.healthPickup = await ev(c.send, '__afterheatDebug.snapshot()');
    check('生命拾取 +5', results.healthPickup.hp === 55, 'hp=' + results.healthPickup.hp);
    check('玩家名称进入本局', results.healthPickup.playerName === '玩家123', results.healthPickup.playerName);
    await ev(c.send, "__afterheatDebug.spawnPickupAt(-60, -10, 'weapon', 'swarm')");
    await ev(c.send, '__afterheatDebug.step(24)');
    results.weaponPickup = await ev(c.send, '__afterheatDebug.snapshot()');
    check('武器拾取切换', results.weaponPickup.weapon === 'swarm', results.weaponPickup.weapon);
    await ev(c.send, "__afterheatDebug.spawnPickupAt(60, 20, 'health')");
    await ev(c.send, "__afterheatDebug.spawnPickupAt(-60, 20, 'weapon', 'rail')");
    await ev(c.send, "__afterheatDebug.spawnPickupAt(0, 90, 'nuke')");
    await ev(c.send, '__afterheatDebug.step(0)');
    await shot(c.send, '00b_pickups');
    await ev(c.send, '__afterheatDebug.step(24)');
    results.nuke = await ev(c.send, '__afterheatDebug.snapshot()');
    check('核弹清场', results.nuke.active === 0, 'active=' + results.nuke.active);
    check('清场闪白生效', (await ev(c.send, '__afterheatDebug.Game.flash')) > 0, 'flash');

    // 武器大招：能量满时按 Q 触发
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, '__afterheatDebug.Game.player.energy = 100');
    await ev(c.send, "__afterheatDebug.tapKey('q')");
    await ev(c.send, '__afterheatDebug.step(2)');
    results.ultPulse = await ev(c.send, '({ timer: __afterheatDebug.Game.player.ultTimer, energy: __afterheatDebug.Game.player.energy })');
    check('脉冲大招触发', results.ultPulse.timer > 0 && results.ultPulse.energy === 0, 'ultTimer=' + results.ultPulse.timer);
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, "__afterheatDebug.Game.weaponId = 'swarm'");
    await ev(c.send, '__afterheatDebug.Game.player.energy = 100');
    await ev(c.send, "__afterheatDebug.tapKey('q')");
    await ev(c.send, '__afterheatDebug.step(2)');
    const swarmBullets = await ev(c.send, '__afterheatDebug.Game.pBullets.length');
    check('蜂群大招生成散射弹', swarmBullets > 10, 'bullets=' + swarmBullets);
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, "__afterheatDebug.Game.weaponId = 'rail'");
    await ev(c.send, '__afterheatDebug.Game.player.energy = 100');
    await ev(c.send, "__afterheatDebug.tapKey('q')");
    await ev(c.send, '__afterheatDebug.step(2)');

    // 事件：补给商人消耗分数换升级
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, '__afterheatDebug.Game.score = 1000');
    await ev(c.send, "__afterheatDebug.forceEvent('shop')");
    await ev(c.send, '__afterheatDebug.step(0)');
    await shot(c.send, '08_shop_event');
    await ev(c.send, "(() => { const p = __afterheatDebug.Game.player, ev = __afterheatDebug.Game.events[0]; ev.x = p.x + 20; ev.y = p.y + p.h / 2; })()");
    await ev(c.send, '__afterheatDebug.step(20)');
    results.shopEvent = await ev(c.send, '({ score: __afterheatDebug.Game.score, upgrades: __afterheatDebug.Game.upgrades })');
    check('商店事件生效', results.shopEvent.score < 1000, 'score=' + results.shopEvent.score);

    // 事件：献祭祭坛扣血换升级
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, "__afterheatDebug.forceEvent('altar')");
    await ev(c.send, "(() => { const p = __afterheatDebug.Game.player, ev = __afterheatDebug.Game.events[0]; ev.x = p.x + 20; ev.y = p.y + p.h / 2; })()");
    await ev(c.send, '__afterheatDebug.step(20)');
    results.altarEvent = await ev(c.send, '({ hp: __afterheatDebug.Game.player.hp, upgrades: __afterheatDebug.Game.upgrades })');
    check('祭坛事件生效', results.altarEvent.hp < 100, 'hp=' + results.altarEvent.hp);

    // 怪物潮
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, '__afterheatDebug.forceHorde()');
    await ev(c.send, '__afterheatDebug.step(30)');
    await shot(c.send, '09_horde');
    results.horde = await ev(c.send, '({ active: !!__afterheatDebug.Game.horde, timer: __afterheatDebug.Game.horde ? __afterheatDebug.Game.horde.timer : 0 })');
    check('怪物潮事件生效', results.horde.active === true, JSON.stringify(results.horde));

    // 镜头跟随：把角色放到世界右缘，相机应向右侧移动
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(20)');
    await ev(c.send, '__afterheatDebug.Game.player.x = 2390');
    await ev(c.send, '__afterheatDebug.Game.player.y = 430');
    await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
    await ev(c.send, '__afterheatDebug.step(30)');
    const camX = await ev(c.send, '__afterheatDebug.Game.cam.x');
    check('镜头跟随到地图右缘', camX > 1100, 'cam.x=' + Math.round(camX));
    await shot(c.send, '07_camera_edge');

    // 重开，检查向左移动时的朝向帧（不应出现倒地帧）
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(30)');
    await ev(c.send, '__afterheatDebug.setKey("a", true)');
    await ev(c.send, '__afterheatDebug.step(40)');
    await ev(c.send, '__afterheatDebug.setKey("a", false)');
    await ev(c.send, '__afterheatDebug.step(2)');
    await shot(c.send, '05_left');
    await ev(c.send, '__afterheatDebug.Game.player.x = 1205');
    await ev(c.send, '__afterheatDebug.step(4)');
    await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
    const enemies = await ev(c.send, '__afterheatDebug.enemyPositions()');
    // 逐个敌人转向射击，避免首个目标恰好被掩体挡住导致误报
    for (const en of enemies.slice(0, 3)) {
      await ev(c.send, `__afterheatDebug.aimAt(${en.x}, ${en.y}, true)`);
      await ev(c.send, '__afterheatDebug.step(24)');
    }
    await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
    await ev(c.send, '__afterheatDebug.step(6)');
    results.afterFight = await ev(c.send, '__afterheatDebug.snapshot()');
    check('命中统计有效', results.afterFight.shotsHit > 0, results.afterFight.shotsHit + '/' + results.afterFight.shotsFired);
    await shot(c.send, '01_playing');

    // 逐波清场，验证 6 次升级与最终 Boss
    results.waves = [];
    let clearedAll = true;
    for (let wave = 1; wave <= 6; wave++) {
      if (wave === 6) {
        await ev(c.send, '__afterheatDebug.step(60)');
        await shot(c.send, '06_wave6');
      }
      let st = '';
      for (let k = 0; k < 100; k++) {
        await ev(c.send, '__afterheatDebug.killAll()');
        await ev(c.send, '__afterheatDebug.step(10)');
        st = await ev(c.send, '__afterheatDebug.Game.state');
        if (st === 'UPGRADE' || st === 'VICTORY' || st === 'DEFEAT') break;
      }
      if (st !== 'UPGRADE') { clearedAll = false; break; }
      const choices = await ev(c.send, '__afterheatDebug.Game.upgradeChoices');
      results.waves.push({ wave, choices });
      if (wave === 1) {
        // 固定三张卡，确保截图覆盖新生成的疾行靴/稳定枪托图标
        await ev(c.send, '__afterheatDebug.Game.upgradeChoices = ["swift_boots","stable_grip","rapid"]');
        await ev(c.send, '__afterheatDebug.step(0)');
        await shot(c.send, '02_upgrade');
      }
      await ev(c.send, '__afterheatDebug.pickUpgrade(0)');
      await ev(c.send, '__afterheatDebug.step(20)');
      if (wave === 3) await shot(c.send, '02b_purple_map');
    }
    check('6 波全部清场并进入升级', clearedAll && results.waves.length === 6, results.waves.length + ' waves');
    results.upgradeAudit = await ev(c.send, '__afterheatDebug.upgradeAudit()');
    check('升级等级不超过上限', results.upgradeAudit.every((u) => u.max >= 0 && u.level <= u.max), results.upgradeAudit);

    // Boss
    results.beforeBoss = await ev(c.send, '__afterheatDebug.snapshot()');
    check('第 6 波后进入 Boss', results.beforeBoss.boss !== null, results.beforeBoss.wavePhase);
    await ev(c.send, '__afterheatDebug.step(120)');
    await shot(c.send, '03_boss');

    // 装甲破坏
    await ev(c.send, '(() => { const b = __afterheatDebug.Game.boss; b.armor = 10; __afterheatDebug.hitBoss(20); })()');
    await ev(c.send, '__afterheatDebug.step(2)');
    results.armorBreak = await ev(c.send, '({ broken: __afterheatDebug.Game.boss.armorBroken, state: __afterheatDebug.Game.boss.state, core: __afterheatDebug.Game.boss.coreExposed })');
    check('Boss 装甲可破坏', results.armorBreak.broken === true, JSON.stringify(results.armorBreak));

    // 低血量处决窗口 + F 处决
    await ev(c.send, '(() => { const b = __afterheatDebug.Game.boss; b.armor = 0; b.hp = b.maxHp * 0.12 + 1; b.executionReady = false; b.executionUsed = false; b.state = "IDLE"; __afterheatDebug.hitBoss(3); })()');
    await ev(c.send, '__afterheatDebug.step(2)');
    results.execution = await ev(c.send, '({ ready: __afterheatDebug.Game.boss.executionReady, state: __afterheatDebug.Game.boss.state, timer: __afterheatDebug.Game.boss.executionTimer })');
    check('Boss 进入处决窗口', results.execution.ready === true, JSON.stringify(results.execution));
    await ev(c.send, '(() => { const b = __afterheatDebug.Game.boss; const p = __afterheatDebug.Game.player; p.x = b.x - 90; p.y = b.y + b.h / 2 - p.h / 2; })()');
    await ev(c.send, "__afterheatDebug.tapKey('f')");
    await ev(c.send, '__afterheatDebug.step(2)');
    results.victory = await ev(c.send, '__afterheatDebug.snapshot()');
    check('F 处决进入 VICTORY', results.victory.state === 'VICTORY', results.victory.state);
    await shot(c.send, '04_victory');

    results.errors = errors;
    check('无运行时异常', errors.length === 0, errors);
    console.log(JSON.stringify({ results, checks }, null, 2));
    if (checks.some((x) => !x.ok)) process.exitCode = 1;
  } catch (e) {
    console.log('TEST_FAIL ' + e.message);
    console.log(JSON.stringify({ results, checks, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    child.kill();
  }
})();
