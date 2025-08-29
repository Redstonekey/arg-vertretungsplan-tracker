import { promises as fs } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export interface RawFetchLogEntry {
	timestamp: string;
	success: boolean;
	error?: string;
	pagesFetched: number;
}

export interface PlanEntryRow {
	classes: string[];
	lesson: string;
	teacher?: string;
	subject?: string;
	originalSubject?: string;
	room?: string;
	type?: string;
	text?: string;
	day: string;
	weekday: string;
	weekType?: string;
	sourcePage: string;
	color?: string;
	cancelled?: boolean;
	changed?: boolean;
	createdAt: string;
}

const DATA_DIR = path.resolve('data-store');
const SQLITE_FILE = path.join(DATA_DIR, 'entries.sqlite');
const LEGACY_JSON = path.join(DATA_DIR, 'entries.json');
const FETCH_LOG_FILE = path.join(DATA_DIR, 'fetch_log.json');

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

async function connect() {
	if (!db) {
		await fs.mkdir(DATA_DIR, { recursive: true });
		db = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
		await db.exec('PRAGMA journal_mode=WAL;');
		await db.exec(`CREATE TABLE IF NOT EXISTS entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
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
			cancelled INTEGER,
			changed INTEGER,
			created_at TEXT NOT NULL,
			UNIQUE(day, lesson, subject, type, room, classes, source_page)
		);`);
		await db.exec(`CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(day);`);
		await db.exec(`CREATE INDEX IF NOT EXISTS idx_entries_classes ON entries(classes);`);
	}
	return db;
}

async function migrateLegacyJsonIfPresent() {
	await fs.mkdir(DATA_DIR, { recursive: true });
	try {
		await fs.access(LEGACY_JSON);
	} catch {
		return; // no legacy
	}
	const raw = await fs.readFile(LEGACY_JSON, 'utf8');
	if (!raw.trim()) return;
	let parsed: any = JSON.parse(raw);
	if (Array.isArray(parsed)) parsed = { entries: parsed };
	const entries: PlanEntryRow[] = parsed.entries || [];
	if (!entries.length) return;
		const con = await connect();
		const insert = await con.prepare(`INSERT OR IGNORE INTO entries(day, weekday, lesson, teacher, subject, original_subject, room, type, text, week_type, source_page, classes, color, cancelled, changed, created_at)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
		try {
			await con.exec('BEGIN');
			for (const e of entries) {
				await insert.run(
					e.day,
					e.weekday,
					e.lesson,
					e.teacher || null,
					e.subject || null,
					e.originalSubject || null,
					e.room || null,
					e.type || null,
					e.text || null,
					e.weekType || null,
					e.sourcePage,
					normalizeClasses(e.classes),
					e.color || null,
					e.cancelled ? 1 : 0,
					e.changed ? 1 : 0,
					e.createdAt
				);
			}
			await con.exec('COMMIT');
		} catch (err) {
			await con.exec('ROLLBACK');
			throw err;
		} finally {
			await insert.finalize();
		}
	// Optionally rename legacy file
	await fs.rename(LEGACY_JSON, LEGACY_JSON + '.migrated');
}

function normalizeClasses(classes: string[]) {
	return classes.map(c => c.trim().toUpperCase()).sort().join(',');
}

export async function appendEntries(newEntries: PlanEntryRow[]) {
	await migrateLegacyJsonIfPresent();
		const con = await connect();
		const insert = await con.prepare(`INSERT OR IGNORE INTO entries(day, weekday, lesson, teacher, subject, original_subject, room, type, text, week_type, source_page, classes, color, cancelled, changed, created_at)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
		let inserted = 0;
		try {
			await con.exec('BEGIN');
			for (const e of newEntries) {
				const result = await insert.run(
					e.day,
					e.weekday,
					e.lesson,
					e.teacher || null,
					e.subject || null,
					e.originalSubject || null,
					e.room || null,
					e.type || null,
					e.text || null,
					e.weekType || null,
					e.sourcePage,
					normalizeClasses(e.classes),
					e.color || null,
					e.cancelled ? 1 : 0,
					e.changed ? 1 : 0,
					e.createdAt
				);
				if ((result as any).changes > 0) inserted++;
			}
			await con.exec('COMMIT');
		} catch (err) {
			await con.exec('ROLLBACK');
			throw err;
		} finally {
			await insert.finalize();
		}
		return inserted;
}

export async function getEntries(filter?: { day?: string; className?: string }) {
	await migrateLegacyJsonIfPresent();
		const con = await connect();
	let sql = 'SELECT * FROM entries';
	const params: any[] = [];
	const where: string[] = [];
	if (filter?.day) { where.push('day = ?'); params.push(filter.day); }
	if (filter?.className) { where.push('classes LIKE ?'); params.push(`%${filter.className.toUpperCase()}%`); }
	if (where.length) sql += ' WHERE ' + where.join(' AND ');
	sql += ' ORDER BY day ASC, lesson ASC';
		const rows = await con.all(sql, params);
	return rows.map(r => ({
		classes: (r.classes as string).split(',').map(c => c.trim()).filter(Boolean),
		lesson: r.lesson,
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
		createdAt: r.created_at
	})) as PlanEntryRow[];
}

export async function logFetch(entry: RawFetchLogEntry) {
	await fs.mkdir(DATA_DIR, { recursive: true });
	let existing: RawFetchLogEntry[] = [];
	try {
		const raw = await fs.readFile(FETCH_LOG_FILE, 'utf8');
		existing = raw ? JSON.parse(raw) : [];
	} catch { /* ignore */ }
	existing.push(entry);
	await fs.writeFile(FETCH_LOG_FILE, JSON.stringify(existing.slice(-500), null, 2), 'utf8');
}

export async function getFetchLog(limit = 50) {
	try {
		const raw = await fs.readFile(FETCH_LOG_FILE, 'utf8');
		const data: RawFetchLogEntry[] = raw ? JSON.parse(raw) : [];
		return data.slice(-limit).reverse();
	} catch { return []; }
}

export async function getStats() {
		const con = await connect();
		const row: any = await con.get('SELECT COUNT(*) as total, COUNT(DISTINCT day) as days FROM entries');
	return {
		totalEntries: row.total as number,
		daysTracked: row.days as number,
		avgPerDay: row.days ? (row.total / row.days) : 0
	};
}

export async function getClasses() {
		const con = await connect();
		const rows: any[] = await con.all('SELECT DISTINCT classes FROM entries');
	const set = new Set<string>();
	for (const r of rows) {
		(r.classes as string).split(',').forEach((c: string) => set.add(c));
	}
	return Array.from(set).sort();
}

