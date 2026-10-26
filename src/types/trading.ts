/**
 * MT5 Trading Analytics & Risk Management System
 * Core Types & Unified Trading Schema
 */

export type OrderSide = 'buy' | 'sell';

export type CloseReason = 'Đóng tay' | 'Chạm SL' | 'Chạm TP' | 'Stop Out';

export interface Trade {
  id: string;             // Position ID (khóa chính)
  s: OrderSide;           // Side: 'buy' | 'sell'
  v: number;              // Volume / Lot (e.g. 0.01)
  o: string;              // Open Time 'YYYY.MM.DD HH:mm:ss'
  c: string;              // Close Time 'YYYY.MM.DD HH:mm:ss'
  op: number;             // Open Price
  cp: number;             // Close Price
  sl: number | null;      // Stop Loss
  tp: number | null;      // Take Profit
  pl: number;             // Net P&L (Profit + Commission + Swap)
  r: CloseReason;         // Lý do đóng lệnh
  b: number;              // Basket ID
  symbol?: string;        // Symbol (e.g. 'XAUUSD')
  commission?: number;
  swap?: number;
  profit?: number;
  note?: string;          // Ghi chú bài học nhật ký
  tags?: string[];        // Tags chiến lược: HMA, FVG, MBFX, DCA...
  chartUrl?: string;      // Link ảnh chart đính kèm
}

export interface Cashflow {
  id?: string;
  t: string;              // Time
  a: number;              // Amount: > 0 Nạp, < 0 Rút
  bal: number;            // Balance sau nạp/rút
  k: 'Nạp' | 'Rút';       // Loại
  comment?: string;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  type: string;           // 'Buy Limit' | 'Sell Limit' | 'Buy Stop' | 'Sell Stop'
  placedVolume: number;
  filledVolume: number;
  price: number;
  time: string;
  state: 'filled' | 'canceled';
  comment?: string;
}

export interface AccountInfo {
  name: string;           // VD: 'MISU'
  login: string;          // VD: '429179132'
  server: string;         // VD: 'Exness-MT5Real18'
  currency: string;       // VD: 'USD'
  type: string;           // 'Hedge' | 'Netting'
  exportDate: string;
}

export interface MT5Results {
  totalNetProfit: number;
  grossProfit?: number;
  grossLoss?: number;
  profitFactor: number;
  recoveryFactor: number;
  sharpeRatio: number;
  balanceDrawdownAbsolute: number;
  balanceDrawdownMaximal: number;
  balanceDrawdownMaximalPercent: number;
  tradesTotal?: number;
  winRate?: number;
}

export interface Basket {
  id: number;
  side: OrderSide;
  trades: Trade[];
  count: number;
  totalLots: number;
  minOpenPrice: number;
  maxOpenPrice: number;
  priceRange: number;
  firstOpenTime: string;
  lastCloseTime: string;
  durationMinutes: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  netPl: number;
}

export interface RuleInsight {
  id: string;
  title: string;
  tag: 'good' | 'risk' | 'info';
  tagLabel: string;       // 'Điểm mạnh' | 'Rủi ro cần xử lý' | 'Lưu ý'
  metric: string;         // Tóm tắt chỉ số nổi bật
  analysis: string;       // Phân tích chi tiết hành vi
  recommendation: string; // Khuyến nghị hành động
}

export interface AccountReportData {
  account: AccountInfo;
  trades: Trade[];
  cash: Cashflow[];
  bal: [string, number][];
  results?: MT5Results;
  pendingOrders?: PendingOrder[];
}

export interface DayStats {
  dateStr: string;        // 'YYYY-MM-DD'
  displayDate: string;    // '12/10'
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  winRate: number;
  netPl: number;
  totalLots: number;
  trades: Trade[];
}

export interface WeekStats {
  weekNumber: number;
  startDate: string;
  endDate: string;
  tradesCount: number;
  netPl: number;
  winRate: number;
}

export const EMPTY_REPORT_DATA: AccountReportData = {
  account: {
    name: 'Chưa nạp dữ liệu',
    login: 'N/A',
    server: '--',
    currency: 'USD',
    type: 'Hedge',
    exportDate: '--',
  },
  trades: [],
  cash: [],
  bal: [],
  results: {
    totalNetProfit: 0,
    profitFactor: 0,
    recoveryFactor: 0,
    sharpeRatio: 0,
    balanceDrawdownAbsolute: 0,
    balanceDrawdownMaximal: 0,
    balanceDrawdownMaximalPercent: 0,
    tradesTotal: 0,
    winRate: 0,
  },
  pendingOrders: [],
};
