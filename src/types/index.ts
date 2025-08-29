export interface Downtime {
  id: string;
  date: Date;
  class: string;
  subject: string;
  teacher: string;
  reason: 'Ausfall' | 'Vertretung' | 'Raumwechsel' | 'Verlegung';
  notes?: string;
  period: number;
}

export interface ClassStats {
  class: string;
  totalDowntimes: number;
  percentage: number;
  yearOverYear: number;
  byReason: Record<string, number>;
}

export type ViewMode = 'calendar' | 'list' | 'statistics';

export interface MonthStats {
  month: string;
  downtimes: number;
  percentage: number;
}