// 第二轮：命中、泄压、升级流转、暂停、Boss 胜利、困难模式
const { spawn } = require('child_process');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/ClaudeWork/HotBreakthrough/index.html';
const PORT = 9334;
const OUT_DIR = 'D:/ClaudeWork/temp/shots2';

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
    ws.onopen = () => resolve({ send, onEvent: (fn) => events.push(fn), close: () => ws.close() });
    ws.onerror = () => reject(new Error('ws error'));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending[msg.id]) {
        const p = pending[msg.id]; delete pending[msg.id];
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      } else if (msg.method) {
        for (const fn of events) fn(msg);
      }
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
  const p = OUT_DIR + '/' + name + '.png';
  fs.writeFileSync(p, Buffer.from(r.data, 'base64'));
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=D:/ClaudeWork/temp/edge-profile-test2',
    '--window-size=1280,720', URL + '?debug=1'
  ], { stdio: 'ignore' });

  const errors = [];
  const results = {};
  try {
    const page = await waitJson();
    const c = await connect(page.webSocketDebuggerUrl);
    await c.send('Runtime.enable');
    await c.send('Page.enable');
    c.onEvent((e) => {
      if (e.method === 'Runtime.exceptionThrown') {
        errors.push(e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || ''));
      }
    });
    await sleep(400);

    // 等待页面脚本加载完成
    for (let i = 0; i < 60; i++) {
      const ready = await ev(c.send, 'typeof window.__afterheatDebug !== "undefined"');
      if (ready) break;
      await sleep(250);
    }

    // 命中测试
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(60)');
    const enemies = await ev(c.send, '__afterheatDebug.enemyPositions()');
    results.enemiesBefore = enemies;
    if (enemies.length) {
      const t = enemies[0];
      await ev(c.send, `__afterheatDebug.setMouse(${t.x}, ${t.y}, true)`);
      await ev(c.send, '__afterheatDebug.step(50)');
      await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
      await ev(c.send, '__afterheatDebug.step(30)');
    }
    results.hitTest = await ev(c.send, '__afterheatDebug.snapshot()');
    await shot(c.send, '01_hit');

    // 泄压测试
    await ev(c.send, '__afterheatDebug.setHeat(70)');
    await ev(c.send, "__afterheatDebug.tapKey('r')");
    await ev(c.send, '__afterheatDebug.step(2)');
    results.ventTest = await ev(c.send, '__afterheatDebug.snapshot()');
    await shot(c.send, '02_vent');

    // 清波 -> 升级 -> 选第 1 项 -> 下一波
    await ev(c.send, '__afterheatDebug.killAll()');
    await ev(c.send, '__afterheatDebug.step(12)');
    results.upgradeState = await ev(c.send, '__afterheatDebug.snapshot()');
    results.choices = await ev(c.send, '__afterheatDebug.Game.upgradeChoices');
    await shot(c.send, '03_upgrade');
    await ev(c.send, "__afterheatDebug.tapKey('1')");
    await ev(c.send, '__afterheatDebug.step(3)');
    results.afterUpgrade = await ev(c.send, '__afterheatDebug.snapshot()');

    // 暂停
    await ev(c.send, "__afterheatDebug.tapKey('Escape')");
    await ev(c.send, '__afterheatDebug.step(2)');
    results.pauseState = await ev(c.send, '__afterheatDebug.snapshot()');
    await shot(c.send, '04_pause');
    await ev(c.send, "__afterheatDebug.tapKey('Escape')");
    await ev(c.send, '__afterheatDebug.step(2)');
    results.resumeState = await ev(c.send, '__afterheatDebug.state || __afterheatDebug.snapshot().state');

    // Boss 胜利
    await ev(c.send, "__afterheatDebug.start('pulse')");
    await ev(c.send, '__afterheatDebug.step(10)');
    await ev(c.send, '__afterheatDebug.startBoss()');
    await ev(c.send, '__afterheatDebug.step(40)');
    await ev(c.send, '__afterheatDebug.hitBoss(2800)');
    await ev(c.send, '__afterheatDebug.step(5)');
    results.victory = await ev(c.send, '__afterheatDebug.snapshot()');
    await shot(c.send, '05_victory');

    // 困难模式
    await ev(c.send, "__afterheatDebug.start('rail', 'hard')");
    await ev(c.send, '__afterheatDebug.step(30)');
    results.hard = await ev(c.send, '__afterheatDebug.snapshot()');

    // 三武器射击
    results.weapons = {};
    for (const w of ['pulse', 'swarm', 'rail']) {
      await ev(c.send, `__afterheatDebug.start('${w}', 'normal')`);
      await ev(c.send, '__afterheatDebug.step(20)');
      await ev(c.send, '__afterheatDebug.setMouse(640, 300, true)');
      await ev(c.send, '__afterheatDebug.step(20)');
      await ev(c.send, '__afterheatDebug.setMouse(640, 360, false)');
      results.weapons[w] = await ev(c.send, '__afterheatDebug.snapshot()');
    }
    await shot(c.send, '06_rail');

    results.errors = errors;
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.log('TEST_FAIL ' + e.message);
    console.log(JSON.stringify({ results, errors }, null, 2));
  } finally {
    child.kill();
  }
})();
