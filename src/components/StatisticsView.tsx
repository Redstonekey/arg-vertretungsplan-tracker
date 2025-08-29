import React, { useMemo } from 'react';
import { BarChart, TrendingUp, TrendingDown, Calendar, Target, AlertCircle } from 'lucide-react';
import { Downtime, ClassStats, MonthStats } from '../types';

interface StatisticsViewProps {
  downtimes: Downtime[];
  classStats: ClassStats[];
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ downtimes, classStats }) => {
  const cancellationReasons = useMemo(() => ['Ausfall', 'Eigenverantw. Lernen'], []);

  const cancellationDowntimes = useMemo(() => downtimes.filter(dt => cancellationReasons.includes(dt.reason)), [downtimes, cancellationReasons]);

  const monthlyStats = useMemo((): MonthStats[] => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const currentMonth = new Date().getMonth();
    const stats: MonthStats[] = [];
    for (let i = 0; i < 6; i++) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
  const monthDowntimes = cancellationDowntimes.filter(dt => dt.date.getMonth() === monthIndex).length;
      stats.unshift({
        month: monthName,
        downtimes: monthDowntimes,
        percentage: (monthDowntimes / 40) * 100
      });
    }
    return stats;
  }, [cancellationDowntimes]);

  // Only cancellations (Ausfall + Eigenverantw. Lernen) are considered "Ausfälle" KPIs
  const totalCancellations = cancellationDowntimes.length;
  const averagePerClass = classStats.length ? Math.round((totalCancellations / classStats.length) * 10) / 10 : 0;
  const mostAffectedClass = classStats.length ? classStats.reduce((max, stat) => (stat.totalDowntimes > max.totalDowntimes ? stat : max), classStats[0]) : undefined;
  const leastAffectedClass = classStats.length ? classStats.reduce((min, stat) => (stat.totalDowntimes < min.totalDowntimes ? stat : min), classStats[0]) : undefined;

  const reasonStats = useMemo(() => {
    if (!downtimes.length) return [] as { reason: string; count: number; percentage: number }[];
    // Count all reasons across ALL downtimes (not just cancellations)
    const counts = downtimes.reduce((acc, dt) => {
      acc[dt.reason] = (acc[dt.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalForReasons = Object.values(counts).reduce((a, b) => a + b, 0) || 1; // avoid div by 0
    return Object.entries(counts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: Math.round((count / totalForReasons * 100) * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);
  }, [downtimes]);

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'Ausfall': return 'bg-red-500';
  case 'Vertretung': return 'bg-blue-500';
  case 'Eigenverantw. Lernen': return 'bg-purple-500';
      case 'Raumwechsel': return 'bg-yellow-500';
      case 'Verlegung': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <BarChart className="h-6 w-6 text-brand-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Statistiken</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[{
          label: 'Gesamte Ausfälle (nur Ausfall + Eigenverantw.)', value: totalCancellations, icon: <Calendar className="h-6 w-6 text-brand-600" />, iconBg: 'bg-brand-100 dark:bg-brand-500/10'
        }, {
          label: 'Durchschnitt/Klasse', value: averagePerClass, icon: <Target className="h-6 w-6 text-green-600" />, iconBg: 'bg-green-100 dark:bg-green-500/10'
        }, {
          label: 'Meiste Ausfälle', value: mostAffectedClass?.class, sub: `${mostAffectedClass?.totalDowntimes} Ausfälle`, icon: <TrendingUp className="h-6 w-6 text-red-600" />, iconBg: 'bg-red-100 dark:bg-red-500/10'
        }, {
          label: 'Wenigste Ausfälle', value: leastAffectedClass?.class, sub: `${leastAffectedClass?.totalDowntimes} Ausfälle`, icon: <TrendingDown className="h-6 w-6 text-green-600" />, iconBg: 'bg-green-100 dark:bg-green-500/10'
        }].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
                {c.sub && <p className="text-xs text-gray-500 dark:text-gray-500">{c.sub}</p>}
              </div>
              <div className={`p-3 rounded-lg ${c.iconBg}`}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Monatlicher Verlauf</h3>
          <div className="space-y-4">
            {monthlyStats.map((month, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-12 text-sm text-gray-600 dark:text-gray-400">{month.month}</div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-4 relative">
                  <div className="bg-brand-500 h-4 rounded-full transition-all duration-500" style={{ width: `${Math.min(month.percentage, 100)}%` }}></div>
                </div>
                <div className="w-16 text-sm text-gray-900 dark:text-gray-100 text-right">{month.downtimes}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ausfallgründe / Änderungen</h3>
          <div className="space-y-4">
            {reasonStats.map((stat, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded ${getReasonColor(stat.reason)}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stat.reason}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{stat.percentage}%</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${getReasonColor(stat.reason)}`} style={{ width: `${stat.percentage}%` }}></div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 w-8">{stat.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Klassenstatistiken</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Klasse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ausfälle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prozentsatz</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vorjahr</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {classStats.sort((a, b) => b.totalDowntimes - a.totalDowntimes).map(stat => (
                <tr key={stat.class} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-4 whitespace-nowrap"><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stat.class}</span></td>
                  <td className="px-4 py-4 whitespace-nowrap"><span className="text-sm text-gray-900 dark:text-gray-100">{stat.totalDowntimes}</span></td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-gray-200 dark:bg-gray-800 rounded-full h-2 w-16 mr-2">
                        <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${Math.min(stat.percentage, 100)}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{stat.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {stat.yearOverYear > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
                      <span className={`text-sm ${stat.yearOverYear > 0 ? 'text-red-600' : 'text-green-600'}`}>{stat.yearOverYear > 0 ? '+' : ''}{stat.yearOverYear}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {stat.yearOverYear > 15 && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {stat.yearOverYear < -15 && <TrendingDown className="h-4 w-4 text-green-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;