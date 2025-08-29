import { adapterGetEntries } from '../server/dbAdapter.js';

export default async function handler(req: any, res: any) {
  try {
    const { day, class: className, limit, offset, sort } = req.query as any;
    const parsedLimit = limit ? parseInt(String(limit), 10) : undefined;
    const parsedOffset = offset ? parseInt(String(offset), 10) : undefined;
    const parsedSort = sort === 'desc' ? 'desc' : 'asc';
    const result = await adapterGetEntries({ day, className, limit: parsedLimit, offset: parsedOffset, sort: parsedSort as any });
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
