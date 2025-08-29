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
  const currentYear = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [schoolYearStart, setSchoolYearStart] = useState<number>(currentYear);
  const [schoolYearEnd, setSchoolYearEnd] = useState<number>(currentYear + 1);
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
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [entriesRes, classesRes] = await Promise.all([
          api.entries(),
          api.classes(),
        ]);
        setEntries(entriesRes.entries);
        setClasses(classesRes.classes);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[DEBUG] Loaded entries:', entriesRes.entries.length, 'classes:', classesRes.classes.length);
        }
      } catch (e: any) {
        setError(e.message);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('[DEBUG] Fetch failed', e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Transform backend PlanEntryRow to Downtime shape for existing components
  const allDowntimes: Downtime[] = useMemo(() => {
    const list: Downtime[] = [];
  const normalizeClass = (c: string) => c.trim().toUpperCase(); // keep leading zeros to match selector
    entries.forEach((e, idx) => {
      // Resolve a valid date (scraper currently may set day='unknown')
      let dateObj: Date;
      if (e.day && /^\d{4}-\d{2}-\d{2}$/.test(e.day)) {
        dateObj = new Date(e.day + 'T00:00:00');
      } else if (e.createdAt) {
        dateObj = new Date(e.createdAt);
      } else {
        dateObj = new Date();
      }
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }
      // Determine reason
      let reason: Downtime['reason'] = 'Vertretung';
      if (e.cancelled || /Entfall/i.test(e.type || '')) reason = 'Ausfall';
      else if (/Raum/i.test(e.type || '')) reason = 'Raumwechsel';
      else if (/geändert|Verlegung/i.test(e.type || '')) reason = 'Verlegung';
      const periodStart = parseInt((e.lesson.match(/\d+/) || ['0'])[0], 10) || 0;
      (e.classes.length ? e.classes : ['Unbekannt']).forEach((clsRaw, cIdx) => {
        const cls = normalizeClass(clsRaw.trim());
        list.push({
          id: `${e.day}-${idx}-${cIdx}-${cls}`,
            date: dateObj,
          class: cls,
          subject: e.subject || e.originalSubject || '—',
          teacher: e.teacher || '—',
          reason,
          notes: e.text && e.text.trim() && e.text.trim() !== '\u00a0' ? e.text.trim() : undefined,
          period: periodStart
        });
      });
    });
    return list;
  }, [entries]);

  const downtimes = useMemo(() => {
    const startDate = new Date(schoolYearStart, 7, 1);
    const endDate = new Date(schoolYearEnd, 6, 31);
    return allDowntimes.filter(d => d.date >= startDate && d.date <= endDate);
  }, [allDowntimes, schoolYearStart, schoolYearEnd]);

  const classStats: ClassStats[] = useMemo(() => {
    const grouped: Record<string, Downtime[]> = {};
    downtimes.forEach(d => {
      grouped[d.class] = grouped[d.class] || [];
      grouped[d.class].push(d);
    });
    return Object.entries(grouped).map(([cls, list]) => {
      const byReason: Record<string, number> = {};
      list.forEach(l => { byReason[l.reason] = (byReason[l.reason] || 0) + 1; });
      return {
        class: cls,
        totalDowntimes: list.length,
        percentage: Math.round(Math.min(100, (list.length / 50) * 100) * 10) / 10,
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Vertretungsplan Tracker</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Ausfallverfolgung für Schulklassen</p>
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
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const base = currentYear - idx;
                      return <option key={base} value={base}>{base}</option>;
                    })}
                  </select>
                  <span className="mx-0.5">/</span>
                  <span>{schoolYearEnd}</span>
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

        {import.meta.env.DEV && (
          <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 space-y-1">
            <div>Debug: entries={entries.length} classes={classes.length} loading={String(loading)} error={error || '—'}</div>
            <div>SelectedClass: {selectedClass}</div>
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