import React, { useState, useMemo } from 'react';
import { Users, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface ClassSelectorProps {
  selectedClass: string;
  onClassSelect: (className: string) => void;
  classesOverride?: string[]; // optional dynamic list from backend
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ selectedClass, onClassSelect, classesOverride }) => {
  const fallback = [
    '5A','5B','5C','6A','6B','6C','7A','7B','7C','8A','8B','8C','9A','9B','10A','10B'
  ];
  const allClasses: string[] = useMemo(() => {
    const set = new Set<string>();
    (classesOverride && classesOverride.length ? classesOverride : fallback).forEach(c => set.add(c.toUpperCase()));
    return Array.from(set).sort((a,b)=>a.localeCompare(b, 'de', { numeric: true }));
  }, [classesOverride]);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return allClasses;
  return allClasses.filter((c: string) => c.toLowerCase().includes(search.toLowerCase()));
  }, [search, allClasses]);

  const grouped = useMemo(() => {
    const groups: Record<string, string[]> = {};
    filtered.forEach((c: string) => {
      const grade = c.replace(/[^0-9].*$/, '');
      if (!groups[grade]) groups[grade] = [];
      groups[grade].push(c);
    });
    return Object.entries(groups).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));
  }, [filtered]);

  return (
    <div className="card-surface p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Klasse auswählen</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">(Aktuell: {selectedClass})</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setIsOpen(o => !o)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
          >
            {selectedClass === 'Alle' ? 'Alle Klassen' : `Klasse ${selectedClass}`}
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => onClassSelect('Alle')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all focus-ring ${selectedClass === 'Alle' ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              Alle
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {grouped.map(([grade, cls]) => (
              <div key={grade} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Klasse {grade}</div>
                <div className="flex flex-wrap gap-2">
                  {cls.map(cn => (
                    <button
                      key={cn}
                      onClick={() => onClassSelect(cn)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all focus-ring ${selectedClass === cn ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      {cn}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">Keine Treffer</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassSelector;