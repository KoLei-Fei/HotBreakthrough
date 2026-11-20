// 排行榜评分与校验（纯函数，便于本地测试）
const NAME_MAX = 15;
const NAME_RE = /[0-9A-Za-z㐀-䶿一-鿿]/;

function sanitizeName(value) {
  const clean = Array.from(String(value || ''))
    .filter((ch) => NAME_RE.test(ch))
    .slice(0, NAME_MAX)
    .join('');
  return clean || '匿名玩家';
}

function stageRank(record) {
  if (record.win) return 8;
  return record.lastStage >= 7 ? 7 : record.lastStage;
}

function levelLabel(record) {
  if (record.win) return '通关';
  if (record.lastStage >= 7) return 'Boss';
  return '第' + record.lastStage + '波';
}

function hpRatio(record) {
  const maxHp = Math.max(1, Number(record.maxHp) || 100);
  return Math.max(0, Math.min(1, (Number(record.remainingHp) || 0) / maxHp));
}

function computeRating(record) {
  const rank = stageRank(record);
  const timeScore = Math.max(0, 3600 - record.duration) * 10;
  const hpScore = Math.round(hpRatio(record) * 1000);
  return rank * 100000 + Math.round(timeScore) + hpScore;
}

function validate(body) {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  const name = sanitizeName(body.name);
  const startTime = String(body.startTime || '');
  const endTime = String(body.endTime || '');
  const timeRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (!timeRe.test(startTime) || !timeRe.test(endTime)) return { error: 'invalid time format' };
  if (endTime < startTime) return { error: 'end time before start time' };

  const seed = String(body.seed || '').slice(0, 64);
  if (!seed) return { error: 'missing seed' };

  const win = !!body.win;
  const lastStage = Number(body.lastStage);
  if (!Number.isInteger(lastStage) || lastStage < 1 || lastStage > 8) return { error: 'invalid lastStage' };
  if (win && lastStage !== 8) return { error: 'win must use lastStage 8' };
  if (!win && lastStage === 8) return { error: 'loss cannot use lastStage 8' };

  const duration = Number(body.duration);
  if (!Number.isFinite(duration) || duration < 0 || duration > 86400) return { error: 'invalid duration' };

  const maxHp = Number(body.maxHp);
  const remainingHp = Number(body.remainingHp);
  if (!Number.isFinite(maxHp) || maxHp <= 0 || maxHp > 10000) return { error: 'invalid maxHp' };
  if (!Number.isFinite(remainingHp) || remainingHp < 0 || remainingHp > maxHp) return { error: 'invalid remainingHp' };

  return {
    record: {
      name,
      startTime,
      endTime,
      seed,
      win,
      lastStage,
      lastLevelLabel: levelLabel({ win, lastStage }),
      duration: Math.round(duration),
      remainingHp: Math.round(remainingHp),
      maxHp: Math.round(maxHp),
      rating: computeRating({ win, lastStage, duration, remainingHp, maxHp })
    }
  };
}

function compare(a, b) {
  if (b.rating !== a.rating) return b.rating - a.rating;
  if (a.duration !== b.duration) return a.duration - b.duration;
  const ah = hpRatio(a), bh = hpRatio(b);
  if (bh !== ah) return bh - ah;
  return String(a.endTime).localeCompare(String(b.endTime));
}

module.exports = { NAME_MAX, sanitizeName, stageRank, levelLabel, hpRatio, computeRating, validate, compare };
