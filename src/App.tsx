import React, { useState, useMemo, useEffect } from 'react';
import { GraduationCap, Moon, Sun, CalendarRange } from 'lucide-react';
import { ViewMode, Downtime, ClassStats } from './types';
import { api, ApiPlanEntry } from './api';
import ClassSelector from './components/ClassSelector';
import Navigation from './components/Navigation';
import CalendarView from './components/CalendarView';
import ListView from './components/ListView';
import StatisticsView from './components/StatisticsView';

function App() {
  const [selectedClass, setSelectedClass] = useState<string>('Alle');
  const [currentView, setCurrentView] = useState<ViewMode>('calendar');
  // Academic year logic: School year starts August 1st. Start year equals calendar year if month >= Aug else year-1.
  const getSchoolYearStartYear = (d: Date) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1);
  const initialStart = (() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('schoolYearStart');
      if (stored && /^\d{4}$/.test(stored)) return parseInt(stored, 10);
    }
    return getSchoolYearStartYear(new Date());
  })();
  const [schoolYearStart, setSchoolYearStart] = useState<number>(initialStart);
  const [schoolYearEnd, setSchoolYearEnd] = useState<number>(initialStart + 1);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const [entries, setEntries] = useState<ApiPlanEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [pageSize] = useState<number>(300);
  const [offset, setOffset] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [entriesRes, classesRes] = await Promise.all([
          api.entries({ limit: pageSize, offset: 0, sort: 'asc' }),
          api.classes(),
        ]);
        setEntries(entriesRes.entries);
        setTotalEntries(entriesRes.total);
        setOffset(entriesRes.entries.length);
        setClasses(classesRes.classes);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[DEBUG] Loaded initial entries:', entriesRes.entries.length, 'of', entriesRes.total);
        }
      } catch (e: any) {
        setError(e.message);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('[DEBUG] Initial fetch failed', e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [pageSize]);

  const loadMore = async () => {
    if (isLoadingMore) return;
    if (entries.length >= totalEntries) return;
    try {
      setIsLoadingMore(true);
      const res = await api.entries({ limit: pageSize, offset, sort: 'asc' });
      setEntries(prev => [...prev, ...res.entries]);
      setOffset(offset + res.entries.length);
      setTotalEntries(res.total);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[DEBUG] Loaded more entries:', res.entries.length, 'offset now', offset + res.entries.length);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Transform backend PlanEntryRow to Downtime shape for existing components
  const allDowntimes: Downtime[] = useMemo(() => {
    const tmp: Downtime[] = [];
    const normalizeClass = (c: string) => c.trim().toUpperCase(); // keep leading zeros to match selector
    entries.forEach((e) => {
      // Resolve a valid date (scraper currently may set day='unknown')
      let dateObj: Date;
      if (e.day && /^\d{4}-\d{2}-\d{2}$/.test(e.day)) {
        dateObj = new Date(e.day + 'T00:00:00');
      } else if (e.createdAt) {
        dateObj = new Date(e.createdAt);
      } else {
        dateObj = new Date();
      }
      if (isNaN(dateObj.getTime())) dateObj = new Date();

      // Determine reason
      let reason: Downtime['reason'] = 'Vertretung';
      const teacherMarker = (e.teacher || '').trim();
      if (teacherMarker === 'Eigenverantw. Lernen') reason = 'Eigenverantw. Lernen';
      else if (e.cancelled || /Entfall/i.test(e.type || '')) reason = 'Ausfall';
      else if (/Raum/i.test(e.type || '')) reason = 'Raumwechsel';
      else if (/geändert|Verlegung/i.test(e.type || '')) reason = 'Verlegung';

      const periodStart = parseInt((e.lesson.match(/\d+/) || ['0'])[0], 10) || 0;
      (e.classes.length ? e.classes : ['Unbekannt']).forEach((clsRaw) => {
        const cls = normalizeClass(clsRaw.trim());
        const notes = e.text && e.text.trim() && e.text.trim() !== '\u00a0' ? e.text.trim() : undefined;
        // Build a stable composite key that intentionally ignores source_page to collapse duplicates
        const keyParts = [
          dateObj.toISOString().slice(0,10),
          cls,
          periodStart,
          (e.subject || e.originalSubject || '—').trim(),
          (e.teacher || '—').trim(),
          reason,
          notes || ''
        ];
        const compositeId = keyParts.join('|');
        tmp.push({
          id: compositeId,
          date: dateObj,
          class: cls,
          subject: e.subject || e.originalSubject || '—',
          teacher: e.teacher || '—',
          reason,
          notes,
          period: periodStart
        });
      });
    });
    // Deduplicate by composite id (first occurrence wins)
    const seen = new Set<string>();
    const deduped: Downtime[] = [];
    for (const d of tmp) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      deduped.push(d);
    }
    return deduped;
  }, [entries]);

  const downtimes = useMemo(() => {
    const startDate = new Date(schoolYearStart, 7, 1); // Aug 1
    const endDate = new Date(schoolYearEnd, 6, 31, 23, 59, 59, 999); // Jul 31 end of day
    return allDowntimes.filter(d => d.date >= startDate && d.date <= endDate);
  }, [allDowntimes, schoolYearStart, schoolYearEnd]);

  // Derive available school years from entries plus current and next year to future-proof.
  const schoolYearOptions = useMemo(() => {
    const years = new Set<number>();
    // Add from entries
    entries.forEach(e => {
      if (e.day && /^\d{4}-\d{2}-\d{2}$/.test(e.day)) {
        const d = new Date(e.day + 'T00:00:00');
        if (!isNaN(d.getTime())) years.add(getSchoolYearStartYear(d));
      } else if (e.createdAt) {
        const d = new Date(e.createdAt);
        if (!isNaN(d.getTime())) years.add(getSchoolYearStartYear(d));
      }
    });
    // Always include current and next school year start for early selection (e.g., before new data appears)
    const nowStart = getSchoolYearStartYear(new Date());
    years.add(nowStart);
    years.add(nowStart + 1); // upcoming year
    // Keep a reasonable window (e.g., last 8 years)
    const sorted = Array.from(years).sort((a,b)=>b-a).slice(0,8).sort((a,b)=>b-a); // ensure consistent order later
    return sorted.sort((a,b)=>b-a); // descending for dropdown (newest first)
  }, [entries]);

  // Persist selection
  useEffect(() => {
    try { localStorage.setItem('schoolYearStart', String(schoolYearStart)); } catch {}
  }, [schoolYearStart]);

  // Auto-rollover: if we stored an old year and it's now a new academic year, advance automatically (only once per session)
  useEffect(() => {
    const currentStart = getSchoolYearStartYear(new Date());
    if (schoolYearStart < currentStart) {
      setSchoolYearStart(currentStart);
      setSchoolYearEnd(currentStart + 1);
    }
  }, []); // run once

  const classStats: ClassStats[] = useMemo(() => {
    const grouped: Record<string, Downtime[]> = {};
    downtimes.forEach(d => {
      grouped[d.class] = grouped[d.class] || [];
      grouped[d.class].push(d);
    });
    return Object.entries(grouped).map(([cls, list]) => {
      const byReason: Record<string, number> = {};
      list.forEach(l => { byReason[l.reason] = (byReason[l.reason] || 0) + 1; });
      const cancellations = list.filter(l => l.reason === 'Ausfall' || l.reason === 'Eigenverantw. Lernen');
      const cancelCount = cancellations.length;
      return {
        class: cls,
        totalDowntimes: cancelCount, // Only echte Ausfälle + Eigenverantw. Lernen
        percentage: Math.round(Math.min(100, (cancelCount / 50) * 100) * 10) / 10,
        yearOverYear: 0,
        byReason
      };
    });
  }, [downtimes]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'calendar':
        return <CalendarView downtimes={downtimes} selectedClass={selectedClass} />;
      case 'list':
        return <ListView downtimes={downtimes} selectedClass={selectedClass} />;
      case 'statistics':
        return <StatisticsView downtimes={downtimes} classStats={classStats} />;
      default:
        return <CalendarView downtimes={downtimes} selectedClass={selectedClass} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-brand-600 rounded-lg shadow-sm">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div className="truncate">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">ARG Vertretungsplan Tracker</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Alle Änderungen jederzeit verfügbar!</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <CalendarRange className="h-4 w-4 text-brand-600" />
                <div className="flex items-center gap-1">
                  <select
                    value={schoolYearStart}
                    onChange={(e) => {
                      const start = parseInt(e.target.value, 10);
                      setSchoolYearStart(start);
                      setSchoolYearEnd(start + 1);
                    }}
                    className="bg-transparent border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:text-gray-100"
                  >
                    {schoolYearOptions.sort((a,b)=>b-a).map(base => (
                      <option key={base} value={base}>{base}/{String((base+1)%100).padStart(2,'0')}</option>
                    ))}
                  </select>
                  <span className="sr-only">bis</span>
                  <span aria-hidden="true" className="mx-0.5"> </span>
                </div>
              </div>
              <button
                onClick={() => setIsDark(d => !d)}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Theme wechseln"
              >
                {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
  <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && <div className="mb-4 text-sm text-red-600">Fehler: {error}</div>}
        {loading && <div className="mb-4 text-sm text-gray-500">Lade Daten...</div>}
        <ClassSelector
          selectedClass={selectedClass}
          onClassSelect={setSelectedClass}
          classesOverride={classes}
        />
        
        <Navigation 
          currentView={currentView} 
          onViewChange={setCurrentView} 
        />

        {renderCurrentView()}

        {/* Pagination control (only shown if more data available) */}
        {entries.length < totalEntries && !loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {isLoadingMore ? 'Lade...' : `Mehr laden (${entries.length}/${totalEntries})`}
            </button>
          </div>
        )}

    {import.meta.env.DEV && (
          <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 space-y-1">
            <div>Debug: entries={entries.length}/{totalEntries} classes={classes.length} loading={String(loading || isLoadingMore)} error={error || '—'}</div>
            <div>SelectedClass: {selectedClass}</div>
      <div>PageSize: {pageSize} Offset: {offset}</div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; 2025 Vertretungsplan Tracker. Entwickelt für die effiziente Ausfallverfolgung.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;