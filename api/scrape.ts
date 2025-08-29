import { fetchAllPlans } from '../server/planFetcher.js';
import { adapterAppendEntries, adapterLogFetch } from '../server/dbAdapter.js';
import { sendAlert } from '../server/alert.js';

export const config = {
  maxDuration: 60 // allow up to 60s for scraping
};

export default async function handler(_req: any, res: any) {
  const started = Date.now();
  try {
    const { entries, pagesFetched } = await fetchAllPlans();
    const inserted = await adapterAppendEntries(entries);
    await adapterLogFetch({ timestamp: new Date().toISOString(), success: true, pagesFetched });
    if (process.env.DISCORD_WEBHOOK_URL) {
      if (inserted === 0) {
        await sendAlert('Scrape completed but no new entries (serverless).', { component: 'scraper', severity: 'warn', extra: { parsed: entries.length, pagesFetched } });
      } else {
        await sendAlert('Scrape success (serverless).', { component: 'scraper', severity: 'info', extra: { inserted, parsed: entries.length, pagesFetched, durationMs: Date.now() - started } });
      }
    }
    res.status(200).json({ ok: true, parsed: entries.length, inserted, pagesFetched, durationMs: Date.now() - started });
  } catch (e: any) {
    await adapterLogFetch({ timestamp: new Date().toISOString(), success: false, error: e.message, pagesFetched: 0 });
    if (process.env.DISCORD_WEBHOOK_URL) {
      await sendAlert('Scrape failed (serverless)', { component: 'scraper', severity: 'error', error: e });
    }
    res.status(500).json({ error: e.message });
  }
}
