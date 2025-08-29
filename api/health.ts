import { adapterGetLastSuccessfulFetch } from '../server/dbAdapter.js';
import { CONFIG } from '../server/config.js';

export default async function handler(_req: any, res: any) {
  try {
    const last = await adapterGetLastSuccessfulFetch();
    const lastTs = last?.timestamp ? Date.parse(last.timestamp) : undefined;
    const ageHours = lastTs ? (Date.now() - lastTs) / 36e5 : undefined;
    res.status(200).json({ ok: true, lastSuccessfulFetch: last?.timestamp, ageHours, stale: (ageHours ?? 0) > CONFIG.staleAfterHours, maxPages: CONFIG.maxPages });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
