/**
 * Timeframe Filtering Engine (Tuần, Tháng, Custom Range)
 */

import { Trade } from '../types/trading';
import { parseMt5Timestamp } from './mt5Parser';

export type TimeframePreset =
  | 'all'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'specific_month'
  | 'specific_week'
  | 'custom';

export interface TimeframeFilter {
  type: TimeframePreset;
  selectedMonth?: string; // 'YYYY-MM'
  selectedWeek?: string;  // 'YYYY-Wxx'
  startDate?: string;    // 'YYYY-MM-DD'
  endDate?: string;      // 'YYYY-MM-DD'
}

/**
 * Helper to get ISO week number and year
 */
export function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * Extract all distinct months available in the trade dataset
 */
export function getAvailableMonths(trades: Trade[]): { key: string; label: string; count: number }[] {
  const map = new Map<string, number>();

  trades.forEach((t) => {
    // t.c is 'YYYY.MM.DD HH:mm:ss'
    const parts = t.c.split(' ')[0].split('.');
    if (parts.length >= 2) {
      const key = `${parts[0]}-${parts[1]}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  });

  return Array.from(map.entries())
    .map(([key, count]) => {
      const [y, m] = key.split('-');
      return {
        key,
        label: `Tháng ${m}/${y}`,
        count,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Extract all distinct weeks available in the trade dataset
 */
export function getAvailableWeeks(
  trades: Trade[]
): { key: string; label: string; start: string; end: string; count: number }[] {
  const map = new Map<string, { start: string; end: string; count: number }>();

  trades.forEach((t) => {
    const ts = parseMt5Timestamp(t.c);
    if (!ts) return;
    const d = new Date(ts);
    const { year, week } = getIsoWeek(d);
    const key = `${year}-W${String(week).padStart(2, '0')}`;

    const dateStr = t.c.split(' ')[0];
    if (!map.has(key)) {
      map.set(key, { start: dateStr, end: dateStr, count: 1 });
    } else {
      const entry = map.get(key)!;
      entry.count++;
      if (dateStr < entry.start) entry.start = dateStr;
      if (dateStr > entry.end) entry.end = dateStr;
    }
  });

  return Array.from(map.entries())
    .map(([key, val]) => {
      const weekNum = key.split('-W')[1];
      return {
        key,
        label: `Tuần ${weekNum} (${val.start} – ${val.end})`,
        start: val.start,
        end: val.end,
        count: val.count,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Filter trades by timeframe criteria
 */
export function filterTradesByTimeframe(trades: Trade[], filter: TimeframeFilter): Trade[] {
  if (filter.type === 'all' || trades.length === 0) {
    return trades;
  }

  // Find latest trade timestamp in dataset as reference 'now' if test/historic data
  const timestamps = trades.map((t) => parseMt5Timestamp(t.c)).filter((ts) => ts > 0);
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  const refDate = new Date(maxTs);

  if (filter.type === 'specific_month' && filter.selectedMonth) {
    // filter.selectedMonth is 'YYYY-MM'
    return trades.filter((t) => {
      const d = t.c.split(' ')[0].replace(/\./g, '-');
      return d.startsWith(filter.selectedMonth!);
    });
  }

  if (filter.type === 'specific_week' && filter.selectedWeek) {
    return trades.filter((t) => {
      const ts = parseMt5Timestamp(t.c);
      if (!ts) return false;
      const { year, week } = getIsoWeek(new Date(ts));
      const k = `${year}-W${String(week).padStart(2, '0')}`;
      return k === filter.selectedWeek;
    });
  }

  if (filter.type === 'this_month') {
    const y = refDate.getUTCFullYear();
    const m = String(refDate.getUTCMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}`;
    return trades.filter((t) => {
      const d = t.c.split(' ')[0].replace(/\./g, '-');
      return d.startsWith(prefix);
    });
  }

  if (filter.type === 'last_month') {
    const prevMonthDate = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() - 1, 1));
    const y = prevMonthDate.getUTCFullYear();
    const m = String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}`;
    return trades.filter((t) => {
      const d = t.c.split(' ')[0].replace(/\./g, '-');
      return d.startsWith(prefix);
    });
  }

  if (filter.type === 'this_week') {
    const { year, week } = getIsoWeek(refDate);
    const targetKey = `${year}-W${String(week).padStart(2, '0')}`;
    return trades.filter((t) => {
      const ts = parseMt5Timestamp(t.c);
      if (!ts) return false;
      const { year: y, week: w } = getIsoWeek(new Date(ts));
      return `${y}-W${String(w).padStart(2, '0')}` === targetKey;
    });
  }

  if (filter.type === 'last_week') {
    const prevWeekDate = new Date(refDate.getTime() - 7 * 86400000);
    const { year, week } = getIsoWeek(prevWeekDate);
    const targetKey = `${year}-W${String(week).padStart(2, '0')}`;
    return trades.filter((t) => {
      const ts = parseMt5Timestamp(t.c);
      if (!ts) return false;
      const { year: y, week: w } = getIsoWeek(new Date(ts));
      return `${y}-W${String(w).padStart(2, '0')}` === targetKey;
    });
  }

  if (filter.type === 'custom') {
    return trades.filter((t) => {
      const dateStr = t.c.split(' ')[0].replace(/\./g, '-');
      if (filter.startDate && dateStr < filter.startDate) return false;
      if (filter.endDate && dateStr > filter.endDate) return false;
      return true;
    });
  }

  return trades;
}
