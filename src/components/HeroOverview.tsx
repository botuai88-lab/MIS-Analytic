import React, { useState, useRef, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Award,
  CalendarCheck,
  Percent,
  Server,
  User,
  Hash,
  Clock,
  Layers,
} from 'lucide-react';
import { AccountReportData, Trade } from '../types/trading';
import {
  PerformanceMetrics,
  PnLPoint,
  generateCumulativePnL,
} from '../utils/analyticsEngine';

interface HeroOverviewProps {
  reportData: AccountReportData;
  metrics: PerformanceMetrics;
}

export const HeroOverview: React.FC<HeroOverviewProps> = ({ reportData, metrics }) => {
  const { account, trades } = reportData;
  const pnlPoints = useMemo(() => generateCumulativePnL(trades), [trades]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Date range
  const sortedTrades = [...trades].sort((a, b) => a.c.localeCompare(b.c));
  const firstDate = sortedTrades[0]?.c.split(' ')[0] || '2026.09.21';
  const lastDate = sortedTrades[sortedTrades.length - 1]?.c.split(' ')[0] || '2026.10.24';

  // SVG Chart Geometry
  const width = 1000;
  const heightTop = 220;
  const heightBottom = 90;
  const padding = { top: 20, right: 30, bottom: 25, left: 60 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeightTop = heightTop - padding.top - padding.bottom;
  const plotHeightBottom = heightBottom - 10 - 20;

  // Scales
  const maxCumPl = Math.max(100, ...pnlPoints.map((p) => p.cumulativePl));
  const minCumPl = Math.min(0, ...pnlPoints.map((p) => p.cumulativePl));
  const cumRange = maxCumPl - minCumPl || 1;

  const maxDdAmount = Math.max(10, metrics.maxDrawdownAmount);

  const getX = (idx: number) => {
    if (pnlPoints.length <= 1) return padding.left;
    return padding.left + (idx / (pnlPoints.length - 1)) * plotWidth;
  };

  const getYTop = (val: number) => {
    return padding.top + plotHeightTop - ((val - minCumPl) / cumRange) * plotHeightTop;
  };

  const getYBottom = (dd: number) => {
    // dd is negative or 0
    const absDd = Math.abs(dd);
    const ratio = Math.min(1, absDd / maxDdAmount);
    return 10 + ratio * plotHeightBottom;
  };

  // Build SVG Path for Cumulative P&L
  const topPath = useMemo(() => {
    if (pnlPoints.length === 0) return '';
    return pnlPoints.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getYTop(pt.cumulativePl);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, '');
  }, [pnlPoints, minCumPl, maxCumPl]);

  const topAreaPath = useMemo(() => {
    if (pnlPoints.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(pnlPoints.length - 1);
    const zeroY = getYTop(Math.max(0, minCumPl));
    return `${topPath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  }, [topPath, pnlPoints, minCumPl]);

  // Build SVG Path for Underwater Drawdown
  const bottomPath = useMemo(() => {
    if (pnlPoints.length === 0) return '';
    return pnlPoints.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getYBottom(pt.drawdown);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, '');
  }, [pnlPoints, maxDdAmount]);

  const bottomAreaPath = useMemo(() => {
    if (pnlPoints.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(pnlPoints.length - 1);
    return `M ${firstX} 10 ${bottomPath} L ${lastX} 10 Z`;
  }, [bottomPath, pnlPoints]);

  // Mouse interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || pnlPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoverIndex(null);
      return;
    }

    const relX = (svgX - padding.left) / plotWidth;
    const nearestIdx = Math.round(relX * (pnlPoints.length - 1));
    const clampedIdx = Math.max(0, Math.min(pnlPoints.length - 1, nearestIdx));
    setHoverIndex(clampedIdx);
  };

  const activePoint = hoverIndex !== null ? pnlPoints[hoverIndex] : null;
  const activeTrade = hoverIndex !== null ? trades[hoverIndex] : null;

  const isNetProfitPositive = metrics.netProfit >= 0;

  return (
    <section id="tong-quan" className="py-6 sm:py-8 space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--line)]">
          {/* Left: Net Profit & Core Statement */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
                LỢI NHUẬN RÒNG TÍCH LŨY (PURE TRADING P&L)
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--win)]/15 text-[var(--win)]">
                Chuẩn hóa Thực chiến
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div
                className={`text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums ${
                  isNetProfitPositive ? 'text-[var(--win)]' : 'text-[var(--loss)]'
                }`}
              >
                {isNetProfitPositive ? `+$${metrics.netProfit.toLocaleString()}` : `-$${Math.abs(metrics.netProfit).toLocaleString()}`}
              </div>
              <span className="text-sm font-semibold text-[var(--muted)]">USD</span>
            </div>


            <p className="mt-2.5 text-xs sm:text-sm text-[var(--muted)] flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--ink)]">{metrics.totalTrades} lệnh đã đóng</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-[var(--sunk)] font-medium text-[var(--ink)]">XAUUSD</span>
              <span>•</span>
              <span>{firstDate} – {lastDate}</span>
              <span>•</span>
              <span>{metrics.totalTradingDaysCount} ngày giao dịch</span>
              <span>•</span>
              <span className="font-semibold text-[var(--ink)]">Tổng {metrics.totalLots} Lots</span>
            </p>
          </div>

          {/* Right: Account Specification Card */}
          <div className="bg-[var(--sunk)]/60 rounded-xl p-4 border border-[var(--line)] grid grid-cols-2 gap-x-6 gap-y-2 text-xs min-w-[280px]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[var(--muted)]" />
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Chủ tài khoản</span>
                <span className="font-bold text-[var(--ink)]">{account.name || 'MISU'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[var(--muted)]" />
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Số tài khoản</span>
                <span className="font-bold text-[var(--ink)] tabular-nums">{account.login}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-[var(--muted)]" />
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Máy chủ (Server)</span>
                <span className="font-medium text-[var(--ink)] truncate max-w-[120px]">{account.server}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Loại tài khoản</span>
                <span className="font-semibold text-[var(--brand)]">{account.type} • {account.currency}</span>
              </div>
            </div>

            <div className="col-span-2 pt-1 border-t border-[var(--line)] text-[11px] text-[var(--muted)] flex items-center justify-between">
              <span>Xuất báo cáo:</span>
              <span className="font-mono tabular-nums text-[var(--ink)]">{account.exportDate}</span>
            </div>
          </div>
        </div>

        {/* Hero Dual SVG Chart: Cumulative PnL + Underwater Drawdown */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <span className="w-3 h-0.5 bg-[var(--gold)] inline-block rounded" />
                Đường cong P&L tích lũy (Cumulative P&L)
              </span>
              <span className="flex items-center gap-1.5 text-[var(--muted)]">
                <span className="w-3 h-2 bg-[var(--loss)]/30 inline-block rounded-xs" />
                Max Drawdown (-${metrics.maxDrawdownAmount})
              </span>
            </div>
            {activePoint && activeTrade && (
              <div className="text-xs bg-[var(--sunk)] px-2.5 py-1 rounded-md text-[var(--ink)] font-mono tabular-nums flex items-center gap-3 animate-fadeIn">
                <span>Lệnh #{activePoint.index}</span>
                <span>{activeTrade.c}</span>
                <span className={activePoint.pl >= 0 ? 'text-[var(--win)] font-bold' : 'text-[var(--loss)] font-bold'}>
                  {activePoint.pl >= 0 ? `+$${activePoint.pl}` : `-$${Math.abs(activePoint.pl)}`}
                </span>
                <span className="font-bold text-[var(--gold)]">Cum: ${activePoint.cumulativePl}</span>
                <span className="text-[var(--loss)]">DD: {activePoint.drawdown}%</span>
              </div>
            )}
          </div>

          <div className="relative w-full overflow-hidden rounded-xl bg-[var(--sunk)]/30 border border-[var(--line)] p-2">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${heightTop + heightBottom}`}
              className="w-full h-auto cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--loss)" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="var(--loss)" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Grid Lines - Top Chart */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = padding.top + plotHeightTop * pct;
                const val = Math.round(maxCumPl - pct * cumRange);
                return (
                  <g key={`grid-top-${i}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="var(--line)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                      opacity="0.6"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--muted)"
                      fontSize="10"
                      className="font-mono"
                    >
                      ${val}
                    </text>
                  </g>
                );
              })}

              {/* Zero reference line */}
              {minCumPl <= 0 && maxCumPl >= 0 && (
                <line
                  x1={padding.left}
                  y1={getYTop(0)}
                  x2={width - padding.right}
                  y2={getYTop(0)}
                  stroke="var(--muted)"
                  strokeWidth="1.2"
                  opacity="0.7"
                />
              )}

              {/* Top Chart Area & Line */}
              <path d={topAreaPath} fill="url(#goldGradient)" />
              <path
                d={topPath}
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Mark Max Drawdown Span */}
              {metrics.maxDrawdownPeakIndex !== metrics.maxDrawdownTroughIndex && (
                <g>
                  <rect
                    x={getX(metrics.maxDrawdownPeakIndex)}
                    y={padding.top}
                    width={Math.max(4, getX(metrics.maxDrawdownTroughIndex) - getX(metrics.maxDrawdownPeakIndex))}
                    height={plotHeightTop}
                    fill="var(--loss)"
                    opacity="0.12"
                  />
                  <line
                    x1={getX(metrics.maxDrawdownTroughIndex)}
                    y1={getYTop(pnlPoints[metrics.maxDrawdownPeakIndex]?.cumulativePl || 0)}
                    x2={getX(metrics.maxDrawdownTroughIndex)}
                    y2={getYTop(pnlPoints[metrics.maxDrawdownTroughIndex]?.cumulativePl || 0)}
                    stroke="var(--loss)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                </g>
              )}

              {/* Separator between Top and Bottom Charts */}
              <g transform={`translate(0, ${heightTop})`}>
                <line
                  x1={padding.left}
                  y1="0"
                  x2={width - padding.right}
                  y2="0"
                  stroke="var(--line)"
                  strokeWidth="1.5"
                />
                <text
                  x={padding.left}
                  y="9"
                  fill="var(--muted)"
                  fontSize="9"
                  fontWeight="bold"
                >
                  UNDERWATER DRAWDOWN
                </text>
                <text
                  x={width - padding.right}
                  y="9"
                  textAnchor="end"
                  fill="var(--loss)"
                  fontSize="9"
                  fontWeight="bold"
                >
                  Max: -${metrics.maxDrawdownAmount}
                </text>

                {/* Bottom Chart Area & Line */}
                <path d={bottomAreaPath} fill="url(#ddGradient)" />
                <path
                  d={bottomPath}
                  fill="none"
                  stroke="var(--loss)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                {/* Bottom Baseline 0 */}
                <line
                  x1={padding.left}
                  y1="10"
                  x2={width - padding.right}
                  y2="10"
                  stroke="var(--muted)"
                  strokeWidth="1"
                  opacity="0.5"
                />
              </g>

              {/* Hover Crosshair */}
              {hoverIndex !== null && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1={padding.top}
                    x2={getX(hoverIndex)}
                    y2={heightTop + heightBottom - 10}
                    stroke="var(--ink)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                  {/* Point on Top Chart */}
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getYTop(pnlPoints[hoverIndex].cumulativePl)}
                    r="4.5"
                    fill="var(--gold)"
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                  {/* Point on Bottom Chart */}
                  <circle
                    cx={getX(hoverIndex)}
                    cy={heightTop + getYBottom(pnlPoints[hoverIndex].drawdown)}
                    r="3.5"
                    fill="var(--loss)"
                    stroke="var(--surface)"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* 6 Core KPIs Strip (Strip) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Winrate */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>Tỷ lệ Thắng</span>
            <Award className="w-3.5 h-3.5 text-[var(--win)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--win)] tabular-nums">
            {metrics.winRate}%
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 flex items-center justify-between">
            <span>{metrics.winCount} thắng</span>
            <span>{metrics.lossCount} thua</span>
          </div>
        </div>

        {/* KPI 2: Profit Factor */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>Profit Factor</span>
            <Target className="w-3.5 h-3.5 text-[var(--brand)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--ink)] tabular-nums">
            {metrics.profitFactor}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 truncate">
            Gross: ${metrics.grossWin.toLocaleString()}
          </div>
        </div>

        {/* KPI 3: Expectancy */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>Kỳ vọng mỗi lệnh</span>
            <TrendingUp className="w-3.5 h-3.5 text-[var(--win)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--win)] tabular-nums">
            +${metrics.expectancy}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            Toán học dương / lệnh
          </div>
        </div>

        {/* KPI 4: Win/Loss Ratio */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>TB Thắng / TB Thua</span>
            <Percent className="w-3.5 h-3.5 text-[var(--gold)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--ink)] tabular-nums">
            1:{metrics.winLossRatio}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            ${metrics.avgWin} / ${metrics.avgLoss}
          </div>
        </div>

        {/* KPI 5: Max Drawdown */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>Drawdown lớn nhất</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--loss)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--loss)] tabular-nums">
            -${metrics.maxDrawdownAmount}
          </div>
          <div className="text-[11px] text-[var(--loss)]/80 mt-1">
            {metrics.maxDrawdownPercent}% theo số dư
          </div>
        </div>

        {/* KPI 6: Profitable Days */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>Số ngày có lãi</span>
            <CalendarCheck className="w-3.5 h-3.5 text-[var(--win)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--ink)] tabular-nums">
            {metrics.profitableDaysCount}/{metrics.totalTradingDaysCount}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            {Math.round((metrics.profitableDaysCount / (metrics.totalTradingDaysCount || 1)) * 100)}% số ngày dương
          </div>
        </div>
      </div>
    </section>
  );
};
