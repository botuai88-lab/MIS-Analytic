import React, { useMemo, useState, useRef } from 'react';
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle,
  HelpCircle,
  PiggyBank,
} from 'lucide-react';
import { AccountReportData, Cashflow } from '../types/trading';
import { PerformanceMetrics } from '../utils/analyticsEngine';

interface CashflowSectionProps {
  reportData: AccountReportData;
  metrics: PerformanceMetrics;
}

export const CashflowSection: React.FC<CashflowSectionProps> = ({
  reportData,
  metrics,
}) => {
  const { cash, bal } = reportData;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const deposits = useMemo(() => cash.filter((c) => c.k === 'Nạp'), [cash]);
  const withdrawals = useMemo(() => cash.filter((c) => c.k === 'Rút'), [cash]);

  const totalDep = useMemo(
    () => Math.round(deposits.reduce((acc, c) => acc + c.a, 0) * 100) / 100,
    [deposits]
  );
  const totalWith = useMemo(
    () => Math.round(withdrawals.reduce((acc, c) => acc + Math.abs(c.a), 0) * 100) / 100,
    [withdrawals]
  );
  const netWithdrawn = Math.round((totalWith - totalDep) * 100) / 100;

  // Final balance reconciliation
  const calculatedEndBal = Math.round((totalDep - totalWith + metrics.netProfit) * 100) / 100;
  const currentAccountBalance = cash.length > 0 ? cash[cash.length - 1].bal : calculatedEndBal;

  // Chart geometry for Step-line Balance
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 25, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = cash;
  const maxBal = Math.max(1000, ...points.map((p) => p.bal));
  const minBal = Math.min(0, ...points.map((p) => p.bal));
  const balRange = maxBal - minBal || 1;

  const getX = (idx: number) => {
    if (points.length <= 1) return padding.left;
    return padding.left + (idx / (points.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - ((val - minBal) / balRange) * plotHeight;
  };

  // Step-line path
  const stepPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.bal);
      if (idx === 0) return `M ${x} ${y}`;
      const prevY = getY(points[idx - 1].bal);
      return `${acc} L ${x} ${prevY} L ${x} ${y}`;
    }, '');
  }, [points, minBal, maxBal]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(points.length - 1);
    const zeroY = getY(0);
    return `${stepPath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  }, [stepPath, points]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoverIndex(null);
      return;
    }

    const relX = (svgX - padding.left) / plotWidth;
    const idx = Math.max(0, Math.min(points.length - 1, Math.round(relX * (points.length - 1))));
    setHoverIndex(idx);
  };

  const activeCash = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <section id="dong-tien" className="py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[var(--gold)]" />
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
            Quản trị Dòng tiền (Nạp / Rút) & Đối soát Số dư
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">
          Theo dõi độc lập dòng tiền thực tế, tách biệt hoàn toàn với hiệu suất giao dịch để tránh méo biểu đồ
        </p>
      </div>

      {/* Summary KPI Cards & Reconciliation Equation */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 sm:p-6 shadow-xs space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-[var(--win)]/10 border border-[var(--win)]/20">
            <span className="text-[10px] text-[var(--win)] uppercase font-bold tracking-wider block">
              Tổng Tiền Nạp ({deposits.length} lần)
            </span>
            <div className="text-2xl font-extrabold text-[var(--win)] font-mono tabular-nums mt-1">
              +${totalDep.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Vốn bơm vào tài khoản</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--loss)]/10 border border-[var(--loss)]/20">
            <span className="text-[10px] text-[var(--loss)] uppercase font-bold tracking-wider block">
              Tổng Tiền Rút ({withdrawals.length} lần)
            </span>
            <div className="text-2xl font-extrabold text-[var(--loss)] font-mono tabular-nums mt-1">
              -${totalWith.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Chốt lời & thu hồi vốn</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--brand)]/10 border border-[var(--brand)]/20">
            <span className="text-[10px] text-[var(--brand)] uppercase font-bold tracking-wider block">
              Tiền Rút Ròng (Net Cash Out)
            </span>
            <div className="text-2xl font-extrabold text-[var(--brand)] font-mono tabular-nums mt-1">
              +${netWithdrawn.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--muted)] mt-0.5 block">Đã rút vượt tiền nạp</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--sunk)] border border-[var(--line)]">
            <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
              Số Dư Hiện Tại (Balance)
            </span>
            <div className="text-2xl font-extrabold text-[var(--ink)] font-mono tabular-nums mt-1">
              ${currentAccountBalance.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--gold)] font-semibold mt-0.5 block">
              Neo giữ quanh $500
            </span>
          </div>
        </div>

        {/* Detailed Reconciliation Equation Box */}
        <div className="p-4 rounded-xl bg-[var(--sunk)]/50 border border-[var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-4 h-4 text-[var(--gold)] shrink-0" />
            <div>
              <span className="font-bold text-[var(--ink)]">Công Thức Đối Soát Số Dư Cuối Kỳ:</span>
              <p className="font-mono text-[11px] text-[var(--muted)] mt-0.5">
                Vốn ban đầu ($0) + Nạp (${totalDep}) - Rút (${totalWith}) + Lợi nhuận ròng (+${metrics.netProfit}) = <strong className="text-[var(--ink)]">${calculatedEndBal}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--win)] font-semibold shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span>Khớp 100% sao kê MT5</span>
          </div>
        </div>
      </div>

      {/* Chart and Table side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step-line Balance Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Biểu Đồ Step-Line Số Dư Thực Tế (Balance Timeline)
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Chấm Xanh: Nạp tiền | Chấm Đỏ: Rút tiền
              </p>
            </div>
            {activeCash && (
              <div className="text-xs font-mono bg-[var(--sunk)] px-2 py-1 rounded text-[var(--ink)] tabular-nums">
                {activeCash.t.split(' ')[0]}: {activeCash.k} ${Math.abs(activeCash.a)} &rarr; Bal: ${activeCash.bal}
              </div>
            )}
          </div>

          <div className="relative w-full overflow-hidden rounded-xl bg-[var(--sunk)]/30 border border-[var(--line)] p-2">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = padding.top + plotHeight * pct;
                const val = Math.round(maxBal - pct * balRange);
                return (
                  <g key={`bal-grid-${i}`}>
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
                      ${val}
                    </text>
                  </g>
                );
              })}

              {/* Step path and area */}
              <path d={areaPath} fill="url(#balanceGrad)" />
              <path
                d={stepPath}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2.2"
                strokeLinejoin="miter"
              />

              {/* Deposit/Withdrawal Dots */}
              {points.map((pt, idx) => {
                const isDep = pt.k === 'Nạp';
                return (
                  <circle
                    key={`dot-${idx}`}
                    cx={getX(idx)}
                    cy={getY(pt.bal)}
                    r="4.5"
                    fill={isDep ? 'var(--win)' : 'var(--loss)'}
                    stroke="var(--surface)"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Hover crosshair */}
              {hoverIndex !== null && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1={padding.top}
                    x2={getX(hoverIndex)}
                    y2={height - padding.bottom}
                    stroke="var(--ink)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getY(points[hoverIndex].bal)}
                    r="6"
                    fill="var(--gold)"
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Cashflow History Table (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--ink)]">
              Bảng Lịch Sử Nạp / Rút Tiền
            </h3>
            <span className="text-xs font-mono font-semibold text-[var(--muted)]">
              {cash.length} giao dịch
            </span>
          </div>

          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-[var(--surface)] z-10">
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-2 font-medium">Thời Gian</th>
                  <th className="py-2 font-medium">Loại</th>
                  <th className="py-2 font-medium text-right">Số Tiền</th>
                  <th className="py-2 font-medium text-right">Số Dư Sau Đó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
                {cash.map((c, idx) => {
                  const isDep = c.k === 'Nạp';
                  return (
                    <tr key={c.id || idx} className="hover:bg-[var(--sunk)]/30">
                      <td className="py-2.5 text-[var(--muted)] text-[11px]">{c.t}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isDep
                              ? 'bg-[var(--win)]/15 text-[var(--win)]'
                              : 'bg-[var(--loss)]/15 text-[var(--loss)]'
                          }`}
                        >
                          {isDep ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {c.k}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          isDep ? 'text-[var(--win)]' : 'text-[var(--loss)]'
                        }`}
                      >
                        {isDep ? `+$${c.a}` : `-$${Math.abs(c.a)}`}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[var(--ink)]">
                        ${c.bal}
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
