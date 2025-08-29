import React, { useMemo, useState } from 'react';
import { List, Search, Filter, Calendar, Clock, User, BookOpen } from 'lucide-react';
import { Downtime } from '../types';

interface ListViewProps {
  downtimes: Downtime[];
  selectedClass: string;
}

const ListView: React.FC<ListViewProps> = ({ downtimes, selectedClass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState<string>('');

  const filteredDowntimes = useMemo(() => {
  let filtered = selectedClass === 'Alle' ? downtimes : downtimes.filter(dt => dt.class.toLowerCase() === selectedClass.toLowerCase());
    
    if (searchTerm) {
      filtered = filtered.filter(dt =>
        dt.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dt.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dt.class.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterReason) {
      filtered = filtered.filter(dt => dt.reason === filterReason);
    }

    return filtered;
  }, [downtimes, selectedClass, searchTerm, filterReason]);

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'Ausfall': return 'bg-red-100 text-red-800 border-red-200';
      case 'Vertretung': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Raumwechsel': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Verlegung': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <List className="h-6 w-6 text-brand-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Listenansicht</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">({filteredDowntimes.length} Ausfälle)</span>
      </div>

      {/* Filters */}
  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Fach, Lehrer oder Klasse suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Alle Gründe</option>
              <option value="Ausfall">Ausfall</option>
              <option value="Vertretung">Vertretung</option>
              <option value="Raumwechsel">Raumwechsel</option>
              <option value="Verlegung">Verlegung</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {filteredDowntimes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <List className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Keine Ausfälle gefunden.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Klasse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stunde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fach
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lehrer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Grund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notizen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredDowntimes.map((downtime) => (
                  <tr key={downtime.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{formatDate(downtime.date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{downtime.class}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{downtime.period}.</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{downtime.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{downtime.teacher}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getReasonColor(downtime.reason)}`}>
                        {downtime.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      {downtime.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;