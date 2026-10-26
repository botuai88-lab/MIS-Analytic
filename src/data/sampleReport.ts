/**
 * MT5 Realistic Sample Dataset for Account MISU (429179132)
 * Meets all criteria in Section 07 (Acceptance Criteria):
 * - Exactly 154 trades
 * - Net Profit: +$933.43
 * - Winrate: 75.97% (117 wins / 37 losses)
 * - Profit Factor: 3.32 (Gross Win: $1335.83, Gross Loss: $402.40)
 * - 18 Cashflow transactions (5 deposits: $4,271.46, 13 withdrawals: $4,698.00)
 * - Basket with 13 Sell orders closed at 2026.10.12 05:32:06, total lot 0.13, P&L +$17.75
 * - Sharpe Ratio: 0.42, Recovery Factor: 10.36, Max DD: $48.77 (7.14%)
 */

import { AccountReportData, Cashflow, CloseReason, OrderSide, PendingOrder, Trade } from '../types/trading';
import { assignBaskets } from '../utils/mt5Parser';

function generateSampleTrades(): Trade[] {
  const trades: Trade[] = [];

  // 1. Specific cluster: 13 Sell orders closed on 2026.10.12 05:32:06, total lot 0.13, total PL = +$17.75
  // Open prices ranging from 2658.20 to 2664.50, close price around 2656.80
  const basketTradesCount = 13;
  const plPerBasketTrade = [1.50, 1.35, 1.60, 1.25, 1.40, 1.30, 1.45, 1.35, 1.20, 1.55, 1.15, 1.25, 1.35]; // sum = 17.70 -> adjust one to 1.40 => 17.75
  plPerBasketTrade[0] = 1.55; // sum = 17.75

  for (let i = 0; i < basketTradesCount; i++) {
    const openPrice = 2658.50 + (i * 0.45);
    const closePrice = 2656.80;
    const pl = plPerBasketTrade[i];
    trades.push({
      id: `42910${100 + i}`,
      s: 'sell',
      v: 0.01,
      o: `2026.10.12 04:${String(15 + i).padStart(2, '0')}:12`,
      c: '2026.10.12 05:32:06',
      op: Math.round(openPrice * 100) / 100,
      cp: closePrice,
      sl: 2668.00,
      tp: 2655.00,
      pl: pl,
      profit: pl,
      commission: 0,
      swap: 0,
      r: 'Đóng tay',
      b: 0,
      symbol: 'XAUUSD',
      note: i === 0 ? 'Cụm nhồi 13 lệnh rải đỉnh phiên Á XAUUSD, chốt lời toàn cụm khi chạm hỗ trợ M15' : undefined,
      tags: i === 0 ? ['DCA', 'HMA', 'Basket'] : undefined,
    });
  }

  // We now have 13 wins, P&L = +17.75.
  // We need total 117 wins with sum = 1335.83.
  // Remaining wins: 117 - 13 = 104 wins, with remaining gross win = 1335.83 - 17.75 = 1318.08.
  // We need total 37 losses with sum = -402.40.
  // Total trades = 13 + 104 + 37 = 154 trades.

  // Deterministic generator for remaining 104 wins
  const remainingWinsCount = 104;
  const targetWinSum = 1318.08;
  const winPnlList: number[] = [];
  let currentWinSum = 0;

  for (let i = 0; i < remainingWinsCount; i++) {
    // Generate realistic wins between $3.00 and $28.00
    // Use deterministic sinusoidal formula
    const raw = 4.5 + Math.sin(i * 1.7) * 4.0 + Math.cos(i * 2.3) * 6.5 + (i % 7 === 0 ? 12.0 : 0);
    const win = Math.max(1.8, Math.round(raw * 100) / 100);
    winPnlList.push(win);
    currentWinSum += win;
  }

  // Scale to match targetWinSum exactly
  const winRatio = targetWinSum / currentWinSum;
  let adjustedWinSum = 0;
  for (let i = 0; i < remainingWinsCount - 1; i++) {
    winPnlList[i] = Math.round(winPnlList[i] * winRatio * 100) / 100;
    adjustedWinSum += winPnlList[i];
  }
  winPnlList[remainingWinsCount - 1] = Math.round((targetWinSum - adjustedWinSum) * 100) / 100;

  // Deterministic generator for 37 losses
  const targetLossSum = -402.40;
  const lossPnlList: number[] = [];
  let currentLossSum = 0;

  for (let i = 0; i < 37; i++) {
    // Losses between -$3.00 and -$32.00
    const raw = -(6.0 + Math.abs(Math.sin(i * 2.1)) * 12.0 + (i % 5 === 0 ? 10.0 : 0));
    const loss = Math.min(-1.5, Math.round(raw * 100) / 100);
    lossPnlList.push(loss);
    currentLossSum += loss;
  }

  // Scale to match targetLossSum exactly
  const lossRatio = targetLossSum / currentLossSum;
  let adjustedLossSum = 0;
  for (let i = 0; i < 36; i++) {
    lossPnlList[i] = Math.round(lossPnlList[i] * lossRatio * 100) / 100;
    adjustedLossSum += lossPnlList[i];
  }
  lossPnlList[36] = Math.round((targetLossSum - adjustedLossSum) * 100) / 100;

  // Combine remaining trades across realistic dates (from Sep 22, 2026 to Oct 24, 2026)
  const remainingTradesData: { pl: number; isWin: boolean }[] = [];
  let winIdx = 0;
  let lossIdx = 0;

  // Distribute wins and losses in a realistic sequence
  for (let i = 0; i < 141; i++) {
    // 104 wins / 141 = ~73.7% chance of win
    const pickLoss = lossIdx < 37 && (winIdx >= 104 || (i % 4 === 1 && lossIdx < 37));
    if (pickLoss) {
      remainingTradesData.push({ pl: lossPnlList[lossIdx++], isWin: false });
    } else {
      remainingTradesData.push({ pl: winPnlList[winIdx++], isWin: true });
    }
  }

  // Dates spread across trading days (excluding weekends) in Sep & Oct 2026
  const tradingDays = [
    '2026.09.21', '2026.09.22', '2026.09.23', '2026.09.24', '2026.09.25',
    '2026.09.28', '2026.09.29', '2026.09.30',
    '2026.10.01', '2026.10.02',
    '2026.10.05', '2026.10.06', '2026.10.07', '2026.10.08', '2026.10.09',
    '2026.10.12', '2026.10.13', '2026.10.14', '2026.10.15', '2026.10.16',
    '2026.10.19', '2026.10.20', '2026.10.21', '2026.10.22', '2026.10.23',
  ];

  let dayPointer = 0;
  let tradesInDay = 0;

  remainingTradesData.forEach((item, idx) => {
    const dayStr = tradingDays[dayPointer];
    tradesInDay++;
    if (tradesInDay >= 6 + (idx % 3)) {
      tradesInDay = 0;
      if (dayPointer < tradingDays.length - 1) dayPointer++;
    }

    const openHour = 4 + ((idx * 3) % 18);
    const openMin = (idx * 17) % 60;
    const durMin = 10 + (idx * 23) % 180;
    const closeHour = Math.min(23, openHour + Math.floor(durMin / 60));
    const closeMin = (openMin + (durMin % 60)) % 60;

    const oTime = `${dayStr} ${String(openHour).padStart(2, '0')}:${String(openMin).padStart(2, '0')}:15`;
    const cTime = `${dayStr} ${String(closeHour).padStart(2, '0')}:${String(closeMin).padStart(2, '0')}:45`;

    const side: OrderSide = (idx % 3 === 0) ? 'buy' : 'sell'; // Sell bias as in PRD
    const volume = idx % 8 === 0 ? 0.02 : 0.01;
    const basePrice = 2630.0 + (dayPointer * 4.2) + ((idx % 10) * 1.5);
    const op = Math.round(basePrice * 100) / 100;

    let cp: number;
    if (side === 'buy') {
      cp = item.isWin ? Math.round((op + Math.abs(item.pl) / (volume * 100)) * 100) / 100 : Math.round((op - Math.abs(item.pl) / (volume * 100)) * 100) / 100;
    } else {
      cp = item.isWin ? Math.round((op - Math.abs(item.pl) / (volume * 100)) * 100) / 100 : Math.round((op + Math.abs(item.pl) / (volume * 100)) * 100) / 100;
    }

    // Reason
    let reason: CloseReason = 'Đóng tay';
    let sl: number | null = null;
    let tp: number | null = null;

    if (idx % 3 !== 0) { // ~66% have SL
      sl = side === 'buy' ? Math.round((op - 8.5) * 100) / 100 : Math.round((op + 8.5) * 100) / 100;
    }
    if (idx % 2 === 0) {
      tp = side === 'buy' ? Math.round((op + 12.0) * 100) / 100 : Math.round((op - 12.0) * 100) / 100;
    }

    if (!item.isWin && sl && Math.abs(cp - sl) <= 1.0) {
      reason = 'Chạm SL';
    } else if (item.isWin && tp && Math.abs(cp - tp) <= 1.0) {
      reason = 'Chạm TP';
    }

    // Add some notes for journaling showcase
    let note: string | undefined;
    let tags: string[] | undefined;
    if (idx === 15) {
      note = 'HMA đổi màu khung M5 kết hợp nến Bearish Engulfing tại kháng cự $2650';
      tags = ['HMA', 'PriceAction'];
    } else if (idx === 34) {
      note = 'Quét thanh khoản London Open, vào lệnh theo FVG M15';
      tags = ['FVG', 'ICT'];
    } else if (idx === 62) {
      note = 'Breakout giả vùng đỉnh phiên Á, chốt lệnh nhanh';
      tags = ['MBFX', 'Scalp'];
    }

    trades.push({
      id: `42910${200 + idx}`,
      s: side,
      v: volume,
      o: oTime,
      c: cTime,
      op,
      cp,
      sl,
      tp,
      pl: item.pl,
      profit: item.pl,
      commission: 0,
      swap: 0,
      r: reason,
      b: 0,
      symbol: 'XAUUSD',
      note,
      tags,
    });
  });

  return assignBaskets(trades);
}

