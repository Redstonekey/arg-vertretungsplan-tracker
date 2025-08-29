import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { PlanEntryRow } from './db.js';

const BASE_URL = 'https://arg-heusenstamm.de/vertretungsplan/allgemein/35/w/';

export interface FetchResult {
	entries: PlanEntryRow[];
	pagesFetched: number;
}

const WEEKDAY_MAP = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
function parseGermanDate(dateStr: string): { iso: string; weekday: string } | undefined {
	// pattern: 25.8. Montag  OR 27.8. Mittwoch
	const m = dateStr.match(/(\d{1,2})\.(\d{1,2})\./);
	if (!m) return undefined;
	const dayNum = parseInt(m[1], 10);
	const monthNum = parseInt(m[2], 10);
	// Heuristik: wenn Monat >= 8 -> aktuelles Jahr, sonst evtl nächstes Jahr (Schuljahr)
	const now = new Date();
	const baseYear = now.getMonth()+1 >= 8 ? now.getFullYear() : now.getFullYear()-1; // Schuljahr Start August
	const year = monthNum >= 8 ? baseYear : baseYear + 1;
	const dt = new Date(Date.UTC(year, monthNum - 1, dayNum));
	const iso = dt.toISOString().slice(0,10);
	const weekday = WEEKDAY_MAP[dt.getUTCDay()];
	return { iso, weekday };
}

export async function fetchAllPlans(range: { from?: number; to?: number } = {}): Promise<FetchResult> {
	const from = range.from ?? 1;
	const to = range.to ?? 99;
	const entries: PlanEntryRow[] = [];
	for (let i = from; i <= to; i++) {
		const num = i.toString().padStart(2, '0');
		const page = `w000${num}.htm`;
			try {
				const url = BASE_URL + page;
				const res = await fetch(url, {
					headers: {
						'User-Agent': 'VertretungsplanTrackerBot/1.0 (+https://example.local)'
					}
				});
			if (!res.ok) continue;
			const buffer = Buffer.from(await res.arrayBuffer());
			const html = iconv.decode(buffer, 'ISO-8859-1');
			const $ = cheerio.load(html);
			const weekType = $('#vertretung .title').first().text().trim() || undefined;
			// For each anchor day block (#1 .. #5) we parse following table until next anchor.
			// Simpler: iterate all tables with class subst and look back for the preceding <b>DATE</b>
			const tables = $('table.subst');
			tables.each((idx, tbl) => {
				// find previous bold element <b> with date pattern before this table
			let dayLabel: string | undefined;
			// The <b>DATE</b> is often inside a preceding <p> sibling, not a direct sibling of <table>.
			// Strategy: walk backwards through previous siblings; for each, look for the LAST <b> containing a date pattern.
			// Stop when found.
			function extractDateFromNode(node: any): string | undefined {
				if (!node) return undefined;
				if (node.type === 'tag') {
					if (node.name === 'b') {
						const t = $(node).text();
						if (/\d{1,2}\.\d{1,2}\./.test(t)) return t;
					}
					// search descendants (take last matching <b>)
					const bTags = $(node).find('b').toArray();
					for (let k = bTags.length - 1; k >= 0; k--) {
						const t = $(bTags[k]).text();
						if (/\d{1,2}\.\d{1,2}\./.test(t)) return t;
					}
				}
				return undefined;
			}
			// Start from table's previous sibling chain.
			let cursor: any = (tbl as any).prev;
			while (cursor && !dayLabel) {
				dayLabel = extractDateFromNode(cursor);
				cursor = cursor.prev;
			}
			// Fallback: search upwards to parent previous siblings if still not found.
			if (!dayLabel) {
				let parent: any = (tbl as any).parent;
				while (parent && !dayLabel) {
					let pPrev = parent.prev;
					while (pPrev && !dayLabel) {
						dayLabel = extractDateFromNode(pPrev);
						pPrev = pPrev.prev;
					}
					parent = parent.parent;
				}
			}
			const parsed = dayLabel ? parseGermanDate(dayLabel) : undefined;
			const isoDay = parsed?.iso;
			const weekday = parsed?.weekday;
			const rows = $(tbl).find('tr.list').toArray();
			if (rows.length === 0) return;
			// If the only row contains a placeholder message, skip
			if (rows.length === 1 && /Keine Vertretungen|nicht freigegeben/i.test($(rows[0]).text())) return;
			// If we couldn't derive the day, skip inserting these rows (prevents 'unknown' pollution)
			if (!isoDay) return;
				// Skip header (first has <th>)
				rows.forEach(r => {
					const isHeader = $(r).find('th').length > 0;
					if (isHeader) return;
					const cols = $(r).find('td').toArray();
					if (cols.length < 8) return;
						const color = $(r).find('td').first().attr('style')?.match(/background-color:\s*([^;]+)/)?.[1];
					function clean(text: string) {return text.replace(/\u00a0|&nbsp;/g,' ').trim();}
					const [classesRaw, lessonRaw, teacherRaw, subjectRaw, originalSubjectRaw, roomRaw, typeRaw, textRaw] = cols.map(c => clean($(c).text()));
					const cancelled = /Entfall/i.test(typeRaw) || /Entfall/i.test($(r).text());
					const changed = /geändert/i.test(typeRaw);
					const entry: PlanEntryRow = {
						classes: classesRaw.split(',').map(s => s.trim()).filter(Boolean),
						lesson: lessonRaw,
						teacher: teacherRaw || undefined,
						subject: subjectRaw || undefined,
						originalSubject: originalSubjectRaw || undefined,
						room: roomRaw || undefined,
						type: typeRaw || undefined,
						text: textRaw || undefined,
						day: isoDay || 'unknown',
						weekday: weekday || 'unknown',
						weekType,
						sourcePage: page,
						color,
						cancelled,
						changed,
						createdAt: new Date().toISOString()
					};
					entries.push(entry);
				});
			});
			} catch (err) {
				if (process.env.SCRAPE_DEBUG) {
					console.warn('Fehler Seite', page, err);
				}
				continue; // ignore page errors
		}
	}
	return { entries, pagesFetched: to - from + 1 };
}

