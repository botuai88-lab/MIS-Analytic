import React from 'react';
import {
  TrendingUp,
  Moon,
  Sun,
  UploadCloud,
  Layers,
  ChevronDown,
  RefreshCw,
  Clock,
  ShieldAlert,
  Calendar,
  BarChart3,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { AccountReportData } from '../types/trading';
import {
  LogOut,
  Trash2,
} from 'lucide-react';

interface NavbarProps {
  currentAccount: AccountReportData;
  allAccounts: AccountReportData[];
  onSelectAccount: (acc: AccountReportData) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenImportModal: () => void;
  timezoneOffset: number;
  onChangeTimezone: (offset: number) => void;
  activeSection: string;
  onSignOut: () => void;
  onClearAllData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentAccount,
  allAccounts,
  onSelectAccount,
  isDarkMode,
  onToggleTheme,
  onOpenImportModal,
  timezoneOffset,
  onChangeTimezone,
  activeSection,
  onSignOut,
  onClearAllData,
}) => {
  const [accountDropdownOpen, setAccountDropdownOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { id: 'tong-quan', label: 'Tổng quan', icon: TrendingUp },
    { id: 'nhan-xet', label: 'Nhận xét', icon: Layers },
    { id: 'lich', label: 'Lịch P&L', icon: Calendar },
    { id: 'thong-ke', label: 'Thống kê', icon: BarChart3 },
    { id: 'rui-ro', label: 'Rủi ro & Vị thế', icon: ShieldAlert },
    { id: 'lich-su', label: 'Nhật ký lệnh', icon: BookOpen },
  ];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const topOffset = 70;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--surface)]/95 border-b border-[var(--line)] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Title (No Logo) */}
          <div className="flex items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-[var(--ink)]">MIS ANALYTICS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[var(--gold)]/20 text-[var(--gold)]">
                  PRO V1.0
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-none mt-0.5">Trading & Risk Journal</p>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--sunk)] text-[var(--ink)] font-semibold border-b-2 border-[var(--brand)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--sunk)]/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Account Switcher */}
            <div className="relative">
              <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--sunk)] hover:bg-[var(--line)]/50 transition-colors text-xs text-[var(--ink)]"
                title="Chuyển đổi tài khoản"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    currentAccount.trades.length > 0 ? 'bg-[var(--win)] animate-pulse' : 'bg-[var(--muted)]'
                  }`}
                />
                <span className="font-semibold">
                  {currentAccount.trades.length > 0
                    ? currentAccount.account.name || 'Tài khoản'
                    : 'Chưa có tài khoản'}
                </span>
                {currentAccount.trades.length > 0 && (
                  <span className="text-[var(--muted)] hidden sm:inline">({currentAccount.account.login})</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
              </button>

              {accountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-xl p-2 z-50">
                  <div className="px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase border-b border-[var(--line)] mb-1">
                    Danh sách Tài khoản ({allAccounts.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {allAccounts.map((acc, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectAccount(acc);
                          setAccountDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          acc.account.login === currentAccount.account.login
                            ? 'bg-[var(--brand)]/10 text-[var(--brand)] font-semibold'
                            : 'hover:bg-[var(--sunk)] text-[var(--ink)]'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{acc.account.name}</div>
                          <div className="text-[10px] text-[var(--muted)]">{acc.account.login} • {acc.account.server}</div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sunk)] text-[var(--muted)]">
                          {acc.trades.length} lệnh
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[var(--line)] mt-1 space-y-1">
                    <button
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        onOpenImportModal();
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-[var(--brand)] text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Thêm / Nạp tài khoản mới</span>
                    </button>

                    {currentAccount.trades.length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            onClearAllData();
                          }}
                          className="w-full py-1.5 px-3 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          title="Xoá hết dữ liệu để import mới"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xoá hết dữ liệu để import mới</span>
                        </button>

                        <button
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            onSignOut();
                          }}
                          className="w-full py-1.5 px-3 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          title="Đăng xuất tài khoản hiện tại"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Đăng xuất tài khoản</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timezone Config Dropdown */}
            <div className="hidden md:flex items-center text-xs text-[var(--muted)] border border-[var(--line)] rounded-lg px-2 py-1 bg-[var(--surface)]">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <select
                aria-label="Cấu hình múi giờ hiển thị"
                value={timezoneOffset}
                onChange={(e) => onChangeTimezone(Number(e.target.value))}
                className="bg-transparent text-[var(--ink)] text-xs focus:outline-none cursor-pointer"
              >
                <option value={7}>UTC+7 (VN)</option>
                <option value={0}>UTC+0 (MT5)</option>
                <option value={2}>UTC+2 (EET)</option>
                <option value={3}>UTC+3 (EEST)</option>
              </select>
            </div>

            {/* Import / Sync Button */}
            <button
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nạp / Đồng bộ</span>
            </button>

            {/* Quick Sign Out button if account has data */}
            {currentAccount.trades.length > 0 && (
              <button
                onClick={onSignOut}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 text-xs font-semibold transition-colors"
                title="Đăng xuất tài khoản"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg border border-[var(--line)] hover:bg-[var(--sunk)] text-[var(--ink)] transition-colors"
              title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
              aria-label="Đổi giao diện sáng/tối"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[var(--gold)]" /> : <Moon className="w-4 h-4 text-[var(--muted)]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar menu */}
      <div className="lg:hidden border-t border-[var(--line)] bg-[var(--surface)] px-4 py-2 overflow-x-auto flex items-center gap-2 scrollbar-none">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = activeSection === link.id;
          return (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[var(--ink)] text-[var(--bg)] font-semibold'
                  : 'bg-[var(--sunk)] text-[var(--muted)]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
