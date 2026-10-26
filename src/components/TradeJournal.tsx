import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  ExternalLink,
  Save,
  MessageSquare,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Cashflow, CloseReason, OrderSide, Trade } from '../types/trading';
import { getTradeDurationMinutes, getTradePriceMove } from '../utils/analyticsEngine';

interface TradeJournalProps {
  trades: Trade[];
  cash?: Cashflow[];
  selectedDate: string | null;
  onClearDateFilter: () => void;
  onUpdateTrade: (updatedTrade: Trade) => void;
}

type SortField =
  | 'id'
  | 'o'
  | 'c'
  | 's'
  | 'v'
  | 'op'
  | 'sl'
  | 'tp'
  | 'cp'
  | 'move'
  | 'dur'
  | 'r'
  | 'pl';

const AVAILABLE_STRATEGY_TAGS = [
  'HMA',
  'FVG',
  'MBFX',
  'DCA',
  'Scalp',
  'Reversal',
  'Breakout',
  'London Open',
  'NY Session',
  'News Trading',
];

export const TradeJournal: React.FC<TradeJournalProps> = ({
  trades,
  cash = [],
  selectedDate,
  onClearDateFilter,
  onUpdateTrade,
}) => {
  // Main view switcher: Vị thế giao dịch vs Dòng tiền Nạp / Rút
  const [activeView, setActiveView] = useState<'trades' | 'cashflow'>('trades');

  // Filters
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [slFilter, setSlFilter] = useState<'all' | 'has_sl' | 'no_sl'>('all');
  const [basketFilter, setBasketFilter] = useState<'all' | 'basket_only' | 'single_only'>('all');
  const [localDateFilter, setLocalDateFilter] = useState<string>(selectedDate || 'all');

  // Sync selectedDate from props
  React.useEffect(() => {
    if (selectedDate) {
      setLocalDateFilter(selectedDate);
    } else {
      setLocalDateFilter('all');
    }
  }, [selectedDate]);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('c');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // default newest first

  // Drawer modal for selected trade
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [drawerNote, setDrawerNote] = useState('');
  const [drawerTags, setDrawerTags] = useState<string[]>([]);
  const [drawerChartUrl, setDrawerChartUrl] = useState('');

  const openTradeDrawer = (t: Trade) => {
    setActiveTrade(t);
    setDrawerNote(t.note || '');
    setDrawerTags(t.tags || []);
    setDrawerChartUrl(t.chartUrl || '');
  };

  const saveTradeJournal = () => {
    if (!activeTrade) return;
    const updated: Trade = {
      ...activeTrade,
      note: drawerNote.trim() || undefined,
      tags: drawerTags.length > 0 ? drawerTags : undefined,
      chartUrl: drawerChartUrl.trim() || undefined,
    };
    onUpdateTrade(updated);
    setActiveTrade(updated);
  };

  const toggleTag = (tag: string) => {
    if (drawerTags.includes(tag)) {
      setDrawerTags(drawerTags.filter((t) => t !== tag));
    } else {
      setDrawerTags([...drawerTags, tag]);
    }
  };

  // Distinct dates in dataset for dropdown
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => {
      const d = t.c.split(' ')[0].replace(/\./g, '-');
      set.add(d);
    });
    return Array.from(set).sort().reverse();
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Side filter
      if (sideFilter !== 'all' && t.s !== sideFilter) return false;

      // Outcome filter
      if (outcomeFilter === 'win' && t.pl <= 0) return false;
      if (outcomeFilter === 'loss' && t.pl > 0) return false;

      // SL filter
      const hasSl = t.sl !== null && t.sl > 0;
      if (slFilter === 'has_sl' && !hasSl) return false;
      if (slFilter === 'no_sl' && hasSl) return false;

      // Basket filter
      const isBasket = (t.b || 0) > 0;
      if (basketFilter === 'basket_only' && !isBasket) return false;
      if (basketFilter === 'single_only' && isBasket) return false;

      // Date filter
      if (localDateFilter !== 'all') {
        const dNorm = t.c.split(' ')[0].replace(/\./g, '-');
        if (dNorm !== localDateFilter) return false;
      }

      return true;
    });
  }, [trades, sideFilter, outcomeFilter, slFilter, basketFilter, localDateFilter]);

  // Sort filtered trades
  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let valA: any = a[sortField as keyof Trade];
      let valB: any = b[sortField as keyof Trade];

      if (sortField === 'move') {
        valA = getTradePriceMove(a);
        valB = getTradePriceMove(b);
      } else if (sortField === 'dur') {
        valA = getTradeDurationMinutes(a);
        valB = getTradeDurationMinutes(b);
      }

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredTrades, sortField, sortAsc]);

  // Dynamic Footer Statistics
  const footerStats = useMemo(() => {
    const count = filteredTrades.length;
    let netPl = 0;
    let wins = 0;
    let lots = 0;

    filteredTrades.forEach((t) => {
      netPl += t.pl;
      lots += t.v;
      if (t.pl > 0) wins++;
    });

    const winRate = count > 0 ? Math.round((wins / count) * 10000) / 100 : 0;

    return {
      count,
      netPl: Math.round(netPl * 100) / 100,
      winRate,
      lots: Math.round(lots * 100) / 100,
    };
  }, [filteredTrades]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const clearAllFilters = () => {
    setSideFilter('all');
    setOutcomeFilter('all');
    setSlFilter('all');
    setBasketFilter('all');
    setLocalDateFilter('all');
    onClearDateFilter();
  };

  const hasActiveFilters =
    sideFilter !== 'all' ||
    outcomeFilter !== 'all' ||
    slFilter !== 'all' ||
    basketFilter !== 'all' ||
    localDateFilter !== 'all';

  return (
    <section id="lich-su" className="py-6 sm:py-8 space-y-4">
      {/* Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--gold)]" />
            <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
              {activeView === 'trades' ? 'Nhật Ký & Bảng Lịch Sử Lệnh Chi Tiết' : 'Bảng Giao Dịch Dòng Tiền Nạp / Rút'}
            </h2>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            {activeView === 'trades'
              ? 'Bảng 13 cột với tiêu đề cố định (Sticky Header), sắp xếp đa chiều và ngăn ghi chép bài học thực chiến'
              : 'Dòng tiền nạp và rút tiền được hệ thống bóc tách riêng biệt, hoàn toàn độc lập với Lợi nhuận giao dịch (Trading P&L)'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl bg-[var(--sunk)] p-1 text-xs font-semibold gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('trades')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'trades'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Vị thế Lệnh ({trades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('cashflow')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'cashflow'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Nạp & Rút ({cash.length})
          </button>
        </div>
      </div>

      {activeView === 'trades' ? (
        <>
          {/* Multi-Dimensional Filter Bar */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Side Filter */}
          <div className="flex items-center gap-1 bg-[var(--sunk)] p-1 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] px-1.5">Chiều:</span>
            {(['all', 'buy', 'sell'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  sideFilter === s
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-bold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {s === 'all' ? 'Tất cả' : s.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1 bg-[var(--sunk)] p-1 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] px-1.5">Kết quả:</span>
            {(['all', 'win', 'loss'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOutcomeFilter(o)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  outcomeFilter === o
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-bold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {o === 'all' ? 'Tất cả' : o === 'win' ? 'Thắng (Win)' : 'Thua (Loss)'}
              </button>
            ))}
          </div>

          {/* Stop Loss Filter */}
          <div className="flex items-center gap-1 bg-[var(--sunk)] p-1 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] px-1.5">SL:</span>
            {(['all', 'has_sl', 'no_sl'] as const).map((sl) => (
              <button
                key={sl}
                onClick={() => setSlFilter(sl)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  slFilter === sl
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-bold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {sl === 'all' ? 'Tất cả' : sl === 'has_sl' ? 'Có SL' : 'Không SL'}
              </button>
            ))}
          </div>

          {/* Date Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted)]">Ngày:</span>
            <select
              aria-label="Lọc theo ngày đóng lệnh"
              value={localDateFilter}
              onChange={(e) => {
                setLocalDateFilter(e.target.value);
                if (e.target.value === 'all') onClearDateFilter();
              }}
              className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--ink)] focus:outline-none"
            >
              <option value="all">Tất cả ngày ({trades.length} lệnh)</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--loss)]/10 text-[var(--loss)] hover:bg-[var(--loss)]/20 transition-colors text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 13-Column Interactive Table with Sticky Header */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-xs text-left min-w-[1050px]">
            <thead className="sticky top-0 bg-[var(--sunk)]/95 backdrop-blur-xs z-10 border-b border-[var(--line)] text-[var(--muted)] select-none">
              <tr>
                {[
                  { field: 'id', label: '#', align: 'left', width: 'w-16' },
                  { field: 'o', label: 'Mở lúc', align: 'left' },
                  { field: 'c', label: 'Đóng lúc', align: 'left' },
                  { field: 's', label: 'Chiều', align: 'center' },
                  { field: 'v', label: 'Lot', align: 'center' },
                  { field: 'op', label: 'Giá vào', align: 'right' },
                  { field: 'sl', label: 'SL', align: 'right' },
                  { field: 'tp', label: 'TP', align: 'right' },
                  { field: 'cp', label: 'Giá ra', align: 'right' },
                  { field: 'move', label: 'Biến động', align: 'right' },
                  { field: 'dur', label: 'Giữ lệnh', align: 'center' },
                  { field: 'r', label: 'Cách đóng', align: 'center' },
                  { field: 'pl', label: 'P&L ($)', align: 'right' },
                ].map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field as SortField)}
                    className={`py-2.5 px-2.5 font-semibold cursor-pointer hover:text-[var(--ink)] transition-colors ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.width || ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                      }`}
                    >
                      <span>{col.label}</span>
                      {sortField === col.field ? (
                        sortAsc ? (
                          <ArrowUp className="w-3 h-3 text-[var(--brand)]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[var(--brand)]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
              {sortedTrades.map((t, idx) => {
                const isWin = t.pl > 0;
                const durMin = Math.round(getTradeDurationMinutes(t));
                const priceMove = getTradePriceMove(t);
                const hasNote = Boolean(t.note || (t.tags && t.tags.length > 0));

                return (
                  <tr
                    key={t.id}
                    onClick={() => openTradeDrawer(t)}
                    className="hover:bg-[var(--sunk)]/50 transition-colors cursor-pointer group"
                  >
                    {/* # Index / ID */}
                    <td className="py-2.5 px-2.5 text-[var(--muted)] flex items-center gap-1.5">
                      <span>{idx + 1}</span>
                      {hasNote && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" title="Có ghi chú nhật ký" />
                      )}
                    </td>

                    {/* Open Time */}
                    <td className="py-2.5 px-2.5 text-[var(--ink)] text-[11px] whitespace-nowrap">{t.o}</td>

                    {/* Close Time */}
                    <td className="py-2.5 px-2.5 text-[var(--ink)] text-[11px] whitespace-nowrap">{t.c}</td>

                    {/* Side */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.s === 'buy'
                            ? 'bg-[var(--win)]/15 text-[var(--win)]'
                            : 'bg-[var(--loss)]/15 text-[var(--loss)]'
                        }`}
                      >
                        {t.s.toUpperCase()}
                      </span>
                    </td>

                    {/* Volume */}
                    <td className="py-2.5 px-2.5 text-center font-medium">{t.v}</td>

                    {/* Open Price */}
                    <td className="py-2.5 px-2.5 text-right font-medium text-[var(--ink)]">
                      {t.op.toFixed(2)}
                    </td>

                    {/* SL */}
                    <td className="py-2.5 px-2.5 text-right text-[11px] text-[var(--muted)]">
                      {t.sl ? t.sl.toFixed(2) : <span className="text-[var(--loss)]/70">--</span>}
                    </td>

                    {/* TP */}
                    <td className="py-2.5 px-2.5 text-right text-[11px] text-[var(--muted)]">
                      {t.tp ? t.tp.toFixed(2) : '--'}
                    </td>

                    {/* Close Price */}
                    <td className="py-2.5 px-2.5 text-right font-medium text-[var(--ink)]">
                      {t.cp.toFixed(2)}
                    </td>

                    {/* Price Move */}
                    <td
                      className={`py-2.5 px-2.5 text-right font-medium text-[11px] ${
                        priceMove >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'
                      }`}
                    >
                      {priceMove >= 0 ? `+${priceMove.toFixed(2)}` : priceMove.toFixed(2)}
                    </td>

                    {/* Duration */}
                    <td className="py-2.5 px-2.5 text-center text-[11px] text-[var(--muted)]">
                      {durMin >= 60 ? `${Math.floor(durMin / 60)}h${durMin % 60}p` : `${durMin}p`}
                    </td>

                    {/* Close Reason */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          t.r === 'Chạm TP'
                            ? 'bg-[var(--win)]/15 text-[var(--win)]'
                            : t.r === 'Chạm SL'
                            ? 'bg-[var(--loss)]/15 text-[var(--loss)]'
                            : 'bg-[var(--sunk)] text-[var(--muted)]'
                        }`}
                      >
                        {t.r}
                      </span>
                    </td>

                    {/* Net P&L */}
                    <td
                      className={`py-2.5 px-2.5 text-right font-bold text-xs ${
                        isWin ? 'text-[var(--win)]' : 'text-[var(--loss)]'
                      }`}
                    >
                      {isWin ? `+$${t.pl.toFixed(2)}` : `-$${Math.abs(t.pl).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}

              {sortedTrades.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-xs text-[var(--muted)]">
                    Không tìm thấy lệnh nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Sticky Footer */}
        <div className="p-3 sm:p-4 bg-[var(--sunk)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--ink)]">
              Hiển thị: <strong className="font-mono">{footerStats.count}</strong> / {trades.length} lệnh
            </span>
            <span>•</span>
            <span className="text-[var(--muted)]">
              Tổng Lots: <strong className="font-mono text-[var(--ink)]">{footerStats.lots}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted)]">Winrate lọc:</span>
              <span className="font-bold text-[var(--win)] font-mono tabular-nums">{footerStats.winRate}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted)]">Tổng P&L lọc:</span>
              <span
                className={`text-sm font-extrabold font-mono tabular-nums ${
                  footerStats.netPl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'
                }`}
              >
                {footerStats.netPl >= 0 ? `+$${footerStats.netPl}` : `-$${Math.abs(footerStats.netPl)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
      </>
      ) : (
        /* Cashflow View */
        <div className="space-y-4">
          {/* Cashflow Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Total Deposits */}
            <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
              <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
                Tổng Tiền Nạp (Deposits)
              </span>
              <div className="text-xl font-extrabold text-[var(--win)] font-mono tabular-nums mt-1">
                +${Math.round(cash.filter((c) => c.k === 'Nạp' || c.a > 0).reduce((a, c) => a + c.a, 0) * 100) / 100}
              </div>
              <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                {cash.filter((c) => c.k === 'Nạp' || c.a > 0).length} giao dịch nạp vốn
              </span>
            </div>

            {/* Total Withdrawals */}
            <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
              <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
                Tổng Tiền Rút (Withdrawals)
              </span>
              <div className="text-xl font-extrabold text-amber-500 font-mono tabular-nums mt-1">
                -${Math.round(cash.filter((c) => c.k === 'Rút' || c.a < 0).reduce((a, c) => a + Math.abs(c.a), 0) * 100) / 100}
              </div>
              <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                {cash.filter((c) => c.k === 'Rút' || c.a < 0).length} giao dịch rút tiền
              </span>
            </div>

            {/* Net Cashflow & Strict Isolation Confirmation */}
            <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)] shadow-xs">
              <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
                Cam Kết Phân Lập Rút Tiền
              </span>
              <div className="text-sm font-bold text-[var(--ink)] mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--win)] inline-block" />
                <span>Hoàn toàn tách biệt Trading P&L</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1 leading-snug">
                Tiền rút được ghi nhận độc lập, không làm giảm Lợi nhuận ròng giao dịch, Winrate hay Profit Factor.
              </p>
            </div>
          </div>

          {/* Cashflow Table */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="sticky top-0 bg-[var(--sunk)]/95 backdrop-blur-xs z-10 border-b border-[var(--line)] text-[var(--muted)] select-none">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Thời Gian</th>
                    <th className="py-2.5 px-3 font-semibold">Mã Giao Dịch</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Phân Loại</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Số Tiền ($)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Số Dư Sau Giao Dịch ($)</th>
                    <th className="py-2.5 px-3 font-semibold">Ghi Chú MT5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
                  {cash.map((c, idx) => {
                    const isDep = c.k === 'Nạp' || c.a >= 0;
                    return (
                      <tr key={c.id || idx} className="hover:bg-[var(--sunk)]/40 transition-colors">
                        <td className="py-2.5 px-3 text-[var(--muted)]">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-[var(--ink)] whitespace-nowrap">{c.t}</td>
                        <td className="py-2.5 px-3 text-[var(--muted)]">{c.id || `--`}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDep
                                ? 'bg-[var(--win)]/15 text-[var(--win)]'
                                : 'bg-amber-500/15 text-amber-500'
                            }`}
                          >
                            {isDep ? 'NẠP TIỀN' : 'RÚT TIỀN'}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            isDep ? 'text-[var(--win)]' : 'text-amber-500'
                          }`}
                        >
                          {isDep ? `+$${c.a.toFixed(2)}` : `-$${Math.abs(c.a).toFixed(2)}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[var(--ink)]">
                          {c.bal > 0 ? `$${c.bal.toFixed(2)}` : '--'}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--muted)] max-w-xs truncate">
                          {c.comment || '--'}
                        </td>
                      </tr>
                    );
                  })}
                  {cash.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[var(--muted)]">
                        Không có bản ghi nạp hoặc rút tiền nào trong báo cáo này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trade Journal Drawer Modal */}
      {activeTrade && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-lg rounded-2xl border border-[var(--line)] shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--ink)] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--brand)]" />
                  Nhật Ký Lệnh #{activeTrade.id}
                </h3>
                <span className="text-xs text-[var(--muted)]">
                  {activeTrade.s.toUpperCase()} {activeTrade.v} Lot {activeTrade.symbol || 'XAUUSD'} • {activeTrade.c}
                </span>
              </div>
              <button
                onClick={() => setActiveTrade(null)}
                className="p-1 rounded-lg hover:bg-[var(--sunk)] text-[var(--muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics of Trade */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-[var(--sunk)] text-xs font-mono tabular-nums">
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Vào &rarr; Ra</span>
                <span className="font-bold">{activeTrade.op} &rarr; {activeTrade.cp}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Lý do đóng</span>
                <span className="font-semibold text-[var(--ink)]">{activeTrade.r}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block">Lợi nhuận ròng</span>
                <span className={`font-bold ${activeTrade.pl >= 0 ? 'text-[var(--win)]' : 'text-[var(--loss)]'}`}>
                  {activeTrade.pl >= 0 ? `+$${activeTrade.pl}` : `-$${Math.abs(activeTrade.pl)}`}
                </span>
              </div>
            </div>

            {/* Strategy Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--gold)]" />
                Gắn thẻ chiến lược (Tags):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_STRATEGY_TAGS.map((tag) => {
                  const isSelected = drawerTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-[var(--brand)] text-white border-[var(--brand)] font-semibold'
                          : 'bg-[var(--sunk)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lesson Note Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[var(--brand)]" />
                Ghi chú bài học / Tâm lý giao dịch:
              </label>
              <textarea
                value={drawerNote}
                onChange={(e) => setDrawerNote(e.target.value)}
                placeholder="Nhập ghi chú lý do vào lệnh, setup nến, tâm lý khi gồng lãi/lỗ hoặc bài học rút ra..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>

            {/* Chart Image Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)]" />
                Đính kèm link ảnh chart (TradingView / Imgur):
              </label>
              <input
                type="text"
                value={drawerChartUrl}
                onChange={(e) => setDrawerChartUrl(e.target.value)}
                placeholder="https://www.tradingview.com/x/..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setActiveTrade(null)}
                className="px-4 py-2 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--muted)] hover:bg-[var(--sunk)]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  saveTradeJournal();
                  setActiveTrade(null);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Ghi Chú</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
