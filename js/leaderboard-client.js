// leaderboard-client.js — 余热突围拆分模块
// 唯一负责排行榜 HTTP 请求的模块；不要在其他文件里直接写 fetch。
const LeaderboardClient = {
  API: '/api/records',
  PENDING_KEY: 'afterheat_pending_records',
  MAX_PENDING: 20,

  formatDateTime(ms) {
    const d = new Date(ms);
    const p = (n) => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  },

  durationText(sec) {
    return fmtTime(Math.max(0, Number(sec) || 0));
  },

  async request(url, opts, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 8000);
    try {
      const res = await fetch(url, Object.assign({ signal: controller.signal }, opts || {}));
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
      if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
      return data;
    } finally {
      clearTimeout(timer);
    }
  },

  queuePending(record) {
    try {
      const raw = localStorage.getItem(this.PENDING_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.push(record);
      while (list.length > this.MAX_PENDING) list.shift();
      localStorage.setItem(this.PENDING_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  },

  takePending() {
    try {
      const raw = localStorage.getItem(this.PENDING_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  clearPending() {
    try { localStorage.removeItem(this.PENDING_KEY); } catch (e) { /* ignore */ }
  },

  async submitRun(record) {
    try {
      await this.request(this.API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }, 8000);
      return true;
    } catch (e) {
      this.queuePending(record);
      return false;
    }
  },

  async flushPending() {
    const list = this.takePending();
    if (!list.length) return;
    const remain = [];
    for (const record of list) {
      try {
        await this.request(this.API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        }, 8000);
      } catch (e) {
        remain.push(record);
      }
    }
    try {
      if (remain.length) localStorage.setItem(this.PENDING_KEY, JSON.stringify(remain));
      else localStorage.removeItem(this.PENDING_KEY);
    } catch (e) { /* ignore */ }
  },

  async top(limit) {
    const data = await this.request(this.API + '?limit=' + (limit || 10), {}, 8000);
    return (data && data.records) || [];
  }
};
