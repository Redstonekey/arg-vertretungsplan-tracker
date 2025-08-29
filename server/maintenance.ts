import { getLastSuccessfulFetch } from './db.js';
import { CONFIG } from './config.js';
import './config.js';
import './db.js';
// This script runs a scrape only if data is stale. Designed for cron usage.
import { spawn } from 'child_process';

async function main() {
  const last = await getLastSuccessfulFetch();
  const now = Date.now();
  const lastTs = last?.timestamp ? Date.parse(last.timestamp) : 0;
  const ageHours = (now - lastTs) / 36e5;
  if (!last || ageHours >= CONFIG.scrapeIntervalHours) {
    console.log(`[maintenance] Triggering scrape (ageHours=${ageHours.toFixed(2)})`);
    const child = spawn(process.execPath, ['dist-server/server/runScrape.js'], { stdio: 'inherit' });
    child.on('exit', code => process.exit(code || 0));
  } else {
    console.log(`[maintenance] Skipping scrape; last successful fetch ${ageHours.toFixed(2)}h ago (<${CONFIG.scrapeIntervalHours}h)`);
  }
}
main();
