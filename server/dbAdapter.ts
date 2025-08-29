import type { PlanEntryRow, RawFetchLogEntry } from './db.js';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import './config.js';

// Thin abstraction to allow running on Vercel with Postgres while keeping existing code paths.
// If DATABASE_URL is not provided, we fallback to local SQLite implementation (existing functions) for local dev.

const DATABASE_URL = process.env.DATABASE_URL;

let pgPool: Pool | null = null;
async function getPool() {
  if (!DATABASE_URL) return null;
  if (!pgPool) {
    pgPool = new Pool({ connectionString: DATABASE_URL });
    await ensureSchema();
  }
  return pgPool;
}

async function ensureSchema() {
  const pool = pgPool!;
  await pool.query(`CREATE TABLE IF NOT EXISTS entries (
    id SERIAL PRIMARY KEY,
    day TEXT NOT NULL,
    weekday TEXT,
    lesson TEXT,
    teacher TEXT,
    subject TEXT,
    original_subject TEXT,
    room TEXT,
    type TEXT,
    text TEXT,
    week_type TEXT,
    source_page TEXT,
    classes TEXT NOT NULL,
    color TEXT,
    cancelled BOOLEAN,
    changed BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_entry UNIQUE(day, lesson, subject, type, room, classes, source_page)
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(day);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_entries_classes ON entries USING GIN (to_tsvector('simple', classes));`);
  await pool.query(`CREATE TABLE IF NOT EXISTS fetch_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    success BOOLEAN NOT NULL,
    error TEXT,
    pages_fetched INT NOT NULL
  );`);
}

function normalizeClasses(classes: string[]) {
  return classes.map(c => c.trim().toUpperCase()).sort().join(',');
}

// Fallback JSON log path for local (non-pg) mode so existing helper keeps working.
const FETCH_LOG_FILE = path.join('data-store', 'fetch_log.json');

export async function adapterAppendEntries(newEntries: PlanEntryRow[]) {
  const pool = await getPool();
  if (!pool) {
    const { appendEntries } = await import('./db.js');
    return appendEntries(newEntries);
  }
  if (!newEntries.length) return 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    for (const e of newEntries) {
      try {
        await client.query(`INSERT INTO entries(day, weekday, lesson, teacher, subject, original_subject, room, type, text, week_type, source_page, classes, color, cancelled, changed, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT DO NOTHING`, [
            e.day, e.weekday, e.lesson, e.teacher || null, e.subject || null, e.originalSubject || null, e.room || null, e.type || null, e.text || null, e.weekType || null, e.sourcePage, normalizeClasses(e.classes), e.color || null, e.cancelled || false, e.changed || false, e.createdAt
          ]);
        inserted++;
      } catch {
        // ignore individual conflicts
      }
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function adapterGetEntries(filter?: { day?: string; className?: string; limit?: number; offset?: number; sort?: 'asc' | 'desc'; }) {
  const pool = await getPool();
  if (!pool) {
    const { getEntries } = await import('./db.js');
    return getEntries(filter);
  }
  const params: any[] = [];
  const where: string[] = [];
  if (filter?.day) { where.push('day = $' + (params.length + 1)); params.push(filter.day); }
  if (filter?.className) { where.push('classes ILIKE $' + (params.length + 1)); params.push('%' + filter.className.toUpperCase() + '%'); }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const orderDir = filter?.sort === 'desc' ? 'DESC' : 'ASC';
  const limit = typeof filter?.limit === 'number' && filter.limit > 0 ? filter.limit : 500;
  const offset = typeof filter?.offset === 'number' && filter.offset >= 0 ? filter.offset : 0;
  const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM entries${whereSql}`, params);
  const rowsRes = await pool.query(`SELECT * FROM entries${whereSql} ORDER BY day ${orderDir}, lesson ${orderDir} LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
  const mapped = rowsRes.rows.map(r => ({
    classes: (r.classes as string).split(',').map((c: string) => c.trim()).filter(Boolean),
    lesson: r.lesson || '',
    teacher: r.teacher || undefined,
    subject: r.subject || undefined,
    originalSubject: r.original_subject || undefined,
    room: r.room || undefined,
    type: r.type || undefined,
    text: r.text || undefined,
    day: r.day,
    weekday: r.weekday,
    weekType: r.week_type || undefined,
    sourcePage: r.source_page,
    color: r.color || undefined,
    cancelled: !!r.cancelled,
    changed: !!r.changed,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at
  }));
  return { entries: mapped, total: countRes.rows[0].total, limit, offset };
}

export async function adapterLogFetch(entry: RawFetchLogEntry) {
  const pool = await getPool();
  if (!pool) {
    // mimic original file log
    try {
      let existing: RawFetchLogEntry[] = [];
      try { existing = JSON.parse(await fs.readFile(FETCH_LOG_FILE, 'utf8')); } catch {}
      existing.push(entry);
      await fs.mkdir(path.dirname(FETCH_LOG_FILE), { recursive: true });
      await fs.writeFile(FETCH_LOG_FILE, JSON.stringify(existing.slice(-500), null, 2));
    } catch {}
    return;
  }
  await pool.query('INSERT INTO fetch_log(timestamp, success, error, pages_fetched) VALUES ($1,$2,$3,$4)', [entry.timestamp, entry.success, entry.error || null, entry.pagesFetched]);
}

export async function adapterGetFetchLog(limit = 50) {
  const pool = await getPool();
  if (!pool) {
    const { getFetchLog } = await import('./db.js');
    return getFetchLog(limit);
  }
  const res = await pool.query('SELECT timestamp, success, error, pages_fetched as pagesFetched FROM fetch_log ORDER BY id DESC LIMIT $1', [limit]);
  return res.rows;
}

export async function adapterGetLastSuccessfulFetch() {
  const pool = await getPool();
  if (!pool) {
    const { getLastSuccessfulFetch } = await import('./db.js');
    return getLastSuccessfulFetch();
  }
  const res = await pool.query('SELECT timestamp, success, error, pages_fetched as pagesFetched FROM fetch_log WHERE success = true ORDER BY id DESC LIMIT 1');
  return res.rows[0];
}

export async function adapterGetStats() {
  const pool = await getPool();
  if (!pool) {
    const { getStats } = await import('./db.js');
    return getStats();
  }
  const res = await pool.query('SELECT COUNT(*)::int as total, COUNT(DISTINCT day)::int as days FROM entries');
  const row = res.rows[0];
  return { totalEntries: row.total, daysTracked: row.days, avgPerDay: row.days ? row.total / row.days : 0 };
}

export async function adapterGetClasses() {
  const pool = await getPool();
  if (!pool) {
    const { getClasses } = await import('./db.js');
    return getClasses();
  }
  const res = await pool.query('SELECT DISTINCT classes FROM entries');
  const set = new Set<string>();
  for (const r of res.rows) {
    (r.classes as string).split(',').forEach(c => set.add(c));
  }
  return Array.from(set).sort();
}
