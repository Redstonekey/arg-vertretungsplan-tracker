import { adapterGetClasses } from '../server/dbAdapter.js';

export default async function handler(_req: any, res: any) {
  try {
    const classes = await adapterGetClasses();
    res.status(200).json({ classes });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
