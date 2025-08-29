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

export interface ApiEntriesResponse { entries: ApiPlanEntry[]; total: number; limit: number; offset: number }
export interface ApiClassesResponse { classes: string[] }
export interface ApiStatsResponse { totalEntries: number; daysTracked: number; avgPerDay: number }

const BASE = import.meta.env.VITE_API_BASE || '';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.json();
}

export const api = {
  entries: (params?: { limit?: number; offset?: number; sort?: 'asc' | 'desc'; className?: string; day?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.className) qs.set('class', params.className);
    if (params?.day) qs.set('day', params.day);
    const suffix = qs.toString() ? ('?' + qs.toString()) : '';
    return getJson<ApiEntriesResponse>('/api/entries' + suffix);
  },
  classes: () => getJson<ApiClassesResponse>('/api/classes'),
  stats: () => getJson<ApiStatsResponse>('/api/stats'),
};
