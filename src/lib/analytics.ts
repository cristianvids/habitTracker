import { format, parseISO, subDays, subMonths, isAfter, isBefore, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns';

export interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

export interface DayRecord {
  date: string;
  completionRate: number;
  achievement: 'gold' | 'silver' | 'bronze' | 'failed';
  habits: Habit[];
  timestamp?: number;
}

export interface StreakData {
  habitId: string;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
}

export interface CompletionTrend {
  date: string;
  completionRate: number;
  achievement: string;
}

export interface WeeklyPattern {
  dayName: string;
  averageCompletion: number;
  totalDays: number;
}

export interface MonthlyPattern {
  week: string;
  averageCompletion: number;
  totalDays: number;
}

export const getFilteredRecords = (records: DayRecord[], period: '1month' | '6months' | '1year'): DayRecord[] => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '1month':
      startDate = subMonths(now, 1);
      break;
    case '6months':
      startDate = subMonths(now, 6);
      break;
    case '1year':
      startDate = subMonths(now, 12);
      break;
    default:
      startDate = subMonths(now, 1);
  }

  return records.filter(record => {
    const recordDate = parseISO(record.date);
    return isAfter(recordDate, startDate) || recordDate.toDateString() === startDate.toDateString();
  });
};

export const calculateStreaks = (records: DayRecord[]): StreakData[] => {
  if (records.length === 0) return [];

  // Get all unique habits
  const allHabits = new Map<string, string>();
  records.forEach(record => {
    record.habits.forEach(habit => {
      allHabits.set(habit.id, habit.name);
    });
  });

  // Sort records by date
  const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return Array.from(allHabits.entries()).map(([habitId, habitName]) => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate streaks
    for (let i = sortedRecords.length - 1; i >= 0; i--) {
      const record = sortedRecords[i];
      const habitCompleted = record.habits.find(h => h.id === habitId)?.completed || false;

      if (habitCompleted) {
        tempStreak++;
        if (i === sortedRecords.length - 1) {
          currentStreak = tempStreak;
        }
      } else {
        if (i === sortedRecords.length - 1) {
          currentStreak = 0;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      habitId,
      habitName,
      currentStreak,
      longestStreak
    };
  });
};

export const getCompletionTrends = (records: DayRecord[]): CompletionTrend[] => {
  return records
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(record => ({
      date: format(parseISO(record.date), 'MMM dd'),
      completionRate: record.completionRate,
      achievement: record.achievement
    }));
};

export const getWeeklyPatterns = (records: DayRecord[]): WeeklyPattern[] => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));

  records.forEach(record => {
    const dayIndex = getDay(parseISO(record.date));
    dayStats[dayIndex].total += record.completionRate;
    dayStats[dayIndex].count++;
  });

  return dayNames.map((dayName, index) => ({
    dayName,
    averageCompletion: dayStats[index].count > 0 ? dayStats[index].total / dayStats[index].count : 0,
    totalDays: dayStats[index].count
  }));
};

export const getMonthlyPatterns = (records: DayRecord[]): MonthlyPattern[] => {
  const weekStats = new Map<string, { total: number; count: number }>();

  records.forEach(record => {
    const recordDate = parseISO(record.date);
    const weekStart = startOfWeek(recordDate);
    const weekEnd = endOfWeek(recordDate);
    const weekKey = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`;

    if (!weekStats.has(weekKey)) {
      weekStats.set(weekKey, { total: 0, count: 0 });
    }

    const stats = weekStats.get(weekKey)!;
    stats.total += record.completionRate;
    stats.count++;
  });

  return Array.from(weekStats.entries()).map(([week, stats]) => ({
    week,
    averageCompletion: stats.count > 0 ? stats.total / stats.count : 0,
    totalDays: stats.count
  }));
};

export const getOverallStats = (records: DayRecord[]) => {
  if (records.length === 0) {
    return {
      totalDays: 0,
      averageCompletion: 0,
      goldDays: 0,
      silverDays: 0,
      bronzeDays: 0,
      failedDays: 0
    };
  }

  const achievements = records.reduce((acc, record) => {
    acc[record.achievement]++;
    return acc;
  }, { gold: 0, silver: 0, bronze: 0, failed: 0 } as Record<string, number>);

  const totalCompletion = records.reduce((sum, record) => sum + record.completionRate, 0);

  return {
    totalDays: records.length,
    averageCompletion: totalCompletion / records.length,
    goldDays: achievements.gold,
    silverDays: achievements.silver,
    bronzeDays: achievements.bronze,
    failedDays: achievements.failed
  };
};