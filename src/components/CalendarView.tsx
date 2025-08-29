import React, { useMemo } from 'react';
import { Calendar, Clock, User, BookOpen } from 'lucide-react';
import { Downtime } from '../types';

interface CalendarViewProps {
  downtimes: Downtime[];
  selectedClass: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ downtimes, selectedClass }) => {
  const filteredDowntimes = useMemo(() => {
    if (selectedClass === 'Alle') return downtimes;
    const sel = selectedClass.toLowerCase();
    return downtimes.filter(dt => dt.class.toLowerCase() === sel);
  }, [downtimes, selectedClass]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Downtime[]> = {};
    
    filteredDowntimes.forEach(dt => {
      const dateKey = dt.date.toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(dt);
    });

    return groups;
  }, [filteredDowntimes]);

  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'Ausfall': return 'bg-red-100 text-red-800 border-red-200';
      case 'Vertretung': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Raumwechsel': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Verlegung': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-6 w-6 text-brand-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Kalenderansicht</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">({filteredDowntimes.length} Ausfälle)</span>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-12 card-surface">
          <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Keine Ausfälle für die gewählte Klasse gefunden.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateKey => (
            <div key={dateKey} className="card-surface p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {formatDate(dateKey)}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedByDate[dateKey]
                  .sort((a, b) => a.period - b.period)
                  .map(downtime => (
                    <div
                      key={downtime.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {downtime.class} - {downtime.period}. Stunde
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getReasonColor(downtime.reason)}`}>
                          {downtime.reason}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{downtime.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{downtime.teacher}</span>
                        </div>
                        {downtime.notes && (
                          <div className="flex items-start gap-2 pt-2">
                            <Clock className="h-4 w-4 mt-0.5" />
                            <span className="text-xs">{downtime.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarView;