import React from 'react';
import { Calendar, List, BarChart } from 'lucide-react';
import { ViewMode } from '../types';

interface NavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'calendar' as ViewMode, label: 'Kalender', icon: Calendar },
    { id: 'list' as ViewMode, label: 'Liste', icon: List },
    { id: 'statistics' as ViewMode, label: 'Statistiken', icon: BarChart },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-2 mb-6">
      <div className="flex gap-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus-ring ${
              currentView === id
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;