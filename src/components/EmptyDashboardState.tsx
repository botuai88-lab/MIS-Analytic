import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Key,
  Server,
  User,
  Calendar,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AccountReportData } from '../types/trading';
import { parseMt5Csv, parseMt5Excel } from '../utils/mt5Parser';
import { SAMPLE_REPORT_DATA } from '../data/sampleReport';

interface EmptyDashboardStateProps {
  onImportData: (data: AccountReportData) => void;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({ onImportData }) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'paste' | 'passview'>('excel');
  const [fileName, setFileName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [status, setStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // Passview state
  const [passviewLogin, setPassviewLogin] = useState('');
  const [passviewServer, setPassviewServer] = useState('Exness-Real');
  const [passviewPastedData, setPassviewPastedData] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus(null);

    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type.includes('sheet') ||
      file.type.includes('excel');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = parseMt5Excel(buffer);
          if (parsed.trades.length === 0 && parsed.cash.length === 0) {
            setStatus({
              success: false,
              msg: 'File Excel không có vị thế giao dịch (Positions) hoặc khớp lệnh (Deals). Vui lòng kiểm tra lại cấu trúc file xuất từ MT5 hoặc Exness.',
            });
          } else {
            setStatus({
              success: true,
              msg: `Đã đọc thành công ${parsed.trades.length} lệnh và ${parsed.cash.length} giao dịch nạp/rút từ file Excel ${file.name}!`,
            });
            setTimeout(() => {
              onImportData(parsed);
            }, 600);
          }
        } catch (err: any) {
          setStatus({ success: false, msg: `Lỗi đọc file Excel: ${err.message}` });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          let parsed: AccountReportData;
          try {
            parsed = parseMt5Csv(text);
          } catch {
            const encoder = new TextEncoder();
            parsed = parseMt5Excel(encoder.encode(text));
          }

          if (parsed.trades.length === 0 && parsed.cash.length === 0) {
            setStatus({
              success: false,
              msg: 'File không có vị thế giao dịch (Positions) hoặc khớp lệnh (Deals). Vui lòng chọn file báo cáo MT5 chuẩn.',
            });
          } else {
            setStatus({
              success: true,
              msg: `Đã đọc thành công ${parsed.trades.length} lệnh và ${parsed.cash.length} giao dịch nạp/rút từ file ${file.name}!`,
            });
            setTimeout(() => {
              onImportData(parsed);
            }, 600);
          }
        } catch (err: any) {
          setStatus({ success: false, msg: `Lỗi đọc file: ${err.message}` });
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePastedSubmit = () => {
    if (!pastedText.trim()) {
      setStatus({ success: false, msg: 'Vui lòng dán nội dung báo cáo MT5 vào ô bên dưới.' });
      return;
    }

    try {
      const parsed = parseMt5Csv(pastedText);
      if (parsed.trades.length === 0 && parsed.cash.length === 0) {
        setStatus({
          success: false,
          msg: 'Không nhận diện được vị thế giao dịch. Hãy copy toàn bộ bảng lịch sử từ MT5 (Ctrl+A & Ctrl+C) và dán lại.',
        });
        return;
      }
      setStatus({
        success: true,
        msg: `Nhận diện chính xác ${parsed.trades.length} lệnh và ${parsed.cash.length} khoản nạp/rút! Tiền rút được phân lập riêng.`,
      });
      setTimeout(() => {
        onImportData(parsed);
      }, 600);
    } catch (err: any) {
      setStatus({ success: false, msg: `Lỗi phân tích: ${err.message}` });
    }
  };

  const handlePassviewSubmit = () => {
    if (!passviewPastedData.trim()) {
      setStatus({ success: false, msg: 'Vui lòng dán danh sách lệnh hoặc copy từ tab History vào ô bên dưới.' });
      return;
    }

    try {
      const parsed = parseMt5Csv(passviewPastedData);
      if (parsed.trades.length === 0 && parsed.cash.length === 0) {
        setStatus({
          success: false,
          msg: 'Không trích xuất được lệnh giao dịch. Vui lòng xuất báo cáo hoặc copy toàn bộ bảng lịch sử lệnh.',
        });
        return;
      }

      if (passviewLogin.trim()) {
        parsed.account.login = passviewLogin.trim();
      }
      if (passviewServer.trim()) {
        parsed.account.server = passviewServer.trim();
      }

      setStatus({
        success: true,
        msg: `Đồng bộ thành công ${parsed.trades.length} lệnh của tài khoản ${parsed.account.login || 'Exness'}!`,
      });
      setTimeout(() => {
        onImportData(parsed);
      }, 600);
    } catch (err: any) {
      setStatus({ success: false, msg: `Lỗi phân tích: ${err.message}` });
    }
  };

  const handleLoadSample = () => {
    onImportData(SAMPLE_REPORT_DATA);
  };

  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Sẵn Sàng Nhập Dữ Liệu
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--ink)] tracking-tight">
          Nạp Dữ Liệu Báo Cáo MT5 / Exness
        </h1>
        <p className="text-sm text-[var(--muted)] max-w-xl mx-auto">
          Hỗ trợ kéo thả trực tiếp file Excel (.xlsx, .xls), CSV, HTML hoặc sao chép nhanh từ lịch sử lệnh mà không cần cài đặt Python.
        </p>
      </div>

