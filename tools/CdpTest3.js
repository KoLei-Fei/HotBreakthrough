// 第三轮：热量边界 / 泄压区间 / 过热 / 升级上限 / 12 升级全授予
const { spawn } = require('child_process');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/ClaudeWork/HotBreakthrough/index.html';
const PORT = 9335;
const OUT_DIR = 'D:/ClaudeWork/temp/shots3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJson() {
  for (let i = 0; i < 60; i++) {
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
    '--user-data-dir=D:/ClaudeWork/temp/edge-profile-test3',
    '--window-size=1280,720', URL + '?debug=1'
  ], { stdio: 'ignore' });

  const errors = [];
  const results = {};
  try {
    const page = await waitJson();
    const c = await connect(page.webSocketDebuggerUrl);
    await c.send('Runtime.enable');
    c.onEvent((e) => {
      if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.text);
    });
    await sleep(300);
    for (let i = 0; i < 60; i++) {
      if (await ev(c.send, 'typeof window.__afterheatDebug !== "undefined"')) break;
      await sleep(250);
    }

    // 热量边界
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(60)');
    results.heatBoundaries = [];
    for (const v of [19, 59, 70, 86, 99, 100]) {
      const r = await ev(c.send, `(() => {
        const g = __afterheatDebug.Game;
        __afterheatDebug.setHeat(${v});
        g.perfectVents = 0;
        const before = { heat: g.player.heat };
        __afterheatDebug.tapKey('r');
        __afterheatDebug.step(1);
        return { input: ${v}, heatAfter: g.player.heat, perfect: g.perfectVents, ventStop: g.player.ventStop, overheated: g.player.overheated };
      })()`);
      results.heatBoundaries.push(r);
    }

    // 过热：积满 100 触发
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(60)');
    await ev(c.send, '__afterheatDebug.setHeat(96)');
    await ev(c.send, '__afterheatDebug.setMouse(640, 200, true)');
    await ev(c.send, '__afterheatDebug.step(3)');
    await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
    results.overheat = await ev(c.send, `(() => {
      const g = __afterheatDebug.Game;
      const during = { overheated: g.player.overheated, overheatCount: g.overheatCount };
      __afterheatDebug.step(100);
      return { during, afterHeat: g.player.heat, afterOverheat: g.player.overheated };
    })()`);
    await shot(c.send, '01_overheat');

    // 升级上限与扩展安全阀
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(60)');
    await ev(c.send, "__afterheatDebug.grantUpgrade('valve')");
    results.valveVent = [];
    for (const v of [49, 50, 90, 91]) {
      const r = await ev(c.send, `(() => {
        const g = __afterheatDebug.Game;
        __afterheatDebug.setHeat(${v});
        g.perfectVents = 0;
        __afterheatDebug.tapKey('r');
        __afterheatDebug.step(1);
        return { input: ${v}, perfect: g.perfectVents };
      })()`);
      results.valveVent.push(r);
    }
    // dash_cd 叠层
    await ev(c.send, "__afterheatDebug.grantUpgrade('dash_cd'); __afterheatDebug.grantUpgrade('dash_cd')");
    results.dashCd = await ev(c.send, '(() => { const g=__afterheatDebug.Game; g.player.dashCooldown = 1.5 * Math.pow(0.8, g.upgrades.dash_cd); return g.player.dashCooldown; })()');
    results.capped = await ev(c.send, `(() => {
      const g = __afterheatDebug.Game;
      ['valve','burn','double_jump','pierce'].forEach(id => __afterheatDebug.grantUpgrade(id));
      ['valve','burn','double_jump','pierce'].forEach(id => __afterheatDebug.grantUpgrade(id));
      return g.upgrades;
    })()`);

    // 12 升级全授予后游玩
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(60)');
    await ev(c.send, `['valve','vent_burst','vent_burst','burn','dash_hit','dash_cd','dash_cd','dash_echo','double_jump','air_damage','rapid','rapid','crit','crit','bounce','bounce','pierce'].forEach(id=>__afterheatDebug.grantUpgrade(id))`);
    await ev(c.send, '__afterheatDebug.setMouse(640, 360, true)');
    await ev(c.send, '__afterheatDebug.step(120)');
    await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
    await ev(c.send, "__afterheatDebug.setKey('Shift', true); __afterheatDebug.step(20); __afterheatDebug.setKey('Shift', false);");
    await ev(c.send, '__afterheatDebug.step(60)');
    results.allUpgrades = await ev(c.send, '__afterheatDebug.snapshot()');
    await shot(c.send, '02_all_upgrades');

    results.errors = errors;
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.log('TEST_FAIL ' + e.message);
    console.log(JSON.stringify({ results, errors }, null, 2));
  } finally {
    child.kill();
  }
})();
