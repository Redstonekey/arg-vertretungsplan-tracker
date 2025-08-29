export interface ApiPlanEntry {
  classes: string[];
  lesson: string;
  teacher?: string;
  subject?: string;
  originalSubject?: string;
  room?: string;
  type?: string;
  text?: string;
  day: string; // YYYY-MM-DD
  weekday: string;
  weekType?: string;
  sourcePage: string;
  colour?: string;
  cancelled?: boolean;
  changed?: boolean;
  createdAt?: string; // timestamp when inserted
}

export interface ApiEntriesResponse { entries: ApiPlanEntry[] }
export interface ApiClassesResponse { classes: string[] }
export interface ApiStatsResponse { totalEntries: number; daysTracked: number; avgPerDay: number }

const BASE = import.meta.env.VITE_API_BASE || '';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.json();
}

export const api = {
  entries: () => getJson<ApiEntriesResponse>('/api/entries'),
  classes: () => getJson<ApiClassesResponse>('/api/classes'),
  stats: () => getJson<ApiStatsResponse>('/api/stats'),
};
