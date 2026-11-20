// leaderboard-panel.js — 余热突围拆分模块
// 标题页排行榜面板（仅前 10 名，不滚动）
const LeaderboardPanel = {
  open: false,
  loading: false,
  error: null,
  records: [],

  show() {
    if (this.open) return;
    this.open = true;
    this.error = null;
    this.records = [];
    if (typeof ProfileInput !== 'undefined') ProfileInput.hide();
    this.refresh();
  },

  hide() {
    this.open = false;
    if (Game.state === 'TITLE' && typeof ProfileInput !== 'undefined') ProfileInput.show();
  },

  async refresh() {
    this.loading = true;
    this.error = null;
    // 后台尝试补交失败记录，不阻塞面板加载
    LeaderboardClient.flushPending();
    try {
      this.records = await LeaderboardClient.top(10);
    } catch (e) {
      this.records = [];
      this.error = '排行榜暂不可用，请检查网络或 Netlify 服务';
    } finally {
      this.loading = false;
    }
  },

  update() {
    if (!this.open) return;
    if (Input.consumePress('Escape')) {
      this.hide();
      return;
    }
    if (Input.mouse.pressed) {
      for (const r of Game.uiRects) {
        if (!mouseIn(r)) continue;
        if (r.name === 'lb_close') { this.hide(); return; }
        if (r.name === 'lb_refresh') { this.refresh(); return; }
      }
    }
  },

  draw() {
    if (!this.open) return;
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,12,0.84)';
    ctx.fillRect(0, 0, W, H);
    drawPanel(200, 64, 880, 596, { cut: 16, stroke: C.CYAN });
    drawText('排行榜', 640, 106, 30, C.CYAN_LIGHT, 'center', 'bold');
    drawText('前 10 名 · 关卡越深 / 用时越短 / 剩余血量越高，排名越靠前', 640, 140, 12, C.TEXT_MUTED, 'center');

    const left = 240;
    const nameX = 310, timeX = 560, levelX = 700, ratingX = 1030;
    drawText('排名', left, 172, 13, C.TEXT_MUTED);
    drawText('玩家名称', nameX, 172, 13, C.TEXT_MUTED);
    drawText('游戏用时', timeX, 172, 13, C.TEXT_MUTED);
    drawText('最后关卡', levelX, 172, 13, C.TEXT_MUTED);
    drawText('评分', ratingX, 172, 13, C.TEXT_MUTED, 'right');
    ctx.strokeStyle = 'rgba(57,217,230,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(232, 186); ctx.lineTo(1048, 186);
    ctx.stroke();

    if (this.loading) {
      drawText('加载中…', 640, 350, 18, C.TEXT_MUTED, 'center');
    } else if (this.error) {
      drawText(this.error, 640, 350, 17, C.WARNING, 'center');
    } else if (!this.records.length) {
      drawText('暂无记录，完成一局后会出现在这里', 640, 350, 17, C.TEXT_MUTED, 'center');
    } else {
      const rowH = 34;
      for (let i = 0; i < this.records.length; i++) {
        const rec = this.records[i];
        const y = 214 + i * rowH;
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(57,217,230,0.045)';
          ctx.fillRect(228, y - 15, 820, rowH - 2);
        }
        drawText(String(i + 1), left, y, 15, i < 3 ? C.PERFECT : C.TEXT);
        drawText(String(rec.name || '匿名玩家').slice(0, 15), nameX, y, 14, C.TEXT);
        drawText(LeaderboardClient.durationText(rec.duration), timeX, y, 14, C.CYAN_LIGHT);
        drawText(rec.lastLevelLabel || '—', levelX, y, 14, C.TEXT_MUTED);
        drawMono(String(Math.round(rec.rating || 0)), ratingX, y, 15, C.PERFECT, 'right');
      }
    }

    drawButton('lb_refresh', '刷新', 540, 582, 120, 40, { size: 14 });
    drawButton('lb_close', '返回标题', 700, 582, 140, 40, { size: 14 });
    ctx.restore();
  }
};
