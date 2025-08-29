import { adapterGetFetchLog } from '../server/dbAdapter.js';

export default async function handler(req: any, res: any) {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const log = await adapterGetFetchLog(limit);
    res.status(200).json({ log });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
