import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMt5Number, parseMt5Timestamp, assignBaskets, mergeReportData, parseMt5Csv } from './mt5Parser';
import {
  computePerformanceMetrics,
  extractBaskets,
  computeExposureAndStopOut,
  generateRuleBasedInsights,
} from './analyticsEngine';
import { SAMPLE_REPORT_DATA } from '../data/sampleReport';

test('cleanMt5Number handles space separators and signs accurately', () => {
  assert.equal(cleanMt5Number('4 186.118'), 4186.118);
  assert.equal(cleanMt5Number('- 10.35'), -10.35);
  assert.equal(cleanMt5Number('1 335.83'), 1335.83);
  assert.equal(cleanMt5Number('0.01'), 0.01);
  assert.equal(cleanMt5Number(''), 0);
  assert.equal(cleanMt5Number(undefined), 0);
});

test('SAMPLE_REPORT_DATA matches all Acceptance Criteria (PRD Section 07)', () => {
  const data = SAMPLE_REPORT_DATA;

  // 1. Exactly 154 trades
  assert.equal(data.trades.length, 154, 'Should have exactly 154 trades');

  // 2. 117 wins / 37 losses
  const wins = data.trades.filter(t => t.pl > 0);
  const losses = data.trades.filter(t => t.pl <= 0);
  assert.equal(wins.length, 117, 'Should have 117 winning trades');
  assert.equal(losses.length, 37, 'Should have 37 losing trades');

  // 3. Net profit +$933.43
  const totalNetPl = Math.round(data.trades.reduce((acc, t) => acc + t.pl, 0) * 100) / 100;
  assert.equal(totalNetPl, 933.43, 'Total Net Profit should equal +933.43');

  // 4. Profit factor 3.32
  const grossWin = Math.round(wins.reduce((acc, t) => acc + t.pl, 0) * 100) / 100;
  const grossLoss = Math.round(losses.reduce((acc, t) => acc + Math.abs(t.pl), 0) * 100) / 100;
  const pf = Math.round((grossWin / grossLoss) * 100) / 100;
  assert.equal(pf, 3.32, 'Profit Factor should be 3.32');

  // 5. 18 cashflow transactions (5 deposits, 13 withdrawals)
  assert.equal(data.cash.length, 18, 'Should have 18 cashflow records');
  const deposits = data.cash.filter(c => c.k === 'Nạp');
  const withdrawals = data.cash.filter(c => c.k === 'Rút');
  assert.equal(deposits.length, 5, 'Should have 5 deposits');
  assert.equal(withdrawals.length, 13, 'Should have 13 withdrawals');

  const totalDep = Math.round(deposits.reduce((acc, c) => acc + c.a, 0) * 100) / 100;
  const totalWith = Math.round(withdrawals.reduce((acc, c) => acc + Math.abs(c.a), 0) * 100) / 100;
  assert.equal(totalDep, 4271.46, 'Total deposits should be 4271.46');
  assert.equal(totalWith, 4698.00, 'Total withdrawals should be 4698.00');

  // 6. Basket detection: 13 sell orders cluster on 2026.10.12 05:32:06
  const baskets = extractBaskets(data.trades);
  const targetBasket = baskets.find(b => b.lastCloseTime === '2026.10.12 05:32:06');
  assert.ok(targetBasket, 'Must find 13-sell basket closed on 2026.10.12 05:32:06');
  assert.equal(targetBasket.count, 13, 'Basket should contain 13 trades');
  assert.equal(targetBasket.side, 'sell', 'Basket side should be sell');
  assert.equal(targetBasket.totalLots, 0.13, 'Total basket lots should be 0.13');
  assert.equal(targetBasket.netPl, 17.75, 'Basket net P&L should be +17.75');
});

test('computePerformanceMetrics calculates KPIs correctly', () => {
  const metrics = computePerformanceMetrics(SAMPLE_REPORT_DATA.trades, SAMPLE_REPORT_DATA.results);
  assert.equal(metrics.totalTrades, 154);
  assert.equal(metrics.winRate, 75.97);
  assert.equal(metrics.netProfit, 933.43);
  assert.equal(metrics.profitFactor, 3.32);
  assert.ok(metrics.expectancy > 6.0, 'Expectancy should be > 6.0 $/trade');
  assert.ok(metrics.breakevenWinRate > 0 && metrics.breakevenWinRate < 100);
});

