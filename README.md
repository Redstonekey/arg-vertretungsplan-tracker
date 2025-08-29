## Usage

### Scrape Data
```bash
node dist-server/server/runScrape.js
```

### Run Backend
```bash
node dist-server/server/index.js
```

### Run Frontend
```bash
npm run dev
```

## Long-term ("hands-off") Operation

To keep this running for years with minimal/no code changes:

1. Pin Dependencies: `package.json` now uses exact versions to avoid unexpected breaking updates. Review yearly if needed.
2. Node Version: Target Node 20 LTS (see `engines`). Install a matching LTS on new hosts.
3. Configuration via Environment (no code edits required):
	- PLAN_BASE_URL (default current plan base)  
	- PLAN_MAX_PAGES (default 99)  
	- PLAN_USER_AGENT  
	- SCRAPE_INTERVAL_HOURS (maintenance auto-scrape cadence, default 6)  
	- PLAN_STALE_AFTER_HOURS (health stale threshold, default 24)
	- DISCORD_WEBHOOK_URL (optional: if set, sends alerts on scrape success/failure, zero inserts, disk write test failure)
		- ALERT_TOKEN (optional: if set, /alert requires ?token= value)
4. Scheduled Scraping: Use a cron (Linux) or Task Scheduler (Windows) to run:
	- `node dist-server/server/maintenance.js` every hour. It only scrapes if data is older than the configured interval.
5. Health Check: Query `/health` endpoint. Responds with last successful fetch timestamp and staleness flag.
6. Backups: Periodically copy `data-store/entries.sqlite` (hot copy is fine with WAL mode). Keep at least rolling 30 days.
7. Migration Safety: Legacy JSON automatically migrates once (file renamed with `.migrated`).
8. Monitoring Ideas:
	- Alert if `/health` shows `stale: true` > 2 intervals.
	- Track scrape success ratio from `/api/fetch-log`.
9. Disaster Recovery: Restore the latest `entries.sqlite` backup and optionally the `fetch_log.json`.
10. Updating School Year Handling: Date parser infers school year starting August; adjust only if academic calendar shifts significantly.

### Example Cron (Linux)
```
0 * * * * /usr/bin/node /path/to/app/dist-server/server/maintenance.js >> /var/log/vertretungsplan-maint.log 2>&1
```

### Example Windows Task (PowerShell Action)
```
Program/script: node
Arguments: C:\path\to\app\dist-server\server\maintenance.js
```

## Health Endpoint Output Example
```
{
  "ok": true,
  "lastSuccessfulFetch": "2025-08-29T07:15:12.123Z",
  "ageHours": 1.25,
  "stale": false,
  "maxPages": 99
}
```

If `stale` becomes true persistently, investigate network / site structure changes. Adjust `PLAN_BASE_URL` or parsing logic if layout changes.

### Manual Alert Trigger
POST /alert  (JSON body)
{
	"message": "Test alert",
	"severity": "info",   // info | warn | error
	"component": "test",
	"extra": {"any": "metadata"}
}
If ALERT_TOKEN is set, append ?token=YOURTOKEN. Returns { ok: true } on success.

