/**
 * MT5 Multi-Table CSV / HTML / Excel (.xlsx, .xls) Parser
 * Ultra-resilient parser supporting CSV, TSV, HTML Reports, MT5 Open XML, and Excel exports.
 * Guarantees zero confusion between Trading P&L and Balance Withdrawals (Rút tiền).
 */

import * as XLSX from 'xlsx';
import {
  AccountInfo,
  AccountReportData,
  Cashflow,
  CloseReason,
  MT5Results,
  PendingOrder,
  Trade,
} from '../types/trading';

/**
 * Clean MT5 numeric strings:
 * Removes thousand-separator spaces, non-breaking spaces (\u00A0),
 * space after minus signs ('- 10.35' -> '-10.35'), and currency symbols ($ , €).
 */
export function cleanMt5Number(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const cleaned = String(val)
    .replace(/[\s\u00A0\u200B\u200E\u200F]+/g, '') // strip all whitespace & non-breaking spaces
    .replace(/[$€₫]/g, '')                          // strip currency symbols
    .replace(/,/g, '');                             // strip commas

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date string from MT5 formats:
 * 'YYYY.MM.DD HH:mm:ss', 'YYYY.MM.DD HH:mm', 'YYYY-MM-DD HH:mm:ss', 'YYYY/MM/DD'
 */
export function parseMt5Timestamp(timeStr: string): number {
  if (!timeStr) return 0;
  const normalized = timeStr.trim().replace(/\./g, '-').replace(/\//g, '-');
  const d = new Date(normalized + (normalized.includes('Z') ? '' : 'Z'));
  const ts = d.getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * Format timestamp to 'YYYY.MM.DD HH:mm:ss'
 */
export function formatMt5Time(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${y}.${m}.${day} ${h}:${min}:${s}`;
}

/**
 * Normalize date string to YYYY.MM.DD HH:mm:ss
 */
export function normalizeMt5Date(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  // Match DD.MM.YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const hour = (dmyMatch[4] || '00').padStart(2, '0');
    const min = (dmyMatch[5] || '00').padStart(2, '0');
    const sec = (dmyMatch[6] || '00').padStart(2, '0');
    return `${year}.${month}.${day} ${hour}:${min}:${sec}`;
  }
  return str.replace(/\//g, '.').replace(/-/g, '.');
}

/**
 * Compute Basket Grouping:
 * Trades with the same side ('buy'/'sell') closed within <= 60s of each other share the same basket_id.
 */
export function assignBaskets(trades: Trade[]): Trade[] {
  if (trades.length === 0) return [];

  // Sort trades by close time ascending
  const sorted = [...trades].sort((a, b) => {
    const tsA = parseMt5Timestamp(a.c);
    const tsB = parseMt5Timestamp(b.c);
    return tsA - tsB;
  });

  let basketId = 1;
  sorted[0].b = basketId;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevTs = parseMt5Timestamp(prev.c);
    const currTs = parseMt5Timestamp(curr.c);
    const diffSec = Math.abs(currTs - prevTs) / 1000;

    if (curr.s === prev.s && diffSec <= 60) {
      curr.b = prev.b;
    } else {
      basketId++;
      curr.b = basketId;
    }
  }

  return sorted;
}

/**
 * Deduplicate and merge new account report data into existing data
 */
export function mergeReportData(existing: AccountReportData, incoming: AccountReportData): AccountReportData {
  // Trade deduplication by ID
  const tradeMap = new Map<string, Trade>();
  existing.trades.forEach(t => tradeMap.set(t.id, t));
  incoming.trades.forEach(t => {
    if (!tradeMap.has(t.id)) {
      tradeMap.set(t.id, t);
    } else {
      // Keep existing user notes/tags
      const curr = tradeMap.get(t.id)!;
      tradeMap.set(t.id, {
        ...t,
        note: curr.note || t.note,
        tags: curr.tags || t.tags,
        chartUrl: curr.chartUrl || t.chartUrl,
      });
    }
  });

  const allTrades = assignBaskets(Array.from(tradeMap.values()));

  // Cashflow deduplication
  const cashKey = (c: Cashflow) => `${c.t}_${c.a}_${c.bal}`;
  const cashMap = new Map<string, Cashflow>();
  existing.cash.forEach(c => cashMap.set(cashKey(c), c));
  incoming.cash.forEach(c => cashMap.set(cashKey(c), c));

  const allCash = Array.from(cashMap.values()).sort(
    (a, b) => parseMt5Timestamp(a.t) - parseMt5Timestamp(b.t)
  );

  // Merge balance series
  const balMap = new Map<string, number>();
  existing.bal.forEach(([t, b]) => balMap.set(t, b));
  incoming.bal.forEach(([t, b]) => balMap.set(t, b));
  const allBal: [string, number][] = Array.from(balMap.entries())
    .map(([t, b]) => [t, b] as [string, number])
    .sort((a, b) => parseMt5Timestamp(a[0]) - parseMt5Timestamp(b[0]));

  return {
    account: {
      name: incoming.account.name && incoming.account.name !== 'Chưa nạp dữ liệu' && incoming.account.name !== 'Tài khoản MT5' ? incoming.account.name : existing.account.name,
      login: incoming.account.login && incoming.account.login !== 'N/A' ? incoming.account.login : existing.account.login,
      server: incoming.account.server && incoming.account.server !== '--' ? incoming.account.server : existing.account.server,
      currency: incoming.account.currency || existing.account.currency || 'USD',
      type: incoming.account.type || existing.account.type || 'Hedge',
      exportDate: incoming.account.exportDate || existing.account.exportDate || formatMt5Time(new Date()),
    },
    trades: allTrades,
    cash: allCash,
    bal: allBal,
    results: incoming.results || existing.results,
    pendingOrders: incoming.pendingOrders || existing.pendingOrders,
  };
}

/**
 * Split a raw row into columns (CSV, TSV, or Semicolon)
 */
function splitCsvRow(row: string): string[] {
  // If tab separated
  if (row.includes('\t')) {
    return row.split('\t').map(s => s.trim().replace(/^"|"$/g, ''));
  }
  // If semicolon separated
  if (row.includes(';') && !row.includes(',')) {
    return row.split(';').map(s => s.trim().replace(/^"|"$/g, ''));
  }

  // Comma separated with quote handling
  const matches: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      matches.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += ch;
    }
  }
  matches.push(cur.trim().replace(/^"|"$/g, ''));
  return matches;
}

/**
 * Extract rows from HTML report (if user uploaded MT5 .html or HTML in .csv)
 */
function extractRowsFromHtml(htmlText: string): string[][] {
  const rows: string[][] = [];
  const trMatches = htmlText.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!trMatches) return [];

  for (const tr of trMatches) {
    const cellMatches = tr.match(/<(td|th)[\s\S]*?<\/(td|th)>/gi);
    if (cellMatches) {
      const cells = cellMatches.map(c =>
        c
          .replace(/<[^>]*>/g, '') // remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim()
      );
      if (cells.length > 0) rows.push(cells);
    }
  }

  return rows;
}

/**
 * Detect column indices for flat trade tables (Exness Excel, MT5 History export, etc.)
 */
function detectColumnMapping(headers: string[]): Record<string, number> | null {
  const map: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const lower = h.toLowerCase().trim();
    if (/^(ticket|mã lệnh|position|vị thế|deal|order|lệnh|id)$/i.test(lower)) {
      if (!('id' in map)) map['id'] = idx;
    } else if (/^(open time|thời gian mở|time \(open\)|open_time|time open)$/i.test(lower)) {
      map['open_time'] = idx;
    } else if (/^(close time|thời gian đóng|time \(close\)|close_time|time close)$/i.test(lower)) {
      map['close_time'] = idx;
    } else if (/^(time|thời gian|date|ngày)$/i.test(lower)) {
      if (!('open_time' in map)) map['open_time'] = idx;
      else if (!('close_time' in map)) map['close_time'] = idx;
    } else if (/^(type|loại|loại lệnh|side|direction|hướng)$/i.test(lower)) {
      map['type'] = idx;
    } else if (/^(volume|lots|khối lượng|size|số lot)$/i.test(lower)) {
      map['volume'] = idx;
    } else if (/^(symbol|ký hiệu|cặp tiền|item|mã)$/i.test(lower)) {
      map['symbol'] = idx;
    } else if (/^(open price|giá mở|price \(open\)|open_price)$/i.test(lower)) {
      map['open_price'] = idx;
    } else if (/^(close price|giá đóng|price \(close\)|close_price)$/i.test(lower)) {
      map['close_price'] = idx;
    } else if (/^(price|giá)$/i.test(lower)) {
      if (!('open_price' in map)) map['open_price'] = idx;
      else if (!('close_price' in map)) map['close_price'] = idx;
    } else if (/^(s\s*\/\s*l|sl|cắt lỗ|stop\s*loss)$/i.test(lower)) {
      map['sl'] = idx;
    } else if (/^(t\s*\/\s*p|tp|chốt lời|take\s*profit)$/i.test(lower)) {
      map['tp'] = idx;
    } else if (/^(commission|hoa hồng|comm|phí sàn)$/i.test(lower)) {
      map['commission'] = idx;
    } else if (/^(swap|phí qua đêm|swaps)$/i.test(lower)) {
      map['swap'] = idx;
    } else if (/^(profit|lợi nhuận|p\/l|p&l|lãi\/lỗ)$/i.test(lower)) {
      map['profit'] = idx;
    } else if (/^(balance|số dư)$/i.test(lower)) {
      map['balance'] = idx;
    } else if (/^(comment|ghi chú|nội dung)$/i.test(lower)) {
      map['comment'] = idx;
    }
  });

  // Flat table requires at least type or volume AND profit or open price
  if (('type' in map || 'volume' in map) && ('profit' in map || 'open_price' in map)) {
    return map;
  }
  return null;
}

/**
 * Unified Parser for 2D rows (from CSV, HTML, or Excel .xlsx/.xls)
 */
export function parseMt5Rows(rows: (string | number)[][]): AccountReportData {
  if (!rows || rows.length === 0) {
    throw new Error('Bảng dữ liệu rỗng. Vui lòng kiểm tra lại file báo cáo.');
  }

  const account: AccountInfo = {
    name: 'Tài khoản MT5',
    login: 'N/A',
    server: '--',
    currency: 'USD',
    type: 'Hedge',
    exportDate: formatMt5Time(new Date()),
  };

  const trades: Trade[] = [];
  const cash: Cashflow[] = [];
  const bal: [string, number][] = [];
  const pendingOrders: PendingOrder[] = [];
  const results: MT5Results = {
    totalNetProfit: 0,
    profitFactor: 0,
    recoveryFactor: 0,
    sharpeRatio: 0,
    balanceDrawdownAbsolute: 0,
    balanceDrawdownMaximal: 0,
    balanceDrawdownMaximalPercent: 0,
  };

  let currentSection: 'header' | 'positions' | 'orders' | 'deals' | 'results' | 'flat' = 'header';
  const dealCloseReasons = new Map<string, CloseReason>();
  let flatColMap: Record<string, number> | null = null;

  interface RawDeal {
    time: string;
    dealId: string;
    symbol: string;
    type: string;
    direction: string;
    volume: number;
    price: number;
    posId: string;
    commission: number;
    swap: number;
    profit: number;
    balance: number;
    comment: string;
  }
  const allRawDeals: RawDeal[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rawCols = rows[i];
    if (!rawCols || rawCols.length === 0) continue;

    // Convert row to trimmed strings
    const cols = rawCols.map(c => (c !== null && c !== undefined ? String(c).trim() : ''));
    if (cols.every(c => c === '')) continue;

    const rowText = cols.join(' ').toLowerCase();
    const firstCol = (cols[0] || '').toLowerCase();
    const secondCol = (cols[1] || '').toLowerCase();

    // 1. Explicit Section Title row detection
    if (cols.length <= 4 && (rowText.includes('positions') || rowText.includes('vị thế') || rowText.includes('closed positions'))) {
      currentSection = 'positions';
      flatColMap = null;
      continue;
    }
    if (cols.length <= 4 && (rowText.includes('orders') || rowText.includes('lịch sử lệnh') || rowText.includes('pending orders'))) {
      currentSection = 'orders';
      flatColMap = null;
      continue;
    }
    if (cols.length <= 4 && (rowText.includes('deals') || rowText.includes('khớp lệnh') || rowText.includes('nạp/rút') || rowText.includes('trade history'))) {
      currentSection = 'deals';
      flatColMap = null;
      continue;
    }
    if (cols.length <= 4 && (rowText.includes('results') || rowText.includes('chỉ số') || rowText.includes('kết quả') || rowText.includes('summary'))) {
      currentSection = 'results';
      flatColMap = null;
      continue;
    }

    // 2. Table Column Header detection
    const isPotentialHeader =
      firstCol.includes('time') ||
      firstCol.includes('thời gian') ||
      firstCol.includes('date') ||
      firstCol.includes('ticket') ||
      firstCol.includes('mã lệnh') ||
      secondCol.includes('position') ||
      secondCol.includes('deal') ||
      secondCol.includes('order') ||
      secondCol.includes('open time');

    if (isPotentialHeader) {
      // Check standard MT5 multi-table sections first
      if (rowText.includes('deal') && (rowText.includes('direction') || rowText.includes('hướng') || cols.length >= 12)) {
        currentSection = 'deals';
        flatColMap = null;
        continue;
      }
      if (rowText.includes('position') || (rowText.includes('symbol') && (rowText.includes('s/l') || rowText.includes('t/p')) && cols.length >= 10)) {
        currentSection = 'positions';
        flatColMap = null;
        continue;
      }
      if (rowText.includes('placed') || rowText.includes('filled') || rowText.includes('state')) {
        currentSection = 'orders';
        flatColMap = null;
        continue;
      }

      // Check if it's a flat single table with dynamic column names (e.g. Exness Excel export)
      const detectedMap = detectColumnMapping(cols);
      if (detectedMap && ('close_time' in detectedMap || 'close_price' in detectedMap || 'profit' in detectedMap)) {
        flatColMap = detectedMap;
        currentSection = 'flat';
        continue;
      }
      continue;
    }

    // 3. Header info parsing (Account, Name, Server, Currency)
    if (currentSection === 'header' || i < 15) {
      const fullText = cols.join(' ');
      if (fullText.includes('Name:') || fullText.includes('Tên:')) {
        const m = fullText.match(/(?:Name|Tên):\s*([^,;]+)/i);
        if (m) account.name = m[1].trim();
      }
      if (fullText.includes('Account:') || fullText.includes('Tài khoản:')) {
        const m = fullText.match(/(?:Account|Tài khoản):\s*([^,;]+)/i);
        if (m) account.login = m[1].trim();
      }
      if (fullText.includes('Company:') || fullText.includes('Công ty:') || fullText.includes('Server:')) {
        const m = fullText.match(/(?:Company|Công ty|Server):\s*([^,;]+)/i);
        if (m) account.server = m[1].trim();
      }
      if (fullText.includes('Currency:') || fullText.includes('Tiền tệ:')) {
        const m = fullText.match(/(?:Currency|Tiền tệ):\s*([A-Z]{3})/i);
        if (m) account.currency = m[1].trim();
      }
      if (fullText.includes('Hedge') || fullText.includes('Netting')) {
        account.type = fullText.includes('Hedge') ? 'Hedge' : 'Netting';
      }
      if (fullText.includes('Date:') || fullText.includes('Thời gian:')) {
        const m = fullText.match(/\d{4}[\.\/-]\d{2}[\.\/-]\d{2}\s+\d{2}:\d{2}(?::\d{2})?/);
        if (m) account.exportDate = normalizeMt5Date(m[0]);
      }
    }

    // 4. Flat Table Parsing (e.g. Exness Excel export or flat table copy-paste)
    if (currentSection === 'flat' && flatColMap) {
      const typeColVal = flatColMap.type !== undefined ? (cols[flatColMap.type] || '').toLowerCase().trim() : '';
      const commentColVal = flatColMap.comment !== undefined ? (cols[flatColMap.comment] || '').toLowerCase() : '';
      const symbolVal = flatColMap.symbol !== undefined ? cols[flatColMap.symbol] || '' : '';
      const profitVal = flatColMap.profit !== undefined ? cleanMt5Number(cols[flatColMap.profit]) : 0;
      const timeVal = flatColMap.close_time !== undefined && cols[flatColMap.close_time]
        ? cols[flatColMap.close_time]
        : (flatColMap.open_time !== undefined ? cols[flatColMap.open_time] : '');

      // Check cashflow
      const isBalanceCashflow =
        typeColVal === 'balance' ||
        typeColVal === 'credit' ||
        (symbolVal === '' && (commentColVal.includes('deposit') || commentColVal.includes('withdraw') || commentColVal.includes('rút') || commentColVal.includes('nạp')));

      if (isBalanceCashflow) {
        const isDep = profitVal >= 0;
        const balVal = flatColMap.balance !== undefined ? cleanMt5Number(cols[flatColMap.balance]) : 0;
        cash.push({
          id: (flatColMap.id !== undefined ? cols[flatColMap.id] : '') || `cash-${i}`,
          t: normalizeMt5Date(timeVal),
          a: profitVal,
          bal: balVal,
          k: isDep ? 'Nạp' : 'Rút',
          comment: cols[flatColMap.comment || 0] || '',
        });
        if (balVal > 0) bal.push([normalizeMt5Date(timeVal), balVal]);
        continue;
      }

      if (typeColVal === 'buy' || typeColVal === 'sell') {
        const posId = (flatColMap.id !== undefined ? cols[flatColMap.id] : '') || `trade-${i}`;
        const openTime = normalizeMt5Date(flatColMap.open_time !== undefined ? cols[flatColMap.open_time] : timeVal);
        const closeTime = normalizeMt5Date(flatColMap.close_time !== undefined && cols[flatColMap.close_time] ? cols[flatColMap.close_time] : timeVal);
        const volume = flatColMap.volume !== undefined ? cleanMt5Number(cols[flatColMap.volume]) : 0.01;
        const openPrice = flatColMap.open_price !== undefined ? cleanMt5Number(cols[flatColMap.open_price]) : 0;
        const closePrice = flatColMap.close_price !== undefined ? cleanMt5Number(cols[flatColMap.close_price]) : 0;
        const slVal = flatColMap.sl !== undefined ? cleanMt5Number(cols[flatColMap.sl]) : 0;
        const tpVal = flatColMap.tp !== undefined ? cleanMt5Number(cols[flatColMap.tp]) : 0;
        const comm = flatColMap.commission !== undefined ? cleanMt5Number(cols[flatColMap.commission]) : 0;
        const swap = flatColMap.swap !== undefined ? cleanMt5Number(cols[flatColMap.swap]) : 0;
        const netPl = Math.round((profitVal + comm + swap) * 100) / 100;

        let reason: CloseReason = 'Đóng tay';
        if (commentColVal.includes('sl') || (slVal > 0 && Math.abs(closePrice - slVal) <= 0.1)) {
          reason = 'Chạm SL';
        } else if (commentColVal.includes('tp') || (tpVal > 0 && Math.abs(closePrice - tpVal) <= 0.1)) {
          reason = 'Chạm TP';
        } else if (commentColVal.includes('so') || commentColVal.includes('stop out')) {
          reason = 'Stop Out';
        }

        trades.push({
          id: posId,
          s: typeColVal as 'buy' | 'sell',
          v: volume,
          o: openTime,
          c: closeTime,
          op: openPrice,
          cp: closePrice,
          sl: slVal > 0 ? slVal : null,
          tp: tpVal > 0 ? tpVal : null,
          pl: netPl,
          profit: profitVal,
          commission: comm,
          swap,
          r: reason,
          b: 0,
          symbol: symbolVal || 'XAUUSD',
        });
        continue;
      }
    }

    // 5. Positions Section (Standard MT5 Report)
    // Time(0), Position(1), Symbol(2), Type(3: buy/sell), Volume(4), Price(5), S/L(6), T/P(7), Time(8), Price(9), Commission(10), Swap(11), Profit(12)
    if (currentSection === 'positions' && cols.length >= 10) {
      const typeStr = (cols[3] || cols[2] || '').toLowerCase().trim();
      if (typeStr === 'buy' || typeStr === 'sell') {
        const openTime = normalizeMt5Date(cols[0]);
        const posId = cols[1];
        const symbol = cols[2] || 'XAUUSD';
        const side: 'buy' | 'sell' = typeStr as 'buy' | 'sell';
        const volume = cleanMt5Number(cols[4]);
        const openPrice = cleanMt5Number(cols[5]);
        const slVal = cleanMt5Number(cols[6]);
        const tpVal = cleanMt5Number(cols[7]);
        const closeTime = normalizeMt5Date(cols[8]);
        const closePrice = cleanMt5Number(cols[9]);
        const comm = cleanMt5Number(cols[10]);
        const swap = cleanMt5Number(cols[11]);
        const profit = cleanMt5Number(cols[12]);
        const netPl = Math.round((profit + comm + swap) * 100) / 100;

        let reason: CloseReason = dealCloseReasons.get(posId) || 'Đóng tay';
        if (slVal > 0 && Math.abs(closePrice - slVal) <= 0.1) {
          reason = 'Chạm SL';
        } else if (tpVal > 0 && Math.abs(closePrice - tpVal) <= 0.1) {
          reason = 'Chạm TP';
        }

        trades.push({
          id: posId,
          s: side,
          v: volume,
          o: openTime,
          c: closeTime,
          op: openPrice,
          cp: closePrice,
          sl: slVal > 0 ? slVal : null,
          tp: tpVal > 0 ? tpVal : null,
          pl: netPl,
          profit,
          commission: comm,
          swap,
          r: reason,
          b: 0,
          symbol,
        });
      }
    }

    // 6. Deals Section (Standard MT5 Report)
    // Format: Time(0), Deal(1), Symbol(2), Type(3), Direction(4: in/out), Volume(5), Price(6), Order/Pos(7), Commission(8), Fee(9), Swap(10), Profit(11), Balance(12), Comment(13)
    if (currentSection === 'deals' && cols.length >= 6) {
      const time = normalizeMt5Date(cols[0]);
      const dealId = cols[1];
      const symbol = cols[2] || '';
      const typeStr = (cols[3] || '').toLowerCase().trim();
      const dirStr = (cols[4] || '').toLowerCase().trim();
      const volume = cleanMt5Number(cols[5]);
      const price = cleanMt5Number(cols[6]);
      const orderId = cols[7] || cols[1] || '';
      const comm = cleanMt5Number(cols[8]);
      const swap = cleanMt5Number(cols[10]);
      const profit = cleanMt5Number(cols[11] || cols[10]);
      const balance = cleanMt5Number(cols[12] || cols[11]);
      const comment = (cols[13] || cols[12] || '').toLowerCase();

      const isBalanceCashflow =
        typeStr === 'balance' ||
        typeStr === 'credit' ||
        (symbol === '' && (comment.includes('deposit') || comment.includes('withdraw') || comment.includes('rút') || comment.includes('nạp')));

      if (isBalanceCashflow) {
        const isDep = profit >= 0;
        cash.push({
          id: dealId || `deal-${i}`,
          t: time,
          a: profit,
          bal: balance,
          k: isDep ? 'Nạp' : 'Rút',
          comment: cols[13] || cols[12] || '',
        });
        if (balance > 0) bal.push([time, balance]);
      } else if (typeStr === 'buy' || typeStr === 'sell') {
        allRawDeals.push({
          time,
          dealId,
          symbol,
          type: typeStr,
          direction: dirStr,
          volume,
          price,
          posId: orderId,
          commission: comm,
          swap,
          profit,
          balance,
          comment,
        });

        if (dirStr.includes('out') || dirStr === 'out') {
          let reason: CloseReason = 'Đóng tay';
          if (comment.includes('sl') || comment.includes('[sl]')) {
            reason = 'Chạm SL';
          } else if (comment.includes('tp') || comment.includes('[tp]')) {
            reason = 'Chạm TP';
          } else if (comment.includes('so') || comment.includes('stop out')) {
            reason = 'Stop Out';
          }
          if (orderId) dealCloseReasons.set(orderId, reason);
          if (balance > 0) bal.push([time, balance]);
        }
      }
    }

    // 7. Orders Section
    if (currentSection === 'orders' && cols.length >= 6) {
      const orderId = cols[1];
      const symbol = cols[2];
      const orderType = cols[3];
      const volStr = cols[4] || '';
      const price = cleanMt5Number(cols[5]);
      const state = (cols[9] || '').toLowerCase();

      if (volStr.includes('/')) {
        const [placed, filled] = volStr.split('/').map(v => cleanMt5Number(v));
        pendingOrders.push({
          id: orderId,
          symbol: symbol || 'XAUUSD',
          type: orderType,
          placedVolume: placed || 0,
          filledVolume: filled || 0,
          price,
          time: normalizeMt5Date(cols[0]),
          state: (state.includes('cancel') || (filled === 0 && placed > 0)) ? 'canceled' : 'filled',
          comment: cols[10] || '',
        });
      }
    }

    // 8. Results Section
    if (currentSection === 'results') {
      const row = cols.join(' ');
      if (row.includes('Total Net Profit') || row.includes('Lợi nhuận ròng')) {
        const val = cleanMt5Number(cols[cols.length - 1] || row.split(':').pop());
        if (val) results.totalNetProfit = val;
      }
      if (row.includes('Profit Factor')) {
        const val = cleanMt5Number(cols[cols.length - 1] || row.split(':').pop());
        if (val) results.profitFactor = val;
      }
      if (row.includes('Recovery Factor')) {
        const val = cleanMt5Number(cols[cols.length - 1] || row.split(':').pop());
        if (val) results.recoveryFactor = val;
      }
      if (row.includes('Sharpe Ratio')) {
        const val = cleanMt5Number(cols[cols.length - 1] || row.split(':').pop());
        if (val) results.sharpeRatio = val;
      }
    }
  }

  // FALLBACK: If NO positions were found in 'Positions' section, but raw deals exist:
  if (trades.length === 0 && allRawDeals.length > 0) {
    const dealsByPos = new Map<string, RawDeal[]>();
    allRawDeals.forEach(d => {
      const key = d.posId || d.dealId;
      if (!dealsByPos.has(key)) dealsByPos.set(key, []);
      dealsByPos.get(key)!.push(d);
    });

    dealsByPos.forEach((dList, posId) => {
      const dIn = dList.find(d => d.direction === 'in') || dList[0];
      const dOut = dList.find(d => d.direction === 'out') || dList[dList.length - 1];

      if (dIn && dOut && dList.length >= 2) {
        let reason: CloseReason = 'Đóng tay';
        if (dOut.comment.includes('sl') || dOut.comment.includes('[sl]')) reason = 'Chạm SL';
        else if (dOut.comment.includes('tp') || dOut.comment.includes('[tp]')) reason = 'Chạm TP';

        const netPl = Math.round((dOut.profit + dOut.commission + dIn.commission + dOut.swap) * 100) / 100;
        trades.push({
          id: posId,
          s: (dIn.type === 'buy' ? 'buy' : 'sell'),
          v: dIn.volume,
          o: dIn.time,
          c: dOut.time,
          op: dIn.price,
          cp: dOut.price,
          sl: null,
          tp: null,
          pl: netPl,
          profit: dOut.profit,
          commission: dOut.commission + dIn.commission,
          swap: dOut.swap,
          r: reason,
          b: 0,
          symbol: dIn.symbol || 'XAUUSD',
        });
      }
    });
  }

  // Assign baskets
  const finalTrades = assignBaskets(trades);

  return {
    account,
    trades: finalTrades,
    cash,
    bal,
    results,
    pendingOrders,
  };
}

/**
 * Main MT5 CSV / TSV / HTML Parser
 */
export function parseMt5Csv(rawText: string): AccountReportData {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Nội dung file rỗng. Vui lòng chọn file báo cáo MT5 hợp lệ.');
  }

  const isHtml = rawText.includes('<table') || rawText.includes('<tr') || rawText.includes('</td>');
  const rows: string[][] = isHtml
    ? extractRowsFromHtml(rawText)
    : rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0).map(splitCsvRow);

  return parseMt5Rows(rows);
}

/**
 * Main MT5 Excel (.xlsx, .xls) / XML Spreadsheet Parser
 */
export function parseMt5Excel(data: ArrayBuffer | Uint8Array): AccountReportData {
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true,
  });

  const allRows: string[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const sheetData = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy.mm.dd hh:mm:ss',
      defval: '',
    });

    if (sheetData && sheetData.length > 0) {
      for (const row of sheetData) {
        if (!row || row.length === 0) continue;
        const strRow = row.map(cell => (cell !== null && cell !== undefined ? String(cell).trim() : ''));
        if (strRow.some(c => c.length > 0)) {
          allRows.push(strRow);
        }
      }
    }
  }

  if (allRows.length === 0) {
    throw new Error('File Excel không có dữ liệu bảng tính.');
  }

  return parseMt5Rows(allRows);
}
