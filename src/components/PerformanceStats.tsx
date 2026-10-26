import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { Trade } from '../types/trading';
import {
  PerformanceMetrics,
  computeBreakdowns,
} from '../utils/analyticsEngine';

interface PerformanceStatsProps {
  trades: Trade[];
  metrics: PerformanceMetrics;
  timezoneOffset: number;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  trades,
  metrics,
  timezoneOffset,
}) => {
  const breakdowns = useMemo(() => {
    return computeBreakdowns(trades, timezoneOffset);
  }, [trades, timezoneOffset]);

  const {
    hourlyStats,
    dayStats,
    durationBuckets,
    sessionStats,
    histogramBins,
    slComparison,
    top3Wins,
    top3Losses,
    sideBreakdown,
    reasons,
  } = breakdowns;

  return (
    <section id="thong-ke" className="py-6 sm:py-8 space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
            Thống kê Hiệu suất & Phân tích Đa chiều
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">
          Bảng đối soát 14 chỉ số cốt lõi và các góc cắt phân tích thời gian, phiên, hành vi
        </p>
      </div>

      {/* Top 2 Columns: 14 Core Metrics (Left) vs Side & Exit Breakdowns (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Win/Loss Progress Bar & 14 Metrics */}
        <div className="lg:col-span-7 bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--ink)]">
              Tỷ lệ Thắng/Thua Trực quan & 14 Chỉ số KV
            </h3>
            <span className="text-xs font-mono font-semibold text-[var(--win)]">
              {metrics.winRate}% Win
            </span>
          </div>

          {/* Win/Loss Horizontal Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-4 bg-[var(--sunk)] rounded-full overflow-hidden flex">
              <div
                style={{ width: `${metrics.winRate}%` }}
                className="bg-[var(--win)] h-full transition-all duration-500"
                title={`Thắng: ${metrics.winCount} lệnh (${metrics.winRate}%)`}
              />
              <div
                style={{ width: `${100 - metrics.winRate}%` }}
                className="bg-[var(--loss)] h-full transition-all duration-500"
                title={`Thua: ${metrics.lossCount} lệnh (${Math.round((100 - metrics.winRate) * 100) / 100}%)`}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-[var(--win)] font-semibold">
                ● {metrics.winCount} Lệnh Thắng ({metrics.winRate}%)
              </span>
              <span className="text-[var(--loss)] font-semibold">
                ● {metrics.lossCount} Lệnh Thua ({Math.round((100 - metrics.winRate) * 100) / 100}%)
              </span>
            </div>
          </div>

          {/* 14 Metrics Table */}
          <div className="border border-[var(--line)] rounded-xl overflow-hidden divide-y divide-[var(--line)] text-xs">
            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/50 font-medium">
              <span className="text-[var(--muted)]">1. Tổng Lợi nhuận ròng (Net Profit)</span>
              <span className={`font-mono font-bold text-right tabular-nums ${metrics.netProfit >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>
                {metrics.netProfit >= 0 ? `+$${metrics.netProfit.toLocaleString()}` : `-$${Math.abs(metrics.netProfit).toLocaleString()}`}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">2. Tổng Lãi gộp (Gross Win)</span>
              <span className="font-mono font-semibold text-right text-[var(--win)] tabular-nums">
                +${metrics.grossWin.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/30">
              <span className="text-[var(--muted)]">3. Tổng Lỗ gộp (Gross Loss)</span>
              <span className="font-mono font-semibold text-right text-[var(--loss)] tabular-nums">
                -${metrics.grossLoss.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">4. Hệ số Lợi nhuận (Profit Factor - PF)</span>
              <span className="font-mono font-bold text-right text-[var(--ink)] tabular-nums">
                {metrics.profitFactor}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/30">
              <span className="text-[var(--muted)]">5. Kỳ vọng toán học (Expectancy)</span>
              <span className="font-mono font-semibold text-right text-[var(--win)] tabular-nums">
                +${metrics.expectancy} / lệnh
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">6. TB Lệnh Thắng (Avg Win)</span>
              <span className="font-mono text-right text-[var(--win)] tabular-nums">
                +${metrics.avgWin}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/30">
              <span className="text-[var(--muted)]">7. TB Lệnh Thua (Avg Loss)</span>
              <span className="font-mono text-right text-[var(--loss)] tabular-nums">
                -${metrics.avgLoss}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">8. Tỷ lệ Lãi / Lỗ (Win / Loss Ratio)</span>
              <span className="font-mono text-right font-medium text-[var(--ink)] tabular-nums">
                1 : {metrics.winLossRatio}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/30">
              <span className="text-[var(--muted)]">9. Tỷ lệ Thắng hòa vốn (Breakeven Winrate)</span>
              <span className="font-mono text-right text-[var(--gold)] tabular-nums">
                {metrics.breakevenWinRate}%
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">10. Lệnh Lãi lớn nhất (Max Win)</span>
              <span className="font-mono text-right text-[var(--win)] font-semibold tabular-nums">
                +${metrics.bestTrade ? metrics.bestTrade.pl : '0'} ({metrics.bestTrade?.o.split(' ')[0]})
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/30">
              <span className="text-[var(--muted)]">11. Lệnh Lỗ nặng nhất (Max Loss)</span>
              <span className="font-mono text-right text-[var(--loss)] font-semibold tabular-nums">
                -${metrics.worstTrade ? Math.abs(metrics.worstTrade.pl) : '0'} ({metrics.worstTrade?.o.split(' ')[0]})
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">12. Thời gian giữ lệnh trung vị (Median Duration)</span>
              <span className="font-mono text-right text-[var(--ink)] tabular-nums">
                {metrics.medianDurationMinutes} phút
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5 bg-[var(--sunk)]/30">
              <span className="text-[var(--muted)]">13. Sharpe Ratio</span>
              <span className="font-mono font-bold text-right text-[var(--ink)] tabular-nums">
                {metrics.sharpeRatio}
              </span>
            </div>

            <div className="grid grid-cols-2 p-2.5">
              <span className="text-[var(--muted)]">14. Recovery Factor (Hệ số phục hồi)</span>
              <span className="font-mono font-bold text-right text-[var(--brand)] tabular-nums">
                {metrics.recoveryFactor} (Phí/Swap: ${metrics.totalCommissionSwap})
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Buy vs Sell, Exit Reasons, Streaks */}
        <div className="lg:col-span-5 space-y-5">
          {/* Buy vs Sell Table */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-[var(--ink)] flex items-center justify-between">
              <span>Bảng Đối Sánh: Buy vs Sell</span>
              <span className="text-xs font-normal text-[var(--muted)]">Thiên hướng giao dịch</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                    <th className="py-2 font-medium">Chiều</th>
                    <th className="py-2 font-medium text-center">Số lệnh</th>
                    <th className="py-2 font-medium text-center">Lots</th>
                    <th className="py-2 font-medium text-center">Win%</th>
                    <th className="py-2 font-medium text-right">Net P&L</th>
                    <th className="py-2 font-medium text-right">PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
                  <tr>
                    <td className="py-2.5 font-bold text-[var(--win)] flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Buy
                    </td>
                    <td className="py-2.5 text-center">{sideBreakdown.buy.count}</td>
                    <td className="py-2.5 text-center">{sideBreakdown.buy.totalLots}</td>
                    <td className="py-2.5 text-center font-semibold">{sideBreakdown.buy.winRate}%</td>
                    <td className="py-2.5 text-right font-bold text-[var(--win)]">
                      +${sideBreakdown.buy.netPl}
                    </td>
                    <td className="py-2.5 text-right">{sideBreakdown.buy.profitFactor}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-[var(--loss)] flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Sell
                    </td>
                    <td className="py-2.5 text-center">{sideBreakdown.sell.count}</td>
                    <td className="py-2.5 text-center">{sideBreakdown.sell.totalLots}</td>
                    <td className="py-2.5 text-center font-semibold">{sideBreakdown.sell.winRate}%</td>
                    <td className="py-2.5 text-right font-bold text-[var(--win)]">
                      +${sideBreakdown.sell.netPl}
                    </td>
                    <td className="py-2.5 text-right">{sideBreakdown.sell.profitFactor}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Exit Reasons Table */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-[var(--ink)] flex items-center justify-between">
              <span>Bảng Cách Đóng Lệnh</span>
              <span className="text-xs font-normal text-[var(--muted)]">Tâm lý chốt lời & cắt lỗ</span>
            </h3>

            <div className="space-y-2 text-xs">
              {/* Đóng tay */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--sunk)]/50 border border-[var(--line)]">
                <div>
                  <span className="font-semibold text-[var(--ink)]">Đóng bằng tay (Manual)</span>
                  <p className="text-[10px] text-[var(--muted)]">Chủ động đóng trước mục tiêu</p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="font-bold text-sm">{reasons.manual.length}</span>
                  <span className="text-[var(--muted)] ml-1">
                    ({Math.round((reasons.manual.length / trades.length) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Chạm TP */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--win)]/10 border border-[var(--win)]/30">
                <div>
                  <span className="font-semibold text-[var(--win)]">Chạm Take Profit [tp]</span>
                  <p className="text-[10px] text-[var(--muted)]">Đạt mục tiêu tự động</p>
                </div>
                <div className="text-right font-mono tabular-nums text-[var(--win)]">
                  <span className="font-bold text-sm">{reasons.tp.length}</span>
                  <span className="ml-1">
                    ({Math.round((reasons.tp.length / trades.length) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Chạm SL */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--loss)]/10 border border-[var(--loss)]/30">
                <div>
                  <span className="font-semibold text-[var(--loss)]">Chạm Stop Loss [sl]</span>
                  <p className="text-[10px] text-[var(--muted)]">Kích hoạt chốt chặn rủi ro</p>
                </div>
                <div className="text-right font-mono tabular-nums text-[var(--loss)]">
                  <span className="font-bold text-sm">{reasons.sl.length}</span>
                  <span className="ml-1">
                    ({Math.round((reasons.sl.length / trades.length) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Win/Loss Streaks Table */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-2">
            <h3 className="font-bold text-sm text-[var(--ink)]">Chuỗi Thắng / Thua Liên Tiếp</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--win)]/10 border border-[var(--win)]/30 text-[var(--win)]">
                <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Chuỗi Thắng Dài Nhất</span>
                <div className="text-2xl font-extrabold font-mono mt-1 tabular-nums">{metrics.longestWinStreak} lệnh</div>
                <span className="text-[11px] opacity-90 mt-1 block">Trung bình: {metrics.avgWinStreak} lệnh/chuỗi</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--loss)]/10 border border-[var(--loss)]/30 text-[var(--loss)]">
                <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Chuỗi Thua Dài Nhất</span>
                <div className="text-2xl font-extrabold font-mono mt-1 tabular-nums">{metrics.longestLossStreak} lệnh</div>
                <span className="text-[11px] opacity-90 mt-1 block">Trung bình: {metrics.avgLossStreak} lệnh/chuỗi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Deep-Dive Analysis Blocks */}
      <div className="space-y-6 pt-2">
        <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--gold)]" />
          6 Khối Phân Tích Chuyên Sâu Hành Vi Giao Dịch
        </h3>

        {/* Grid of 4 Bar Charts: Hourly, DayOfWeek, Duration, Session */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Hourly Chart (0-23h VN) */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-[var(--ink)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--brand)]" />
                1. Theo Khung Giờ Mở Lệnh (0h – 23h Giờ VN)
              </span>
              <span className="text-[11px] text-[var(--muted)]">Lọc giờ vàng</span>
            </div>

            <div className="h-40 flex items-end gap-1 pt-6 pb-5 border-b border-[var(--line)] overflow-x-auto">
              {hourlyStats.map((st) => {
                const maxHPl = Math.max(20, ...hourlyStats.map((h) => Math.abs(h.netPl)));
                const barHeight = Math.min(100, (Math.abs(st.netPl) / maxHPl) * 100);
                const isPos = st.netPl >= 0;

                return (
                  <div
                    key={`h-${st.hourVN}`}
                    className="flex-1 min-w-[12px] flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ink)] text-[var(--bg)] text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {st.hourVN}h VN: {st.netPl >= 0 ? '+' : ''}${st.netPl} ({st.count}L)
                    </div>

                    <div
                      style={{ height: `${Math.max(4, barHeight)}%` }}
                      className={`w-full rounded-t-xs transition-colors ${
                        st.count === 0
                          ? 'bg-[var(--line)]/40'
                          : isPos
                          ? 'bg-[var(--win)]/80 hover:bg-[var(--win)]'
                          : 'bg-[var(--loss)]/80 hover:bg-[var(--loss)]'
                      }`}
                    />
                    <span className="absolute -bottom-4 text-[9px] font-mono text-[var(--muted)]">
                      {st.hourVN % 3 === 0 ? st.hourVN : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Day of Week Chart */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-[var(--ink)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--gold)]" />
                2. Theo Thứ Trong Tuần (T2 – CN)
              </span>
              <span className="text-[11px] text-[var(--muted)]">P&L & Winrate</span>
            </div>

            <div className="h-40 flex items-end gap-3 pt-6 pb-5 border-b border-[var(--line)]">
              {dayStats.map((st) => {
                const maxDayPl = Math.max(50, ...dayStats.map((d) => Math.abs(d.netPl)));
                const barHeight = Math.min(100, (Math.abs(st.netPl) / maxDayPl) * 100);
                const isPos = st.netPl >= 0;

                return (
                  <div
                    key={st.dayName}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ink)] text-[var(--bg)] text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {st.dayName}: {st.netPl >= 0 ? '+' : ''}${st.netPl} ({st.winRate}% W, {st.count}L)
                    </div>

                    <div
                      style={{ height: `${Math.max(6, barHeight)}%` }}
                      className={`w-full max-w-[28px] rounded-t-xs transition-colors ${
                        st.count === 0
                          ? 'bg-[var(--line)]/40'
                          : isPos
                          ? 'bg-[var(--win)]/80 hover:bg-[var(--win)]'
                          : 'bg-[var(--loss)]/80 hover:bg-[var(--loss)]'
                      }`}
                    />
                    <div className="absolute -bottom-5 flex flex-col items-center text-[10px] font-mono">
                      <span className="font-bold text-[var(--ink)]">{st.dayName}</span>
                      <span className="text-[9px] text-[var(--muted)]">{st.winRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Duration Chart (6 buckets) */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-[var(--ink)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--brand)]" />
                3. Theo Thời Gian Giữ Lệnh (6 Mức)
              </span>
              <span className="text-[11px] text-[var(--muted)]">&lt;15p đến &gt;24h</span>
            </div>

            <div className="h-40 flex items-end gap-2 pt-6 pb-5 border-b border-[var(--line)]">
              {durationBuckets.map((b) => {
                const maxC = Math.max(10, ...durationBuckets.map((item) => item.count));
                const barHeight = Math.min(100, (b.count / maxC) * 100);

                return (
                  <div
                    key={b.bucket}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ink)] text-[var(--bg)] text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {b.bucket}: {b.count} lệnh, P&L: {b.netPl >= 0 ? '+' : ''}${b.netPl} ({b.winRate}% win)
                    </div>

                    <div
                      style={{ height: `${Math.max(6, barHeight)}%` }}
                      className="w-full max-w-[26px] bg-[var(--brand)]/80 hover:bg-[var(--brand)] rounded-t-xs transition-colors"
                    />
                    <div className="absolute -bottom-5 flex flex-col items-center text-[9px] font-mono">
                      <span className="font-semibold text-[var(--ink)] whitespace-nowrap">{b.bucket}</span>
                      <span className="text-[8px] text-[var(--muted)]">{b.count}L</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Trading Sessions Chart */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-[var(--ink)] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[var(--gold)]" />
                4. Theo 4 Phiên Giao Dịch
              </span>
              <span className="text-[11px] text-[var(--muted)]">Á / Âu / Mỹ / Cuối ngày</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              {sessionStats.map((s) => (
                <div
                  key={s.name}
                  className="p-3 rounded-xl bg-[var(--sunk)]/50 border border-[var(--line)] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--ink)]">{s.name}</span>
                    <span className="text-[10px] text-[var(--muted)]">{s.timeRange}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
                    <span className={`text-base font-extrabold ${s.netPl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>
                      {s.netPl >= 0 ? `+$${s.netPl}` : `-$${Math.abs(s.netPl)}`}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {s.count}L ({s.winRate}% win)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Histogram P&L Distribution ($5 Buckets) */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-[var(--ink)]">
              5. Biểu Đồ Histogram Phân Bố P&L Mỗi Lệnh (Bước $5)
            </h4>
            <span className="text-xs text-[var(--muted)]">Mật độ lệnh thắng/thua</span>
          </div>

          <div className="h-44 flex items-end gap-1.5 pt-6 pb-6 border-b border-[var(--line)] overflow-x-auto">
            {histogramBins.map((bin) => {
              const maxCount = Math.max(5, ...histogramBins.map((b) => b.count));
              const barHeight = Math.min(100, (bin.count / maxCount) * 100);

              return (
                <div
                  key={bin.rangeLabel}
                  className="flex-1 min-w-[20px] flex flex-col items-center justify-end h-full group relative"
                >
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ink)] text-[var(--bg)] text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                    {bin.rangeLabel}$: {bin.count} lệnh
                  </div>

                  {bin.count > 0 && (
                    <span className="text-[9px] font-mono text-[var(--muted)] mb-1">
                      {bin.count}
                    </span>
                  )}

                  <div
                    style={{ height: `${Math.max(4, barHeight)}%` }}
                    className={`w-full rounded-t-xs transition-colors ${
                      bin.count === 0
                        ? 'bg-[var(--line)]/20'
                        : bin.isPositive
                        ? 'bg-[var(--win)]/80 hover:bg-[var(--win)]'
                        : 'bg-[var(--loss)]/80 hover:bg-[var(--loss)]'
                    }`}
                  />

                  <span className="absolute -bottom-5 text-[8px] font-mono text-[var(--muted)] rotate-[-45deg] origin-top-left">
                    {bin.min}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. SL vs No SL Comparison & Top 3 Best/Worst Trades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SL Comparison */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-[var(--ink)] flex items-center justify-between">
              <span>6. So Sánh: Có SL vs Không SL</span>
              <ShieldCheck className="w-4 h-4 text-[var(--brand)]" />
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--win)]/10 border border-[var(--win)]/30">
                <div className="flex items-center justify-between font-bold text-[var(--win)]">
                  <span>Có đặt SL</span>
                  <span>{slComparison.withSl.count} lệnh</span>
                </div>
                <div className="mt-2 space-y-1 font-mono tabular-nums">
                  <div className="text-lg font-extrabold text-[var(--win)]">
                    +${slComparison.withSl.netPl}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Winrate: {slComparison.withSl.winRate}%
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--loss)]/10 border border-[var(--loss)]/30">
                <div className="flex items-center justify-between font-bold text-[var(--loss)]">
                  <span>Không đặt SL</span>
                  <span>{slComparison.withoutSl.count} lệnh</span>
                </div>
                <div className="mt-2 space-y-1 font-mono tabular-nums">
                  <div className="text-lg font-extrabold text-[var(--loss)]">
                    +${slComparison.withoutSl.netPl}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Winrate: {slComparison.withoutSl.winRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 3 Best & Top 3 Worst Trades */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-[var(--ink)]">
              Top 3 Lệnh Lãi Lớn Nhất & Top 3 Lệnh Lỗ Nặng Nhất
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Best 3 */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[var(--win)] uppercase tracking-wide">
                  Top 3 Lãi
                </span>
                {top3Wins.map((t, idx) => (
                  <div
                    key={`win-${t.id}`}
                    className="p-2 rounded-lg bg-[var(--win)]/10 border border-[var(--win)]/20 flex items-center justify-between font-mono tabular-nums"
                  >
                    <div>
                      <span className="font-bold text-[var(--ink)]">#{idx + 1} {t.s.toUpperCase()} {t.v}L</span>
                      <p className="text-[9px] text-[var(--muted)]">{t.c.split(' ')[0]}</p>
                    </div>
                    <span className="font-bold text-[var(--win)]">+${t.pl}</span>
                  </div>
                ))}
              </div>

              {/* Worst 3 */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[var(--loss)] uppercase tracking-wide">
                  Top 3 Lỗ
                </span>
                {top3Losses.map((t, idx) => (
                  <div
                    key={`loss-${t.id}`}
                    className="p-2 rounded-lg bg-[var(--loss)]/10 border border-[var(--loss)]/20 flex items-center justify-between font-mono tabular-nums"
                  >
                    <div>
                      <span className="font-bold text-[var(--ink)]">#{idx + 1} {t.s.toUpperCase()} {t.v}L</span>
                      <p className="text-[9px] text-[var(--muted)]">{t.c.split(' ')[0]}</p>
                    </div>
                    <span className="font-bold text-[var(--loss)]">-${Math.abs(t.pl)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
