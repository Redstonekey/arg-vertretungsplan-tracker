import { Downtime, ClassStats } from '../types';

// Generate mock downtime data
export const generateMockDowntimes = (): Downtime[] => {
  const classes = ['5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c', '8a', '8b', '8c', '9a', '9b', '10a', '10b'];
  const subjects = ['Mathematik', 'Deutsch', 'Englisch', 'Geschichte', 'Biologie', 'Chemie', 'Physik', 'Sport', 'Kunst', 'Musik'];
  const teachers = ['Herr Schmidt', 'Frau Mueller', 'Herr Weber', 'Frau Fischer', 'Herr Wagner', 'Frau Becker'];
  const reasons: Array<'Ausfall' | 'Vertretung' | 'Raumwechsel' | 'Verlegung'> = ['Ausfall', 'Vertretung', 'Raumwechsel', 'Verlegung'];

  const downtimes: Downtime[] = [];
  
  // Generate data for the last 3 months
  for (let i = 0; i < 150; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 90));
    
    downtimes.push({
      id: `dt-${i}`,
      date,
      class: classes[Math.floor(Math.random() * classes.length)],
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      teacher: teachers[Math.floor(Math.random() * teachers.length)],
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      notes: Math.random() > 0.7 ? 'Zusätzliche Informationen' : undefined,
      period: Math.floor(Math.random() * 8) + 1
    });
  }

  return downtimes.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const generateMockStats = (downtimes: Downtime[]): ClassStats[] => {
  const classes = ['5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c', '8a', '8b', '8c', '9a', '9b', '10a', '10b'];
  
  return classes.map(className => {
    const classDowntimes = downtimes.filter(dt => dt.class === className);
    const totalDowntimes = classDowntimes.length;
    const percentage = (totalDowntimes / 50) * 100; // Assuming 50 total possible periods
    const yearOverYear = (Math.random() - 0.5) * 40; // Random -20% to +20%
    
    const byReason = classDowntimes.reduce((acc, dt) => {
      acc[dt.reason] = (acc[dt.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      class: className,
      totalDowntimes,
      percentage: Math.round(percentage * 10) / 10,
      yearOverYear: Math.round(yearOverYear * 10) / 10,
      byReason
    };
  });
};