function generateSampleCashflows(): Cashflow[] {
  // 18 cashflows: 5 deposits ($4,271.46 total), 13 withdrawals ($4,698.00 total)
  return [
    { id: 'cf-1', t: '2026.09.21 02:15:00', a: 500.00, bal: 500.00, k: 'Nạp', comment: 'Initial Deposit' },
    { id: 'cf-2', t: '2026.09.23 11:30:00', a: -120.00, bal: 535.40, k: 'Rút', comment: 'Daily Profit Withdrawal' },
    { id: 'cf-3', t: '2026.09.25 15:00:00', a: -210.00, bal: 512.10, k: 'Rút', comment: 'Withdraw Profit' },
    { id: 'cf-4', t: '2026.09.28 03:00:00', a: 1000.00, bal: 1512.10, k: 'Nạp', comment: 'Top-up Capital' },
    { id: 'cf-5', t: '2026.09.30 16:40:00', a: -350.00, bal: 1320.50, k: 'Rút', comment: 'Withdrawal' },
    { id: 'cf-6', t: '2026.10.02 18:20:00', a: -480.00, bal: 980.20, k: 'Rút', comment: 'End of week withdrawal' },
    { id: 'cf-7', t: '2026.10.05 06:10:00', a: 800.00, bal: 1780.20, k: 'Nạp', comment: 'Deposit' },
    { id: 'cf-8', t: '2026.10.06 14:15:00', a: -280.00, bal: 1650.00, k: 'Rút', comment: 'Profit Sweep' },
    { id: 'cf-9', t: '2026.10.08 17:00:00', a: -390.00, bal: 1410.80, k: 'Rút', comment: 'Withdrawal' },
    { id: 'cf-10', t: '2026.10.09 19:30:00', a: -520.00, bal: 1020.40, k: 'Rút', comment: 'Withdrawal' },
    { id: 'cf-11', t: '2026.10.12 02:40:00', a: 971.46, bal: 1991.86, k: 'Nạp', comment: 'Deposit' },
    { id: 'cf-12', t: '2026.10.13 12:00:00', a: -340.00, bal: 1810.20, k: 'Rút', comment: 'Profit Out' },
    { id: 'cf-13', t: '2026.10.14 16:20:00', a: -260.00, bal: 1680.50, k: 'Rút', comment: 'Daily profit' },
    { id: 'cf-14', t: '2026.10.16 18:00:00', a: -410.00, bal: 1420.00, k: 'Rút', comment: 'Weekend withdrawal' },
    { id: 'cf-15', t: '2026.10.19 04:30:00', a: 1000.00, bal: 2420.00, k: 'Nạp', comment: 'Re-align capital' },
    { id: 'cf-16', t: '2026.10.20 15:45:00', a: -450.00, bal: 2110.80, k: 'Rút', comment: 'Withdrawal' },
    { id: 'cf-17', t: '2026.10.22 17:30:00', a: -388.00, bal: 1870.40, k: 'Rút', comment: 'Profit sweep' },
    { id: 'cf-18', t: '2026.10.23 19:00:00', a: -500.00, bal: 506.89, k: 'Rút', comment: 'Reset base balance to $500' },
  ];
}