test('generateRuleBasedInsights generates 8 distinct actionable cards', () => {
  const metrics = computePerformanceMetrics(SAMPLE_REPORT_DATA.trades, SAMPLE_REPORT_DATA.results);
  const baskets = extractBaskets(SAMPLE_REPORT_DATA.trades);
  const exposure = computeExposureAndStopOut(SAMPLE_REPORT_DATA.trades, SAMPLE_REPORT_DATA.cash);
  const insights = generateRuleBasedInsights(
    SAMPLE_REPORT_DATA.trades,
    metrics,
    exposure,
    baskets,
    SAMPLE_REPORT_DATA.cash
  );

  assert.equal(insights.length, 8, 'Should produce 8 rule-based insights');
  assert.ok(insights.some(i => i.tag === 'good'), 'Should have at least one good tag');
  assert.ok(insights.some(i => i.tag === 'risk'), 'Should have at least one risk tag');
  assert.ok(insights.some(i => i.tag === 'info'), 'Should have at least one info tag');
});

test('mergeReportData deduplicates properly without multiplying records', () => {
  const initial = SAMPLE_REPORT_DATA;
  const merged = mergeReportData(initial, initial);
  assert.equal(merged.trades.length, initial.trades.length, 'Duplicate import should not duplicate trades');
  assert.equal(merged.cash.length, initial.cash.length, 'Duplicate import should not duplicate cashflows');
});

test('timeFilter filters by week, month, and custom range correctly', async () => {
  const { filterTradesByTimeframe, getAvailableMonths, getAvailableWeeks } = await import('./timeFilter');
  const allTrades = SAMPLE_REPORT_DATA.trades;

  // 1. Available months
  const months = getAvailableMonths(allTrades);
  assert.ok(months.length >= 2, 'Should detect at least 2 distinct months (09 and 10)');
  assert.ok(months.some(m => m.key === '2026-10'));
  assert.ok(months.some(m => m.key === '2026-09'));

  // 2. Filter by month 2026-10
  const octTrades = filterTradesByTimeframe(allTrades, {
    type: 'specific_month',
    selectedMonth: '2026-10',
  });
  assert.ok(octTrades.length > 0 && octTrades.length < allTrades.length);
  assert.ok(octTrades.every(t => t.c.startsWith('2026.10')));

  // 3. Available weeks
  const weeks = getAvailableWeeks(allTrades);
  assert.ok(weeks.length >= 4, 'Should detect several weeks in dataset');

  // 4. Filter by specific week
  const weekTrades = filterTradesByTimeframe(allTrades, {
    type: 'specific_week',
    selectedWeek: weeks[0].key,
  });
  assert.equal(weekTrades.length, weeks[0].count);

  // 5. Filter by custom date range
  const customTrades = filterTradesByTimeframe(allTrades, {
    type: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  });
  assert.ok(customTrades.length > 0);
  assert.ok(customTrades.every(t => {
    const d = t.c.split(' ')[0].replace(/\./g, '-');
    return d >= '2026-10-01' && d <= '2026-10-15';
  }));
});

test('parseMt5Csv isolates withdrawals and never treats them as trade losses', () => {
  const sampleReportText = `
Name: John Doe
Account: 12345678
Server: MetaQuotes-Demo
Positions
Time, Position, Symbol, Type, Volume, Price, S/L, T/P, Time, Price, Commission, Swap, Profit
2026.10.15 10:00:00, 101, XAUUSD, buy, 0.01, 2650.00, 2640.00, 2660.00, 2026.10.15 11:00:00, 2655.00, 0.00, 0.00, 5.00
2026.10.15 12:00:00, 102, XAUUSD, sell, 0.02, 2660.00, 2670.00, 2650.00, 2026.10.15 13:00:00, 2655.00, 0.00, 0.00, 10.00
Deals
Time, Deal, Symbol, Type, Direction, Volume, Price, Order, Commission, Fee, Swap, Profit, Balance, Comment
2026.10.15 09:00:00, 1, , balance, , 0.00, 0.00, 0, 0.00, 0.00, 0.00, 500.00, 500.00, Deposit
2026.10.15 14:00:00, 2, , balance, , 0.00, 0.00, 0, 0.00, 0.00, 0.00, -300.00, 215.00, Withdrawal to Bank
`;

  const parsed = parseMt5Csv(sampleReportText);

  // Exactly 2 trading positions
  assert.equal(parsed.trades.length, 2, 'Should only have 2 trading positions');
  // Net P&L = 5.00 + 10.00 = +15.00 (NOT reduced by the -300 withdrawal!)
  const netPl = Math.round(parsed.trades.reduce((acc, t) => acc + t.pl, 0) * 100) / 100;
  assert.equal(netPl, 15.00, 'Net P&L should be strictly +15.00, independent of withdrawals');

  // Cashflow contains deposit and withdrawal
  assert.equal(parsed.cash.length, 2);
  const withdrawal = parsed.cash.find(c => c.k === 'Rút');
  assert.ok(withdrawal);
  assert.equal(withdrawal.a, -300.00);
});

