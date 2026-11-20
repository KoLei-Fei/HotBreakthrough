// Netlify Function: GET /api/records, POST /api/records
// 记录保存在 Netlify Blobs（云端），不写本地文件。
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const { validate, compare } = require('../lib/rating');

const STORE_NAME = 'afterheat-records';
const KEY = 'records-v1';
const MAX_RECORDS = 5000;

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(data)
  };
}

async function loadRecords(store) {
  try {
    const value = await store.get(KEY, { type: 'json' });
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
}

function publicRecord(rec, rank) {
  return {
    rank,
    name: rec.name,
    duration: rec.duration,
    lastLevelLabel: rec.lastLevelLabel || '—',
    lastStage: rec.lastStage,
    rating: rec.rating,
    startTime: rec.startTime,
    endTime: rec.endTime
  };
}

exports.handler = async (event) => {
  try {
    const store = getStore(STORE_NAME);
    if (event.httpMethod === 'GET') {
      const records = await loadRecords(store);
      const limitRaw = Number((event.queryStringParameters || {}).limit);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 10;
      const sorted = records.slice().sort(compare).slice(0, limit);
      return json(200, { records: sorted.map((r, i) => publicRecord(r, i + 1)) });
    }

    if (event.httpMethod === 'POST') {
      let body = null;
      try {
        const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
        body = JSON.parse(raw);
      } catch (e) {
        return json(400, { error: 'invalid json' });
      }
      const result = validate(body);
      if (result.error) return json(400, { error: result.error });

      const record = Object.assign({}, result.record, {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      });
      const records = await loadRecords(store);
      records.push(record);
      const capped = records.slice().sort(compare).slice(0, MAX_RECORDS);
      await store.setJSON(KEY, capped);
      return json(201, { ok: true, id: record.id });
    }

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: {}, body: '' };
    return json(405, { error: 'method not allowed' });
  } catch (e) {
    return json(500, { error: 'storage unavailable' });
  }
};