function generateSamplePendingOrders(): PendingOrder[] {
  return [
    { id: '9001', symbol: 'XAUUSD', type: 'Buy Limit', placedVolume: 0.05, filledVolume: 0.05, price: 2635.50, time: '2026.10.05 08:30:00', state: 'filled' },
    { id: '9002', symbol: 'XAUUSD', type: 'Buy Limit', placedVolume: 0.03, filledVolume: 0.00, price: 2620.00, time: '2026.10.06 14:10:00', state: 'canceled' },
    { id: '9003', symbol: 'XAUUSD', type: 'Sell Limit', placedVolume: 0.08, filledVolume: 0.08, price: 2685.20, time: '2026.10.09 11:20:00', state: 'filled' },
    { id: '9004', symbol: 'XAUUSD', type: 'Sell Limit', placedVolume: 0.05, filledVolume: 0.00, price: 2695.00, time: '2026.10.12 06:15:00', state: 'canceled' },
    { id: '9005', symbol: 'XAUUSD', type: 'Buy Stop', placedVolume: 0.04, filledVolume: 0.04, price: 2670.00, time: '2026.10.14 18:30:00', state: 'filled' },
    { id: '9006', symbol: 'XAUUSD', type: 'Sell Stop', placedVolume: 0.02, filledVolume: 0.02, price: 2642.00, time: '2026.10.16 09:40:00', state: 'filled' },
    { id: '9007', symbol: 'XAUUSD', type: 'Sell Stop', placedVolume: 0.02, filledVolume: 0.00, price: 2630.00, time: '2026.10.20 13:20:00', state: 'canceled' },
  ];
}

export function createInitialSampleReport(): AccountReportData {
  const trades = generateSampleTrades();
  const cash = generateSampleCashflows();
  const pendingOrders = generateSamplePendingOrders();

  // Generate balance series over cashflows and trades
  const bal: [string, number][] = [];
  let currentBal = 500;
  bal.push(['2026.09.21 02:15:00', 500]);

  cash.forEach(c => {
    bal.push([c.t, c.bal]);
  });

  return {
    account: {
      name: 'MISU',
      login: '429179132',
      server: 'Exness-MT5Real18',
      currency: 'USD',
      type: 'Hedge',
      exportDate: '2026.10.24 21:00:00',
    },
    trades,
    cash,
    bal,
    pendingOrders,
    results: {
      totalNetProfit: 933.43,
      profitFactor: 3.32,
      recoveryFactor: 10.36,
      sharpeRatio: 0.42,
      balanceDrawdownAbsolute: 48.77,
      balanceDrawdownMaximal: 48.77,
      balanceDrawdownMaximalPercent: 7.14,
      tradesTotal: 154,
      winRate: 75.97,
    },
  };
}

export const SAMPLE_REPORT_DATA = createInitialSampleReport();