      {/* Main Import Card */}
      <div className="bg-[var(--surface)] rounded-3xl border border-[var(--line)] shadow-xl p-6 sm:p-8 space-y-6">
        {/* Tab Controls */}
        <div className="flex rounded-xl bg-[var(--sunk)] p-1 text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('excel');
              setStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'excel'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Nạp File Excel / CSV / HTML</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('paste');
              setStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'paste'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-[var(--brand)]" />
            <span>Dán Báo Cáo (Copy/Paste)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('passview');
              setStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'passview'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Key className="w-4 h-4 text-[var(--gold)]" />
            <span>Passview Exness (0 Cài Đặt)</span>
          </button>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
              status.success
                ? 'bg-[var(--win)]/10 text-[var(--win)] border-[var(--win)]/30'
                : 'bg-[var(--loss)]/10 text-[var(--loss)] border-[var(--loss)]/30'
            }`}
          >
            {status.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{status.msg}</span>
          </div>
        )}

        {/* Tab 1: Excel & CSV File Upload */}
        {activeTab === 'excel' && (
          <div className="space-y-5">
            <div className="border-2 border-dashed border-[var(--line)] hover:border-[var(--brand)] rounded-2xl p-8 sm:p-12 text-center transition-all bg-[var(--sunk)]/20 relative cursor-pointer group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.htm,.html,.xml"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[var(--ink)]">
                Kéo thả file Excel (.xlsx, .xls) hoặc CSV / HTML báo cáo MT5 vào đây
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 max-w-md mx-auto">
                Hỗ trợ trực tiếp file Excel xuất từ MT5 hoặc Exness. Tự động phân lập rút tiền, gom cụm rải lệnh và phân tích hiệu suất thực chiến.
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold shadow-xs">
                  Chọn file Excel / CSV từ máy tính
                </span>
              </div>

              {fileName && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
              <span className="text-[var(--muted)]">
                Chưa có sẵn file? Bạn có thể nạp thử bộ dữ liệu chuẩn mẫu:
              </span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2 rounded-xl border border-[var(--gold)]/40 hover:bg-[var(--gold)]/10 text-[var(--gold)] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp Dữ Liệu Mẫu (154 lệnh)</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Direct Paste (Copy/Paste) */}
        {activeTab === 'paste' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-2">
                <ClipboardPaste className="w-4 h-4 text-[var(--brand)]" />
                Dán bảng lịch sử giao dịch MT5 vào đây:
              </label>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Mẹo nhanh nhất: Trong phần mềm MT5 -> Tab History -> Chuột phải chọn All History -> Nhấn Ctrl+A rồi Ctrl+C -> Bấm vào ô này và nhấn Ctrl+V..."
                className="w-full text-xs p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--sunk)]/40 text-[var(--ink)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>

            <div className="bg-[var(--sunk)]/60 rounded-xl p-3.5 text-xs text-[var(--muted)] space-y-1">
              <div className="flex items-center gap-1 font-semibold text-[var(--ink)]">
                <ShieldCheck className="w-4 h-4 text-[var(--win)]" />
                <span>Cam kết chính xác 100%:</span>
              </div>
              <p>
                Trình phân tích thông minh tự động trích xuất các cột Thời gian, Mã lệnh, Chiều Buy/Sell, Khối lượng, Lãi/Lỗ và nhận diện các khoản Nạp/Rút mà không bị lẫn lộn.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handlePastedSubmit}
                disabled={!pastedText.trim()}
                className={`px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-opacity ${
                  pastedText.trim() ? 'hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Phân Tích Dữ Liệu Đã Dán</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Passview Exness Zero-Install Solution */}
        {activeTab === 'passview' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Lấy Dữ Liệu Passview Exness 100% Chuẩn Xác • Không Cần Cài Đặt Python</span>
              </div>
              <p className="text-[var(--muted)] text-[11px] leading-relaxed">
                Máy chủ MT5 Exness sử dụng giao thức mạng bảo mật riêng, trình duyệt web sandbox không được phép kết nối socket trực tiếp. Bạn <strong>hoàn toàn không cần cài đặt Python</strong>, chỉ cần thực hiện 1 trong 2 cách nhanh gọn dưới đây:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--sunk)]/50 border border-[var(--line)] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Cách 1: Xuất Excel từ MT5 (5 giây)</span>
                </div>
                <ol className="text-[11px] text-[var(--muted)] space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Mở MT5 & đăng nhập bằng Passview + Server Exness.</li>
                  <li>Mục <strong>History</strong> &rarr; Chuột phải &rarr; <strong>Report &rarr; Open XML (Excel)</strong>.</li>
                  <li>Kéo thả file Excel vào ứng dụng.</li>
                </ol>
                <button
                  type="button"
                  onClick={() => setActiveTab('excel')}
                  className="w-full mt-1 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--sunk)] border border-[var(--line)] font-semibold text-[11px] text-[var(--ink)] flex items-center justify-center gap-1"
                >
                  <span>Chuyển sang Kéo thả Excel</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--sunk)]/50 border border-[var(--line)] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                  <ExternalLink className="w-4 h-4 text-[var(--gold)]" />
                  <span>Cách 2: Exness WebTerminal</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Mở WebTerminal chính thức của Exness ngay trên trình duyệt, đăng nhập Passview &rarr; copy bảng lịch sử lệnh (Ctrl+A & Ctrl+C) dán vào đây.
                </p>
                <a
                  href="https://webterminal.exness.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full mt-1 py-1.5 rounded-lg bg-[var(--gold)] text-black font-bold text-[11px] flex items-center justify-center gap-1 hover:opacity-90"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Mở Exness WebTerminal</span>
                </a>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-[var(--ink)] block mb-1">
                    Số tài khoản Exness (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={passviewLogin}
                    onChange={(e) => setPassviewLogin(e.target.value)}
                    placeholder="VD: 429179132"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[var(--ink)] block mb-1">
                    Máy chủ sàn (Server):
                  </label>
                  <input
                    type="text"
                    value={passviewServer}
                    onChange={(e) => setPassviewServer(e.target.value)}
                    placeholder="VD: Exness-Real21"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink)] block mb-1">
                  Dán nội dung lịch sử lệnh sao chép vào đây:
                </label>
                <textarea
                  rows={4}
                  value={passviewPastedData}
                  onChange={(e) => setPassviewPastedData(e.target.value)}
                  placeholder="Dán dữ liệu sao chép từ MT5/Exness (Ctrl+A & Ctrl+C từ bảng History)..."
                  className="w-full text-xs p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>Không cần quyền đặt lệnh • Bảo mật 100%</span>
              </span>

              <button
                type="button"
                onClick={handlePassviewSubmit}
                disabled={!passviewPastedData.trim()}
                className={`px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold transition-opacity shadow-xs ${
                  passviewPastedData.trim() ? 'hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                Phân Tích Dữ Liệu Ngay
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[var(--ink)]">
            <TrendingUp className="w-4 h-4 text-[var(--gold)]" />
            <span>Pure Trading P&L</span>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            Phân lập 100% dòng tiền rút khỏi lãi/lỗ giao dịch, đảm bảo đồ thị và tỷ lệ winrate không bị méo mó.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[var(--ink)]">
            <ShieldAlert className="w-4 h-4 text-[var(--loss)]" />
            <span>Phát Hiện Cụm Nhồi (Grid)</span>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            Tự động gom nhóm lệnh cùng chiều đóng trong 60 giây và đo lường khoảng cách cháy (Stop-out Room).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[var(--win)]">
            <Calendar className="w-4 h-4 text-[var(--win)]" />
            <span>Lọc Tuần & Tháng Linh Hoạt</span>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            Xem hiệu suất theo từng tuần, từng tháng hoặc chọn khoảng ngày tùy chỉnh dễ dàng.
          </p>
        </div>
      </div>
    </div>
  );
};
