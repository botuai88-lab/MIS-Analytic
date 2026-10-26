/**
 * MIS ANALYTICS
 * Hệ thống Quản lý & Phân tích Hiệu suất Giao dịch (XAUUSD / Forex)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroOverview } from './components/HeroOverview';
import { InsightsSection } from './components/InsightsSection';
import { CalendarHeatmap } from './components/CalendarHeatmap';
import { PerformanceStats } from './components/PerformanceStats';
import { RiskManagement } from './components/RiskManagement';
import { TradeJournal } from './components/TradeJournal';
import { ImportAccountModal } from './components/ImportAccountModal';
import { TimeframeFilterBar } from './components/TimeframeFilterBar';
import { EmptyDashboardState } from './components/EmptyDashboardState';
import { AccountReportData, EMPTY_REPORT_DATA, Trade } from './types/trading';
import {
  computePerformanceMetrics,
  generateRuleBasedInsights,
  computeExposureAndStopOut,
  extractBaskets,
} from './utils/analyticsEngine';
import { TimeframeFilter, filterTradesByTimeframe } from './utils/timeFilter';

const STORAGE_KEY_ACCOUNTS = 'mt5_analytics_accounts_v2';
const STORAGE_KEY_ACTIVE_LOGIN = 'mt5_analytics_active_login_v2';
const STORAGE_KEY_THEME = 'mt5_analytics_theme_v2';
const STORAGE_KEY_TZ = 'mt5_analytics_timezone_v2';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved !== null ? saved === 'true' : true; // default dark mode for trading dashboard
  });

  // Timezone state
  const [timezoneOffset, setTimezoneOffset] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TZ);
    return saved !== null ? Number(saved) : 7; // default UTC+7 VN time
  });

  // Accounts state - starts with clean state (no preset mock data)
  const [accounts, setAccounts] = useState<AccountReportData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.trades) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved accounts:', e);
    }
    return [EMPTY_REPORT_DATA];
  });

  // Active account state
  const [currentAccount, setCurrentAccount] = useState<AccountReportData>(() => {
    const savedLogin = localStorage.getItem(STORAGE_KEY_ACTIVE_LOGIN);
    if (savedLogin) {
      const found = accounts.find((a) => String(a.account.login) === savedLogin);
      if (found) return found;
    }
    return accounts[0] || EMPTY_REPORT_DATA;
  });

  // Timeframe filter (Tuần, Tháng, Custom range)
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>({ type: 'all' });

  // Active navigation anchor tracking
  const [activeSection, setActiveSection] = useState<string>('tong-quan');

  // Interactive selected date for Calendar -> Journal link
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Sync theme to <html> tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, String(isDarkMode));
  }, [isDarkMode]);

  // Persist accounts
  useEffect(() => {
    try {
      if (accounts.length > 0 && accounts[0].trades.length > 0) {
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      }
    } catch (e) {
      console.warn('Failed to persist accounts in localStorage:', e);
    }
  }, [accounts]);

  // Persist active login
  useEffect(() => {
    if (currentAccount?.account?.login && currentAccount.account.login !== 'N/A') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_LOGIN, String(currentAccount.account.login));
    }
  }, [currentAccount]);

  // Persist timezone
  const handleTimezoneChange = (offset: number) => {
    setTimezoneOffset(offset);
    localStorage.setItem(STORAGE_KEY_TZ, String(offset));
  };

  // Scroll spy to highlight active section in Navbar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['tong-quan', 'nhan-xet', 'lich', 'thong-ke', 'rui-ro', 'lich-su'];
      const scrollPos = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const secId = sections[i];
        const el = document.getElementById(secId);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(secId);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter trades based on active timeframe (all, week, month, custom range)
  const filteredTrades = useMemo(() => {
    return filterTradesByTimeframe(currentAccount.trades, timeframeFilter);
  }, [currentAccount.trades, timeframeFilter]);

  // Active report data for the selected timeframe
  const activeReportData: AccountReportData = useMemo(() => {
    return {
      ...currentAccount,
      trades: filteredTrades,
    };
  }, [currentAccount, filteredTrades]);

  // Compute analytics for filtered trades
  const metrics = useMemo(() => {
    return computePerformanceMetrics(filteredTrades, currentAccount.results);
  }, [filteredTrades, currentAccount.results]);

  const baskets = useMemo(() => {
    return extractBaskets(filteredTrades);
  }, [filteredTrades]);

  const exposure = useMemo(() => {
    return computeExposureAndStopOut(filteredTrades, currentAccount.cash);
  }, [filteredTrades, currentAccount.cash]);

  const insights = useMemo(() => {
    return generateRuleBasedInsights(
      filteredTrades,
      metrics,
      exposure,
      baskets,
      currentAccount.cash,
      timezoneOffset
    );
  }, [filteredTrades, metrics, exposure, baskets, currentAccount.cash, timezoneOffset]);

  // Handle trade journal update (notes, tags, chart links)
  const handleUpdateTrade = (updatedTrade: Trade) => {
    const newTrades = currentAccount.trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
    const updatedAccount: AccountReportData = {
      ...currentAccount,
      trades: newTrades,
    };
    setCurrentAccount(updatedAccount);
    setAccounts((prev) =>
      prev.map((acc) => (acc.account.login === updatedAccount.account.login ? updatedAccount : acc))
    );
  };

  // Handle data import from modal or empty state
  const handleImportData = (incoming: AccountReportData) => {
    setAccounts((prev) => {
      const filtered = prev.filter((a) => a.account.login !== 'N/A');
      const existingIdx = filtered.findIndex((a) => a.account.login === incoming.account.login);
      if (existingIdx >= 0) {
        const next = [...filtered];
        next[existingIdx] = incoming;
        return next;
      }
      return [incoming, ...filtered];
    });
    setCurrentAccount(incoming);
    setTimeframeFilter({ type: 'all' });
    setSelectedDate(null);
  };

  // Sign out account handler
  const handleSignOut = () => {
    setAccounts([EMPTY_REPORT_DATA]);
    setCurrentAccount(EMPTY_REPORT_DATA);
    setTimeframeFilter({ type: 'all' });
    setSelectedDate(null);
    localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_LOGIN);
  };

  // Clear data handler (Clean Slate to import new)
  const handleClearData = () => {
    setAccounts([EMPTY_REPORT_DATA]);
    setCurrentAccount(EMPTY_REPORT_DATA);
    setTimeframeFilter({ type: 'all' });
    setSelectedDate(null);
    localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_LOGIN);
    setIsImportModalOpen(true);
  };

  const hasData = currentAccount.trades.length > 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col selection:bg-[var(--gold)]/30">
      {/* Sticky Top Navigation */}
      <Navbar
        currentAccount={currentAccount}
        allAccounts={accounts.filter((a) => a.trades.length > 0)}
        onSelectAccount={setCurrentAccount}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        timezoneOffset={timezoneOffset}
        onChangeTimezone={handleTimezoneChange}
        activeSection={activeSection}
        onSignOut={handleSignOut}
        onClearAllData={handleClearData}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-4">
        {!hasData ? (
          // Clean State View: Drag & Drop Import
          <EmptyDashboardState onImportData={handleImportData} />
        ) : (
          // Full Analytics Dashboard with Timeframe Filter Bar
          <>
            {/* Timeframe Filter Bar (Tuần, Tháng, Custom) */}
            <TimeframeFilterBar
              allTrades={currentAccount.trades}
              filteredTradesCount={filteredTrades.length}
              currentFilter={timeframeFilter}
              onChangeFilter={setTimeframeFilter}
              onClearData={handleClearData}
              onOpenImportModal={() => setIsImportModalOpen(true)}
            />

            {/* Module 1: Tổng quan (#tong-quan) */}
            <HeroOverview reportData={activeReportData} metrics={metrics} />

            {/* Module 2: Nhận xét Chính (#nhan-xet) */}
            <InsightsSection insights={insights} />

            {/* Module 3: Lịch P&L Heatmap (#lich) */}
            <CalendarHeatmap
              trades={filteredTrades}
              onSelectDate={(dStr) => setSelectedDate(dStr)}
              selectedDate={selectedDate}
            />

            {/* Module 4: Thống kê Hiệu suất (#thong-ke) */}
            <PerformanceStats
              trades={filteredTrades}
              metrics={metrics}
              timezoneOffset={timezoneOffset}
            />

            {/* Module 5: Rủi ro & Vị thế (#rui-ro) */}
            <RiskManagement reportData={activeReportData} metrics={metrics} />

            {/* Module 6: Nhật ký Lệnh & Chi tiết (#lich-su) */}
            <TradeJournal
              trades={filteredTrades}
              cash={currentAccount.cash}
              selectedDate={selectedDate}
              onClearDateFilter={() => setSelectedDate(null)}
              onUpdateTrade={handleUpdateTrade}
            />
          </>
        )}
      </main>

      {/* Account Import / Passview Sync Modal */}
      <ImportAccountModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportData={handleImportData}
        currentData={currentAccount}
        onClearData={handleClearData}
      />

      {/* Editorial Financial Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface)] py-6 text-xs text-[var(--muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--ink)]">MIS ANALYTICS</span>
            <span>•</span>
            <span>Hệ thống Quản lý & Phân tích Hiệu suất Giao dịch (XAUUSD / Forex)</span>
          </div>
          <div className="flex items-center gap-4">
            {hasData && (
              <>
                <span>Tài khoản: {currentAccount.account.name} ({currentAccount.account.login})</span>
                <span>•</span>
              </>
            )}
            <span>Phiên bản 1.0 Production</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
