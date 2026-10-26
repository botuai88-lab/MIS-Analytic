import React, { useMemo, useState, useRef } from 'react';
import {
  ShieldAlert,
  Flame,
  Layers,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertOctagon,
  Percent,
} from 'lucide-react';
import { AccountReportData, Basket, PendingOrder, Trade } from '../types/trading';
import {
  ExposureAnalysis,
  PerformanceMetrics,
  computeExposureAndStopOut,
  extractBaskets,
} from '../utils/analyticsEngine';

interface RiskManagementProps {
  reportData: AccountReportData;
  metrics: PerformanceMetrics;
}

export const RiskManagement: React.FC<RiskManagementProps> = ({ reportData, metrics }) => {
  const { trades, cash, pendingOrders = [] } = reportData;

  const baskets = useMemo(() => extractBaskets(trades), [trades]);
  const exposure = useMemo(() => computeExposureAndStopOut(trades, cash), [trades, cash]);

  const [hoverExposureIdx, setHoverExposureIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Find worst losing basket
  const worstBasket = useMemo(() => {
    if (baskets.length === 0) return null;
    return baskets.reduce((min, b) => (b.netPl < min.netPl ? b : min), baskets[0]);
  }, [baskets]);

  // Pending orders statistics
  const pendingStats = useMemo(() => {
    const map = new Map<string, { placed: number; filled: number; canceled: number }>();
    ['Buy Limit', 'Sell Limit', 'Buy Stop', 'Sell Stop'].forEach((type) => {
      map.set(type, { placed: 0, filled: 0, canceled: 0 });
    });

    pendingOrders.forEach((o) => {
      const entry = map.get(o.type) || { placed: 0, filled: 0, canceled: 0 };
      entry.placed += o.placedVolume;
      entry.filled += o.filledVolume;
      if (o.state === 'canceled') entry.canceled += o.placedVolume;
      map.set(o.type, entry);
    });

    return Array.from(map.entries()).map(([type, st]) => {
      const fillRate = st.placed > 0 ? Math.round((st.filled / st.placed) * 10000) / 100 : 0;
      return {
        type,
        placed: Math.round(st.placed * 100) / 100,
        filled: Math.round(st.filled * 100) / 100,
        canceled: Math.round(st.canceled * 100) / 100,
        fillRate,
      };
    });
  }, [pendingOrders]);

  // SVG Chart Geometry for Step-line Exposure
  const width = 900;
  const height = 180;
  const padding = { top: 15, right: 30, bottom: 25, left: 45 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const timeline = exposure.exposureTimeline;
  const maxTrades = Math.max(5, exposure.maxConcurrentTotalTrades);

  const getX = (idx: number) => {
    if (timeline.length <= 1) return padding.left;
    return padding.left + (idx / (timeline.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / maxTrades) * plotHeight;
  };

  // Step paths for Sell (solid red) and Buy (dashed blue/green)
  const sellStepPath = useMemo(() => {
    if (timeline.length === 0) return '';
    return timeline.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.sellCount);
      if (idx === 0) return `M ${x} ${y}`;
      const prevY = getY(timeline[idx - 1].sellCount);
      return `${acc} L ${x} ${prevY} L ${x} ${y}`;
    }, '');
  }, [timeline, maxTrades]);

  const buyStepPath = useMemo(() => {
    if (timeline.length === 0) return '';
    return timeline.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.buyCount);
      if (idx === 0) return `M ${x} ${y}`;
      const prevY = getY(timeline[idx - 1].buyCount);
      return `${acc} L ${x} ${prevY} L ${x} ${y}`;
    }, '');
  }, [timeline, maxTrades]);

  // Find index of peak exposure
  const peakIdx = useMemo(() => {
    let pIdx = 0;
    let max = 0;
    timeline.forEach((pt, idx) => {
      if (pt.totalCount > max) {
        max = pt.totalCount;
        pIdx = idx;
      }
    });
    return pIdx;
  }, [timeline]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || timeline.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoverExposureIdx(null);
      return;
    }

    const relX = (svgX - padding.left) / plotWidth;
    const idx = Math.max(0, Math.min(timeline.length - 1, Math.round(relX * (timeline.length - 1))));
    setHoverExposureIdx(idx);
  };

  const activeExposurePt = hoverExposureIdx !== null ? timeline[hoverExposureIdx] : null;

  return (
    <section id="rui-ro" className="py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[var(--loss)]" />
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
            Quản trị Rủi ro, Độ phơi nhiễm & Cụm lệnh Nhồi
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">
          Đo lường đỉnh rải lệnh DCA/Grid, khoảng cách cháy tài khoản (Stop-out Room) và rổ lệnh
        </p>
      </div>

      {/* 6 Risk KPIs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Max DD chuỗi lệnh */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
            Max DD Chuỗi Lệnh
          </span>
          <div className="text-xl font-extrabold text-[var(--loss)] font-mono tabular-nums mt-1">
            -${metrics.maxDrawdownAmount}
          </div>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">Peak-to-trough</span>
        </div>

        {/* KPI 2: DD số dư MT5 */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
            Max DD Số Dư (MT5)
          </span>
          <div className="text-xl font-extrabold text-[var(--loss)] font-mono tabular-nums mt-1">
            {metrics.maxDrawdownPercent}%
          </div>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">${metrics.maxDrawdownAmount} tuyệt đối</span>
        </div>

        {/* KPI 3: Sell mở cùng lúc tối đa */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
            Đỉnh Sell Mở Cùng Lúc
          </span>
          <div className="text-xl font-extrabold text-[var(--loss)] font-mono tabular-nums mt-1">
            {exposure.maxConcurrentSellTrades} lệnh
          </div>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">{exposure.maxConcurrentSellLots} Lots tối đa</span>
        </div>

        {/* KPI 4: Buy mở cùng lúc tối đa */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
            Đỉnh Buy Mở Cùng Lúc
          </span>
          <div className="text-xl font-extrabold text-[var(--win)] font-mono tabular-nums mt-1">
            {exposure.maxConcurrentBuyTrades} lệnh
          </div>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">{exposure.maxConcurrentBuyLots} Lots tối đa</span>
        </div>

        {/* KPI 5: Tỷ lệ lệnh có SL */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
            Tỷ Lệ Lệnh Có SL
          </span>
          <div className="text-xl font-extrabold text-[var(--gold)] font-mono tabular-nums mt-1">
            {Math.round(((trades.filter((t) => t.sl !== null && t.sl > 0).length / trades.length) * 10000) / 100)}%
          </div>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">
            {trades.filter((t) => t.sl !== null && t.sl > 0).length}/{trades.length} vị thế
          </span>
        </div>

        {/* KPI 6: Cụm lệnh lỗ nặng nhất */}
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
            Cụm Nhồi Lỗ Lớn Nhất
          </span>
          <div className="text-xl font-extrabold text-[var(--loss)] font-mono tabular-nums mt-1">
            {worstBasket && worstBasket.netPl < 0 ? `-$${Math.abs(worstBasket.netPl)}` : '$0.00'}
          </div>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">
            {worstBasket ? `${worstBasket.count} lệnh (${worstBasket.totalLots}L)` : '--'}
          </span>
        </div>
      </div>

      {/* Stop-Out Room Callout Banner */}
      <div className="bg-gradient-to-r from-[var(--loss)]/15 via-[var(--surface)] to-[var(--surface)] rounded-2xl border border-[var(--loss)]/30 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--loss)]/20 text-[var(--loss)] shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--ink)]">
                  Biên Độ Chịu Đựng Cháy Tài Khoản (Room to Stop-Out cho XAUUSD)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--loss)] text-white">
                  Cảnh báo rủi ro
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl">
                Quy chuẩn Hợp đồng XAUUSD (1 Lot = 100 oz): Mỗi $1 giá vàng biến động làm thay đổi $100/lot.
                Tại thời điểm mở {exposure.maxConcurrentTotalLots} lot tối đa, tốc độ mất máu (Burn Rate) là{' '}
                <strong className="text-[var(--loss)] font-mono font-bold">${exposure.burnRatePerDollarMove} / $1 giá</strong>.
                Với số dư thời điểm đó (~${exposure.balanceAtPeak}), giá vàng chỉ cần chạy ngược{' '}
                <strong className="text-[var(--loss)] font-mono font-bold">${exposure.roomToStopOutUsd} USD</strong> là tài khoản chạm ngưỡng cháy sạch vốn.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 bg-[var(--surface)] p-3 rounded-xl border border-[var(--line)]">
            <span className="text-[10px] text-[var(--muted)] block uppercase font-bold">Biên độ chịu đựng</span>
            <span className="text-2xl font-black font-mono text-[var(--loss)] tabular-nums">
              ${exposure.roomToStopOutUsd}
            </span>
            <span className="text-[10px] text-[var(--muted)] block">USD giá Vàng</span>
          </div>
        </div>
      </div>

      {/* Step-line Exposure Chart */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm text-[var(--ink)]">
              Biểu Đồ Step-Line Vị Thế Mở Cùng Lúc (Real-time Exposure)
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[var(--loss)] font-semibold">
                <span className="w-3 h-0.5 bg-[var(--loss)] inline-block" /> Lệnh Sell (Liền nét)
              </span>
              <span className="flex items-center gap-1 text-[var(--win)] font-semibold">
                <span className="w-3 h-0.5 bg-[var(--win)] inline-block border-b border-dashed" /> Lệnh Buy (Đứt nét)
              </span>
            </div>
          </div>

          {activeExposurePt && (
            <div className="text-xs font-mono bg-[var(--sunk)] px-2.5 py-1 rounded-md text-[var(--ink)] tabular-nums">
              <span>{activeExposurePt.timeStr}</span>: Sell {activeExposurePt.sellCount}L ({activeExposurePt.sellLots} lot) | Buy {activeExposurePt.buyCount}L ({activeExposurePt.buyLots} lot)
            </div>
          )}
        </div>

        <div className="relative w-full overflow-hidden rounded-xl bg-[var(--sunk)]/30 border border-[var(--line)] p-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverExposureIdx(null)}
          >
            {/* Grid lines */}
            {[0, 0.33, 0.66, 1].map((pct, i) => {
              const y = padding.top + plotHeight * pct;
              const val = Math.round(maxTrades - pct * maxTrades);
              return (
                <g key={`exp-grid-${i}`}>
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
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="var(--muted)"
                    fontSize="9"
                    className="font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Sell step line (solid red) */}
            <path
              d={sellStepPath}
              fill="none"
              stroke="var(--loss)"
              strokeWidth="2"
              strokeLinejoin="miter"
            />

            {/* Buy step line (dashed green) */}
            <path
              d={buyStepPath}
              fill="none"
              stroke="var(--win)"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinejoin="miter"
            />

            {/* Peak red dot marker */}
            {timeline.length > 0 && (
              <g>
                <circle
                  cx={getX(peakIdx)}
                  cy={getY(timeline[peakIdx].sellCount)}
                  r="5"
                  fill="var(--loss)"
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
                <text
                  x={getX(peakIdx)}
                  y={getY(timeline[peakIdx].sellCount) - 9}
                  textAnchor="middle"
                  fill="var(--loss)"
                  fontSize="9"
                  fontWeight="bold"
                >
                  Đỉnh: {timeline[peakIdx].totalCount} lệnh
                </text>
              </g>
            )}

            {/* Hover crosshair */}
            {hoverExposureIdx !== null && (
              <line
                x1={getX(hoverExposureIdx)}
                y1={padding.top}
                x2={getX(hoverExposureIdx)}
                y2={height - padding.bottom}
                stroke="var(--ink)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Two Tables: Pending Orders and Baskets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Orders Table (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--ink)]">
              Thống Kê Lệnh Chờ (Pending Orders)
            </h3>
            <span className="text-xs text-[var(--muted)]">Tỷ lệ khớp lệnh</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-2 font-medium">Loại Lệnh</th>
                  <th className="py-2 font-medium text-center">Đặt (Lot)</th>
                  <th className="py-2 font-medium text-center">Khớp (Lot)</th>
                  <th className="py-2 font-medium text-right">Tỷ Lệ Khớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
                {pendingStats.map((st) => (
                  <tr key={st.type} className="hover:bg-[var(--sunk)]/30">
                    <td className="py-2.5 font-semibold text-[var(--ink)]">{st.type}</td>
                    <td className="py-2.5 text-center">{st.placed}</td>
                    <td className="py-2.5 text-center text-[var(--win)] font-bold">{st.filled}</td>
                    <td className="py-2.5 text-right font-bold">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          st.fillRate >= 80
                            ? 'bg-[var(--win)]/15 text-[var(--win)]'
                            : st.fillRate > 0
                            ? 'bg-[var(--gold)]/15 text-[var(--gold)]'
                            : 'bg-[var(--sunk)] text-[var(--muted)]'
                        }`}
                      >
                        {st.fillRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Basket Table (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Danh Sách Cụm Lệnh Nhồi Đóng Cùng Lúc (Basket Trades)
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Gom các lệnh cùng chiều đóng trong vòng &le; 60 giây (từ 2 lệnh trở lên)
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--brand)]/15 text-[var(--brand)]">
              {baskets.length} cụm
            </span>
          </div>

          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-[var(--surface)] z-10">
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-2 font-medium">Thời Điểm Đóng</th>
                  <th className="py-2 font-medium">Chiều</th>
                  <th className="py-2 font-medium text-center">Số Lệnh</th>
                  <th className="py-2 font-medium text-center">Tổng Lot</th>
                  <th className="py-2 font-medium text-center">Vùng Giá Vào</th>
                  <th className="py-2 font-medium text-center">Thời Gian</th>
                  <th className="py-2 font-medium text-right">Tổng P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
                {baskets.map((b) => {
                  const isWin = b.netPl >= 0;
                  const is13SellTarget = b.lastCloseTime === '2026.10.12 05:32:06';

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-[var(--sunk)]/50 transition-colors ${
                        is13SellTarget ? 'bg-[var(--gold)]/10 font-bold' : ''
                      }`}
                    >
                      <td className="py-2.5 text-[var(--ink)]">
                        {b.lastCloseTime}
                        {is13SellTarget && (
                          <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-[var(--gold)] text-white">
                            Mẫu PRD
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            b.side === 'buy'
                              ? 'bg-[var(--win)]/15 text-[var(--win)]'
                              : 'bg-[var(--loss)]/15 text-[var(--loss)]'
                          }`}
                        >
                          {b.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-bold">{b.count}</td>
                      <td className="py-2.5 text-center">{b.totalLots}</td>
                      <td className="py-2.5 text-center text-[11px]">
                        ${b.minOpenPrice} – ${b.maxOpenPrice} (${b.priceRange})
                      </td>
                      <td className="py-2.5 text-center text-[11px] text-[var(--muted)]">
                        {b.durationMinutes}p
                      </td>
                      <td
                        className={`py-2.5 text-right font-extrabold ${
                          isWin ? 'text-[var(--win)]' : 'text-[var(--loss)]'
                        }`}
                      >
                        {isWin ? `+$${b.netPl}` : `-$${Math.abs(b.netPl)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