test('parseMt5Csv parses HTML report and pairs Deals IN/OUT if Positions missing', () => {
  const htmlSample = `
<html>
<body>
<table>
<tr><th>Time</th><th>Deal</th><th>Symbol</th><th>Type</th><th>Direction</th><th>Volume</th><th>Price</th><th>Order</th><th>Commission</th><th>Fee</th><th>Swap</th><th>Profit</th><th>Balance</th><th>Comment</th></tr>
<tr><td>2026.10.16 08:00:00</td><td>501</td><td>XAUUSD</td><td>buy</td><td>in</td><td>0.05</td><td>2640.00</td><td>99901</td><td>-0.50</td><td>0</td><td>0</td><td>0.00</td><td>1000.00</td><td></td></tr>
<tr><td>2026.10.16 09:30:00</td><td>502</td><td>XAUUSD</td><td>buy</td><td>out</td><td>0.05</td><td>2645.00</td><td>99901</td><td>-0.50</td><td>0</td><td>0</td><td>25.00</td><td>1024.00</td><td>[tp]</td></tr>
<tr><td>2026.10.16 10:00:00</td><td>503</td><td></td><td>balance</td><td></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>-200.00</td><td>824.00</td><td>Withdrawal</td></tr>
</table>
</body>
</html>
`;

  const parsed = parseMt5Csv(htmlSample);
  assert.equal(parsed.trades.length, 1, 'Should pair Deals IN & OUT into 1 position');
  const t = parsed.trades[0];
  assert.equal(t.id, '99901');
  assert.equal(t.s, 'buy');
  assert.equal(t.v, 0.05);
  assert.equal(t.op, 2640.00);
  assert.equal(t.cp, 2645.00);
  assert.equal(t.r, 'Chạm TP');
  assert.equal(t.pl, 24.00); // 25 profit - 1.00 comm = 24.00

  // Withdrawal is in cash, not in trades
  assert.equal(parsed.cash.length, 1);
  assert.equal(parsed.cash[0].a, -200.00);
});

test('parseMt5Csv parses tab-delimited paste with multiple withdrawals and deposits', () => {
  const tsvData = [
    'Time\tPosition\tSymbol\tType\tVolume\tPrice\tS/L\tT/P\tTime\tPrice\tCommission\tSwap\tProfit',
    '2026.10.20 10:00:00\t1001\tXAUUSD\tbuy\t0.10\t2700.00\t2690.00\t2720.00\t2026.10.20 11:00:00\t2710.00\t-1.00\t0.00\t100.00',
    '2026.10.20 12:00:00\t1002\tXAUUSD\tsell\t0.10\t2710.00\t2720.00\t2700.00\t2026.10.20 13:00:00\t2705.00\t-1.00\t0.00\t50.00',
    'Deals',
    'Time\tDeal\tSymbol\tType\tDirection\tVolume\tPrice\tOrder\tCommission\tFee\tSwap\tProfit\tBalance\tComment',
    '2026.10.20 09:00:00\t1\t\tbalance\t\t0.00\t0.00\t0\t0.00\t0.00\t0.00\t1 000.00\t1 000.00\tDeposit',
    '2026.10.20 14:00:00\t2\t\tbalance\t\t0.00\t0.00\t0\t0.00\t0.00\t0.00\t- 500.00\t648.00\tWithdrawal',
    '2026.10.20 15:00:00\t3\t\tbalance\t\t0.00\t0.00\t0\t0.00\t0.00\t0.00\t- 100.00\t548.00\tRút tiền về ngân hàng',
  ].join('\n');

  const parsed = parseMt5Csv(tsvData);
  assert.equal(parsed.trades.length, 2, 'Must have exactly 2 positions');
  // Trade 1 net pl = 100 - 1 = 99.00
  // Trade 2 net pl = 50 - 1 = 49.00
  // Total Trading Net P&L = 148.00 (NOT impacted by -600.00 withdrawals!)
  const netPl = Math.round(parsed.trades.reduce((sum, t) => sum + t.pl, 0) * 100) / 100;
  assert.equal(netPl, 148.00);

  // Cashflow: 1 deposit (+1000), 2 withdrawals (-500, -100)
  assert.equal(parsed.cash.length, 3);
  const withdrawals = parsed.cash.filter(c => c.k === 'Rút');
  assert.equal(withdrawals.length, 2);
  const totalWithdrawn = Math.round(withdrawals.reduce((sum, c) => sum + Math.abs(c.a), 0) * 100) / 100;
  assert.equal(totalWithdrawn, 600.00);
});



