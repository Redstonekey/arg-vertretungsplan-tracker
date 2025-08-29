import { appendEntries, logFetch } from './db.js';
import { fetchAllPlans } from './planFetcher.js';
import { sendAlert } from './alert.js';

async function main() {
	const started = Date.now();
	try {
		const { entries, pagesFetched } = await fetchAllPlans();
		const inserted = await appendEntries(entries);
		await logFetch({
			timestamp: new Date().toISOString(),
			success: true,
					pagesFetched
		});
				console.log(`Scrape success: ${entries.length} parsed, ${inserted} inserted (unique) from ${pagesFetched} pages in ${Date.now()-started}ms`);
		if (process.env.DISCORD_WEBHOOK_URL) {
			if (inserted === 0) {
				await sendAlert('Scrape completed but no new entries were inserted (possible site structure unchanged or parsing issue).', { component: 'scraper', severity: 'warn', extra: { parsed: entries.length, pagesFetched } });
			} else {
				await sendAlert('Scrape success.', { component: 'scraper', severity: 'info', extra: { inserted, parsed: entries.length, pagesFetched, durationMs: Date.now()-started } });
			}
		}
	} catch (err: any) {
		await logFetch({
			timestamp: new Date().toISOString(),
			success: false,
			error: err.message,
			pagesFetched: 0
		});
		console.error('Scrape failed', err);
		if (process.env.DISCORD_WEBHOOK_URL) {
			await sendAlert('Scrape failed', { component: 'scraper', severity: 'error', error: err });
		}
		process.exitCode = 1;
	}
}

main();

