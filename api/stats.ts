import { adapterGetStats } from '../server/dbAdapter.js';

export default async function handler(_req: any, res: any) {
  try {
    const stats = await adapterGetStats();
    res.status(200).json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
