import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { DayStats, Trade } from '../types/trading';
import { generateCalendarMonthData } from '../utils/analyticsEngine';

interface CalendarHeatmapProps {
  trades: Trade[];
  onSelectDate: (dateStr: string) => void;
  selectedDate: string | null;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  trades,
  onSelectDate,
  selectedDate,
}) => {
  // Calendar month state (default Oct 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 1-12

  const dayStatsMap = useMemo(() => {
    return generateCalendarMonthData(trades, currentYear, currentMonth);
  }, [trades, currentYear, currentMonth]);

  // Find max daily P&L in this month for relative opacity calculation
  const maxDayPl = useMemo(() => {
    let max = 1;
    dayStatsMap.forEach((st) => {
      if (Math.abs(st.netPl) > max) max = Math.abs(st.netPl);
    });
    return max;
  }, [dayStatsMap]);

  // First day of month day-of-week: 0=Sun, 1=Mon, ..., 6=Sat
  const firstDayJs = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).getUTCDay();
  // We want Mon=0, Tue=1, ..., Sun=6
  const startOffset = firstDayJs === 0 ? 6 : firstDayJs - 1;
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();

  // Generate 8-column calendar weeks (Mon-Sun + Weekly Summary)
  const calendarRows = useMemo(() => {
    const rows: {
      days: (DayStats | null)[];
      weekNetPl: number;
      weekTradesCount: number;
      weekWinCount: number;
      weekLossCount: number;
    }[] = [];

    let currentDay = 1;
    while (currentDay <= daysInMonth) {
      const weekDays: (DayStats | null)[] = [];
      let weekPl = 0;
      let weekTrades = 0;
      let weekWins = 0;
      let weekLosses = 0;

      for (let col = 0; col < 7; col++) {
        if (rows.length === 0 && col < startOffset) {
          weekDays.push(null);
        } else if (currentDay <= daysInMonth) {
          const st = dayStatsMap.get(currentDay) || null;
          weekDays.push(st);
          if (st) {
            weekPl += st.netPl;
            weekTrades += st.tradesCount;
            weekWins += st.winsCount;
            weekLosses += st.lossesCount;
          }
          currentDay++;
        } else {
          weekDays.push(null);
        }
      }

      rows.push({
        days: weekDays,
        weekNetPl: Math.round(weekPl * 100) / 100,
        weekTradesCount: weekTrades,
        weekWinCount: weekWins,
        weekLossCount: weekLosses,
      });
    }

    return rows;
  }, [dayStatsMap, daysInMonth, startOffset]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (st: DayStats) => {
    if (st.tradesCount === 0) return;
    onSelectDate(st.dateStr);

    // Scroll to #lich-su
    const el = document.getElementById('lich-su');
    if (el) {
      const topOffset = 70;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Daily P&L Bar Chart Data
  const dailyChartData = useMemo(() => {
    const list: DayStats[] = [];
    dayStatsMap.forEach((st) => {
      if (st.tradesCount > 0) list.push(st);
    });
    return list.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [dayStatsMap]);

  return (
    <section id="lich" className="py-6 sm:py-8 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[var(--gold)]" />
            <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
              Lịch P&L Heatmap & Hiệu suất Ngày
            </h2>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            Bấm vào bất kỳ ô ngày có giao dịch để xem chi tiết danh sách lệnh tương ứng bên dưới
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-1 shadow-xs">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--sunk)] text-[var(--ink)] transition-colors"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 font-bold text-xs sm:text-sm text-[var(--ink)] tabular-nums min-w-[120px] text-center">
            Tháng {String(currentMonth).padStart(2, '0')} / {currentYear}
          </div>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--sunk)] text-[var(--ink)] transition-colors"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8-Column Heatmap Grid */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-6 shadow-xs overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Weekday Headers: Mon-Sun + Week Summary */}
          <div className="grid grid-cols-8 gap-2 mb-2 text-center text-xs font-semibold text-[var(--muted)]">
            <div>Thứ Hai</div>
            <div>Thứ Ba</div>
            <div>Thứ Tư</div>
            <div>Thứ Năm</div>
            <div>Thứ Sáu</div>
            <div>Thứ Bảy</div>
            <div>Chủ Nhật</div>
            <div className="text-[var(--gold)] font-bold">Tổng kết Tuần</div>
          </div>

          {/* Calendar Rows */}
          <div className="space-y-2">
            {calendarRows.map((row, rIdx) => {
              const weekPl = row.weekNetPl;
              const isWeekWin = weekPl >= 0;

              return (
                <div key={`cal-row-${rIdx}`} className="grid grid-cols-8 gap-2">
                  {/* Days 1 to 7 */}
                  {row.days.map((day, cIdx) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${cIdx}`}
                          className="h-20 sm:h-24 rounded-xl bg-[var(--sunk)]/20 border border-transparent"
                        />
                      );
                    }

                    const hasTrades = day.tradesCount > 0;
                    const isWin = day.netPl >= 0;
                    const isSelected = selectedDate === day.dateStr;

                    // Compute heat color intensity
                    const intensity = hasTrades
                      ? Math.min(1, Math.max(0.12, Math.abs(day.netPl) / maxDayPl))
                      : 0;

                    let bgStyle = 'bg-[var(--sunk)]/40 text-[var(--muted)] border-[var(--line)]';
                    if (hasTrades) {
                      if (isWin) {
                        bgStyle = isSelected
                          ? 'ring-2 ring-[var(--win)] bg-[var(--win)]/25 text-[var(--win)] border-[var(--win)]'
                          : 'bg-[var(--win)]/15 hover:bg-[var(--win)]/25 text-[var(--win)] border-[var(--win)]/30';
                      } else {
                        bgStyle = isSelected
                          ? 'ring-2 ring-[var(--loss)] bg-[var(--loss)]/25 text-[var(--loss)] border-[var(--loss)]'
                          : 'bg-[var(--loss)]/15 hover:bg-[var(--loss)]/25 text-[var(--loss)] border-[var(--loss)]/30';
                      }
                    }

                    return (
                      <button
                        key={`day-${day.dateStr}`}
                        onClick={() => handleDayClick(day)}
                        disabled={!hasTrades}
                        className={`h-20 sm:h-24 rounded-xl border p-2 flex flex-col justify-between text-left transition-all ${bgStyle} ${
                          hasTrades ? 'cursor-pointer hover:scale-[1.02] shadow-xs' : 'cursor-default opacity-50'
                        }`}
                        title={
                          hasTrades
                            ? `Ngày ${day.displayDate}: P&L ${day.netPl >= 0 ? '+' : ''}$${day.netPl} (${day.tradesCount} lệnh, ${day.winRate}% win)`
                            : `Ngày ${day.displayDate}: Không có giao dịch`
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-[var(--ink)] tabular-nums">
                            {day.displayDate.split('/')[0]}
                          </span>
                          {hasTrades && (
                            <span className="text-[10px] font-mono px-1 rounded bg-[var(--surface)] text-[var(--ink)] shadow-2xs">
                              {day.tradesCount}L
                            </span>
                          )}
                        </div>

                        {hasTrades ? (
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-xs sm:text-sm font-mono tabular-nums leading-tight">
                              {day.netPl >= 0 ? `+$${day.netPl}` : `-$${Math.abs(day.netPl)}`}
                            </div>
                            <div className="text-[10px] opacity-80 flex items-center justify-between font-mono">
                              <span>{day.winRate}%</span>
                              <span>{day.totalLots}L</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-center opacity-40 italic">--</div>
                        )}
                      </button>
                    );
                  })}

                  {/* Column 8: Weekly Summary (Nền viền nét đứt) */}
                  <div
                    className={`h-20 sm:h-24 rounded-xl border-2 border-dashed p-2 sm:p-2.5 flex flex-col justify-between ${
                      row.weekTradesCount > 0
                        ? isWeekWin
                          ? 'border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]'
                          : 'border-[var(--loss)]/40 bg-[var(--loss)]/10 text-[var(--loss)]'
                        : 'border-[var(--line)] bg-[var(--sunk)]/30 text-[var(--muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="uppercase text-[10px] tracking-wider text-[var(--muted)]">Tuần</span>
                      {row.weekTradesCount > 0 && (
                        <span className="font-mono text-[10px] px-1 rounded bg-[var(--surface)] text-[var(--ink)]">
                          {row.weekTradesCount} lệnh
                        </span>
                      )}
                    </div>

                    {row.weekTradesCount > 0 ? (
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm font-mono tabular-nums">
                          {weekPl >= 0 ? `+$${weekPl}` : `-$${Math.abs(weekPl)}`}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-mono">
                          {row.weekWinCount}W / {row.weekLossCount}L
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-center text-[var(--muted)] italic">--</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily P&L Bar Chart below the Calendar */}
      {dailyChartData.length > 0 && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--brand)]" />
              Biểu đồ Cột P&L Từng Ngày ({currentMonth}/{currentYear})
            </h3>
            <span className="text-xs text-[var(--muted)]">
              (Dưới chân cột: Ngày & Số lệnh đã đóng)
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[650px] h-48 flex items-end gap-2 pt-6 pb-8 border-b border-[var(--line)] relative">
              {/* Zero reference line */}
              <div className="absolute left-0 right-0 top-1/2 border-t border-[var(--muted)]/40 border-dashed" />

              {dailyChartData.map((d) => {
                const isPos = d.netPl >= 0;
                const maxVal = Math.max(50, ...dailyChartData.map((item) => Math.abs(item.netPl)));
                const heightPct = Math.min(45, (Math.abs(d.netPl) / maxVal) * 45);
                const isSelected = selectedDate === d.dateStr;

                return (
                  <div
                    key={`bar-${d.dateStr}`}
                    onClick={() => handleDayClick(d)}
                    className="flex-1 flex flex-col items-center justify-center relative group cursor-pointer"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ink)] text-[var(--bg)] text-[10px] font-mono px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                      {d.displayDate}: {d.netPl >= 0 ? '+' : ''}${d.netPl} ({d.tradesCount} lệnh)
                    </div>

                    {/* Bar above zero */}
                    {isPos ? (
                      <div className="w-full flex flex-col items-center justify-end h-20">
                        <span className="text-[10px] font-bold text-[var(--win)] font-mono tabular-nums mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          +${d.netPl}
                        </span>
                        <div
                          style={{ height: `${heightPct * 2}%` }}
                          className={`w-full max-w-[28px] rounded-t-sm transition-all ${
                            isSelected
                              ? 'bg-[var(--win)] ring-2 ring-[var(--gold)]'
                              : 'bg-[var(--win)]/80 hover:bg-[var(--win)]'
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="h-20" />
                    )}

                    {/* Bar below zero */}
                    {!isPos ? (
                      <div className="w-full flex flex-col items-center justify-start h-20">
                        <div
                          style={{ height: `${heightPct * 2}%` }}
                          className={`w-full max-w-[28px] rounded-b-sm transition-all ${
                            isSelected
                              ? 'bg-[var(--loss)] ring-2 ring-[var(--gold)]'
                              : 'bg-[var(--loss)]/80 hover:bg-[var(--loss)]'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-[var(--loss)] font-mono tabular-nums mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          -${Math.abs(d.netPl)}
                        </span>
                      </div>
                    ) : (
                      <div className="h-20" />
                    )}

                    {/* Date and Trades Count Label under each column */}
                    <div className="absolute -bottom-7 flex flex-col items-center text-[10px] font-mono text-[var(--muted)]">
                      <span className="font-semibold text-[var(--ink)]">{d.displayDate}</span>
                      <span className="text-[9px]">({d.tradesCount}L)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
