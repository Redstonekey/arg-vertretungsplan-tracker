import express from 'express';
import cors from 'cors';
import { getEntries, getFetchLog, getStats, getClasses, appendEntries } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/entries', async (req, res) => {
	try {
		const day = typeof req.query.day === 'string' ? req.query.day : undefined;
		const className = typeof req.query.class === 'string' ? req.query.class : undefined;
		const entries = await getEntries({ day, className });
		res.json({ entries });
	} catch (e: any) {
		res.status(500).json({ error: e.message });
	}
});

app.get('/api/fetch-log', async (_req, res) => {
	const log = await getFetchLog();
	res.json({ log });
});

app.get('/api/stats', async (_req, res) => {
	const stats = await getStats();
	res.json(stats);
});

app.get('/api/classes', async (_req, res) => {
	const classes = await getClasses();
	res.json({ classes });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

async function startServer(port: number, attempts = 5) {
	return new Promise<void>((resolve, reject) => {
		const server = app.listen(port, () => {
			console.log(`Server listening on port ${port}`);
			resolve();
		});
		server.on('error', (err: any) => {
			if (err.code === 'EADDRINUSE' && attempts > 0) {
				console.warn(`Port ${port} in use, trying ${port + 1} ...`);
				setTimeout(() => startServer(port + 1, attempts - 1).then(resolve).catch(reject), 300);
			} else {
				reject(err);
			}
		});
	});
}

const basePort = parseInt(process.env.PORT || '3001', 10);
startServer(basePort).then(() => {
	// In development, seed a few demo entries if DB empty so UI isn't blank
	if (process.env.NODE_ENV !== 'production') {
		(async () => {
			try {
				const existing = await getEntries();
				if (existing.length === 0) {
					const today = new Date();
					const iso = today.toISOString().slice(0,10);
					const weekday = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][today.getDay()];
					await appendEntries([
						{
							classes: ['5A','5B'],
							lesson: '1',
							teacher: 'HERR A',
							subject: 'MATH',
							originalSubject: 'MATH',
							room: '101',
							type: 'Vertretung',
							text: 'Einspringen für Frau X',
							day: iso,
							weekday,
							weekType: undefined,
							sourcePage: 'seed',
							color: undefined,
							cancelled: false,
							changed: false,
							createdAt: new Date().toISOString()
						},
						{
							classes: ['6C'],
							lesson: '3',
							teacher: 'FRAU B',
							subject: 'DE',
							originalSubject: 'DE',
							room: '202',
							type: 'Entfall',
							text: 'Krankheit',
							day: iso,
							weekday,
							weekType: undefined,
							sourcePage: 'seed',
							color: undefined,
							cancelled: true,
							changed: false,
							createdAt: new Date().toISOString()
						}
					] as any);
					console.log('Seeded demo entries (development only).');
				}
			} catch (e) {
				console.warn('Seeding skipped / failed', (e as any).message);
			}
		})();
	}
}).catch(err => {
	console.error('Failed to start server', err);
	process.exit(1);
});

