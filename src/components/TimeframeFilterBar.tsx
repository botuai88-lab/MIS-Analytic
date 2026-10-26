import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Filter,
  X,
  ChevronDown,
  Trash2,
  UploadCloud,
  Layers,
} from 'lucide-react';
import { Trade } from '../types/trading';
import {
  TimeframeFilter,
  TimeframePreset,
  getAvailableMonths,
  getAvailableWeeks,
} from '../utils/timeFilter';

interface TimeframeFilterBarProps {
  allTrades: Trade[];
  filteredTradesCount: number;
  currentFilter: TimeframeFilter;
  onChangeFilter: (filter: TimeframeFilter) => void;
  onClearData: () => void;
  onOpenImportModal: () => void;
}

export const TimeframeFilterBar: React.FC<TimeframeFilterBarProps> = ({
  allTrades,
  filteredTradesCount,
  currentFilter,
  onChangeFilter,
  onClearData,
  onOpenImportModal,
}) => {
  const availableMonths = useMemo(() => getAvailableMonths(allTrades), [allTrades]);
  const availableWeeks = useMemo(() => getAvailableWeeks(allTrades), [allTrades]);

  const setPreset = (type: TimeframePreset) => {
    if (type === 'specific_month') {
      const defaultMonth = availableMonths[0]?.key || '';
      onChangeFilter({ type, selectedMonth: defaultMonth });
    } else if (type === 'specific_week') {
      const defaultWeek = availableWeeks[0]?.key || '';
      onChangeFilter({ type, selectedWeek: defaultWeek });
    } else if (type === 'custom') {
      onChangeFilter({
        type,
        startDate: currentFilter.startDate || '',
        endDate: currentFilter.endDate || '',
      });
    } else {
      onChangeFilter({ type });
    }
  };

  const isFiltered = currentFilter.type !== 'all';

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] flex items-center gap-1 mr-1">
            <Clock className="w-3.5 h-3.5 text-[var(--gold)]" />
            Thời gian:
          </span>

          <button
            type="button"
            onClick={() => setPreset('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentFilter.type === 'all'
                ? 'bg-[var(--brand)] text-white shadow-xs'
                : 'bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Tất cả ({allTrades.length})
          </button>

          <button
            type="button"
            onClick={() => setPreset('this_week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentFilter.type === 'this_week'
                ? 'bg-[var(--brand)] text-white shadow-xs'
                : 'bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Tuần này
          </button>

          <button
            type="button"
            onClick={() => setPreset('this_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentFilter.type === 'this_month'
                ? 'bg-[var(--brand)] text-white shadow-xs'
                : 'bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Tháng này
          </button>

          <button
            type="button"
            onClick={() => setPreset('specific_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentFilter.type === 'specific_month'
                ? 'bg-[var(--brand)] text-white shadow-xs'
                : 'bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Theo Tháng
          </button>

          <button
            type="button"
            onClick={() => setPreset('specific_week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentFilter.type === 'specific_week'
                ? 'bg-[var(--brand)] text-white shadow-xs'
                : 'bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Theo Tuần
          </button>

          <button
            type="button"
            onClick={() => setPreset('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentFilter.type === 'custom'
                ? 'bg-[var(--brand)] text-white shadow-xs'
                : 'bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Khoảng ngày
          </button>
        </div>

        {/* Right: Quick actions (Clear data & Import) */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              type="button"
              onClick={() => setPreset('all')}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--sunk)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 font-semibold transition-colors"
              title="Xem tất cả lệnh"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearData}
            className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 flex items-center gap-1 font-semibold transition-colors"
            title="Xóa hết dữ liệu để import file mới"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xoá hết dữ liệu để import mới</span>
          </button>

          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white hover:opacity-90 flex items-center gap-1 font-bold shadow-xs transition-opacity"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Nạp file mới</span>
          </button>
        </div>
      </div>

      {/* Sub-bar for Specific Month / Specific Week / Custom Date Range */}
      {currentFilter.type === 'specific_month' && availableMonths.length > 0 && (
        <div className="pt-2 border-t border-[var(--line)] flex items-center gap-3 text-xs animate-fadeIn">
          <span className="font-medium text-[var(--muted)]">Chọn tháng cần phân tích:</span>
          <select
            aria-label="Chọn tháng"
            value={currentFilter.selectedMonth || availableMonths[0]?.key}
            onChange={(e) =>
              onChangeFilter({ ...currentFilter, selectedMonth: e.target.value })
            }
            className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--sunk)] text-[var(--ink)] font-semibold focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.count} lệnh)
              </option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--gold)]">
            Đang hiển thị <strong className="font-mono tabular-nums">{filteredTradesCount}</strong> lệnh
          </span>
        </div>
      )}

      {currentFilter.type === 'specific_week' && availableWeeks.length > 0 && (
        <div className="pt-2 border-t border-[var(--line)] flex items-center gap-3 text-xs animate-fadeIn">
          <span className="font-medium text-[var(--muted)]">Chọn tuần cần phân tích:</span>
          <select
            aria-label="Chọn tuần"
            value={currentFilter.selectedWeek || availableWeeks[0]?.key}
            onChange={(e) =>
              onChangeFilter({ ...currentFilter, selectedWeek: e.target.value })
            }
            className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--sunk)] text-[var(--ink)] font-semibold focus:outline-none"
          >
            {availableWeeks.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label} — {w.count} lệnh
              </option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--gold)]">
            Đang hiển thị <strong className="font-mono tabular-nums">{filteredTradesCount}</strong> lệnh
          </span>
        </div>
      )}

      {currentFilter.type === 'custom' && (
        <div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--muted)]">Từ ngày:</span>
            <input
              type="date"
              aria-label="Từ ngày"
              value={currentFilter.startDate || ''}
              onChange={(e) =>
                onChangeFilter({ ...currentFilter, startDate: e.target.value })
              }
              className="px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--sunk)] text-[var(--ink)] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--muted)]">Đến ngày:</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={currentFilter.endDate || ''}
              onChange={(e) =>
                onChangeFilter({ ...currentFilter, endDate: e.target.value })
              }
              className="px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--sunk)] text-[var(--ink)] focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-[var(--gold)]">
            Đang lọc: <strong className="font-mono tabular-nums">{filteredTradesCount}</strong> lệnh
          </span>
        </div>
      )}
    </div>
  );
};