test('parseMt5Excel accurately parses MT5 Excel export (.xlsx buffer)', async () => {
  const XLSX = await import('xlsx');
  const { parseMt5Excel } = await import('./mt5Parser');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name: Exness Pro Trader'],
    ['Account: 77889900'],
    ['Server: Exness-Real18'],
    ['Positions'],
    ['Time', 'Position', 'Symbol', 'Type', 'Volume', 'Price', 'S/L', 'T/P', 'Time', 'Price', 'Commission', 'Swap', 'Profit'],
    ['2026.10.18 10:00:00', '10001', 'XAUUSD', 'buy', '0.05', '2700.00', '2690.00', '2720.00', '2026.10.18 11:00:00', '2715.00', '-0.50', '0.00', '75.00'],
    ['2026.10.18 12:00:00', '10002', 'XAUUSD', 'sell', '0.10', '2720.00', '2730.00', '2710.00', '2026.10.18 13:00:00', '2710.00', '-1.00', '0.00', '100.00'],
    ['Deals'],
    ['Time', 'Deal', 'Symbol', 'Type', 'Direction', 'Volume', 'Price', 'Order', 'Commission', 'Fee', 'Swap', 'Profit', 'Balance', 'Comment'],
    ['2026.10.18 09:00:00', '1', '', 'balance', '', '0', '0', '0', '0', '0', '0', '1000.00', '1000.00', 'Deposit'],
    ['2026.10.18 14:00:00', '2', '', 'balance', '', '0', '0', '0', '0', '0', '0', '-500.00', '673.50', 'Withdrawal to Bank'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const parsed = parseMt5Excel(buffer);
  assert.equal(parsed.account.name, 'Exness Pro Trader');
  assert.equal(parsed.account.login, '77889900');
  assert.equal(parsed.account.server, 'Exness-Real18');
  assert.equal(parsed.trades.length, 2, 'Should extract 2 trades from Excel');
  assert.equal(parsed.trades[0].id, '10001');
  assert.equal(parsed.trades[0].pl, 74.50); // 75.00 - 0.50
  assert.equal(parsed.trades[1].pl, 99.00); // 100.00 - 1.00
  assert.equal(parsed.cash.length, 2, 'Should extract 2 cashflow items (deposit & withdrawal)');
  assert.equal(parsed.cash[0].k, 'Nạp');
  assert.equal(parsed.cash[1].k, 'Rút');
  assert.equal(parsed.cash[1].a, -500.00);
});

test('parseMt5Excel handles flat Exness trade export table in Excel', async () => {
  const XLSX = await import('xlsx');
  const { parseMt5Excel } = await import('./mt5Parser');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Ticket', 'Open Time', 'Type', 'Volume', 'Symbol', 'Open Price', 'S / L', 'T / P', 'Close Time', 'Close Price', 'Commission', 'Swap', 'Profit', 'Comment'],
    ['991201', '2026.10.22 08:30:00', 'sell', '0.05', 'XAUUSD', '2725.50', '2735.00', '2705.00', '2026.10.22 09:45:00', '2710.00', '-0.50', '0.00', '77.50', 'manual'],
    ['991202', '2026.10.22 10:00:00', 'buy', '0.05', 'XAUUSD', '2712.00', '2700.00', '2730.00', '2026.10.22 11:15:00', '2720.00', '-0.50', '0.00', '40.00', '[tp]'],
    ['991203', '2026.10.22 12:00:00', 'balance', '0', '', '0', '0', '0', '2026.10.22 12:00:00', '0', '0', '0', '-100.00', 'Withdrawal'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'History');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const parsed = parseMt5Excel(buffer);
  assert.equal(parsed.trades.length, 2, 'Should extract 2 trades from flat Exness table');
  assert.equal(parsed.trades[0].id, '991201');
  assert.equal(parsed.trades[0].s, 'sell');
  assert.equal(parsed.trades[0].pl, 77.00); // 77.50 - 0.50
  assert.equal(parsed.trades[1].r, 'Chạm TP');
  assert.equal(parsed.cash.length, 1, 'Withdrawal should be in cashflow');
  assert.equal(parsed.cash[0].a, -100.00);
});
