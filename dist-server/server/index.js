import express from 'express';
import cors from 'cors';
import { getEntries, getFetchLog, getStats, getClasses, appendEntries, getLastSuccessfulFetch } from './db.js';
import { CONFIG } from './config.js';
import { sendAlert } from './alert.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/entries', async (req, res) => {
    try {
        const day = typeof req.query.day === 'string' ? req.query.day : undefined;
        const className = typeof req.query.class === 'string' ? req.query.class : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
        const sort = req.query.sort === 'desc' ? 'desc' : 'asc';
        const { entries, total } = await getEntries({ day, className, limit, offset, sort });
        res.json({ entries, total, limit: limit || 500, offset: offset || 0 });
    }
    catch (e) {
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
app.get('/health', async (_req, res) => {
    const last = await getLastSuccessfulFetch();
    const lastTs = last?.timestamp ? Date.parse(last.timestamp) : undefined;
    const ageHours = lastTs ? (Date.now() - lastTs) / 36e5 : undefined;
    res.json({ ok: true, lastSuccessfulFetch: last?.timestamp, ageHours, stale: (ageHours ?? 0) > CONFIG.staleAfterHours, maxPages: CONFIG.maxPages });
});
// Manual alert trigger route for uptime monitors or administrators.
// Optional security: provide ?token=ALERT_TOKEN if configured.
app.post('/alert', express.json(), async (req, res) => {
    try {
        if (CONFIG.alertToken && req.query.token !== CONFIG.alertToken) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { message = 'Manual alert trigger', severity = 'info', component = 'manual', extra = {} } = req.body || {};
        await sendAlert(String(message), { severity, component, extra });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
async function startServer(port, attempts = 5) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
            resolve();
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && attempts > 0) {
                console.warn(`Port ${port} in use, trying ${port + 1} ...`);
                setTimeout(() => startServer(port + 1, attempts - 1).then(resolve).catch(reject), 300);
            }
            else {
                reject(err);
            }
        });
    });
}
const basePort = parseInt(process.env.PORT || '3001', 10);
startServer(basePort).then(() => {
    // Basic disk space check (Node doesn't give free space directly, so we approximate by writing a temp file)
    (async () => {
        try {
            const testFile = path.join(os.tmpdir(), 'vp_disk_test.tmp');
            await fs.promises.writeFile(testFile, 'x'.repeat(1024));
            await fs.promises.unlink(testFile);
        }
        catch (e) {
            console.error('Disk write test failed', e.message);
            await sendAlert('Disk write test failed – possible read-only or full disk.', { component: 'server', severity: 'error', error: e });
        }
    })();
    // In development, seed a few demo entries if DB empty so UI isn't blank
    if (process.env.NODE_ENV !== 'production') {
        (async () => {
            try {
                const existing = await getEntries();
                if (existing.total === 0) {
                    const today = new Date();
                    const iso = today.toISOString().slice(0, 10);
                    const weekday = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][today.getDay()];
                    await appendEntries([
                        {
                            classes: ['5A', '5B'],
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
                    ]);
                    console.log('Seeded demo entries (development only).');
                }
            }
            catch (e) {
                console.warn('Seeding skipped / failed', e.message);
            }
        })();
    }
}).catch(err => {
    console.error('Failed to start server', err);
    process.exit(1);
});
