import { appendEntries, logFetch } from './db.js';
import { fetchAllPlans } from './planFetcher.js';

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
	} catch (err: any) {
		await logFetch({
			timestamp: new Date().toISOString(),
			success: false,
			error: err.message,
			pagesFetched: 0
		});
		console.error('Scrape failed', err);
		process.exitCode = 1;
	}
}

main();

