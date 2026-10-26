import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Key,
  Server,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  Trash2,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AccountReportData } from '../types/trading';
import { parseMt5Csv, parseMt5Excel, mergeReportData } from '../utils/mt5Parser';
import { SAMPLE_REPORT_DATA } from '../data/sampleReport';

interface ImportAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportData: (data: AccountReportData) => void;
  currentData: AccountReportData;
  onClearData?: () => void;
}

export const ImportAccountModal: React.FC<ImportAccountModalProps> = ({
  isOpen,
  onClose,
  onImportData,
  currentData,
  onClearData,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'paste' | 'passview'>('excel');

  // File Upload State
  const [pendingParsedData, setPendingParsedData] = useState<AccountReportData | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // Passview Quick Form State
  const [passviewLogin, setPassviewLogin] = useState('');
  const [passviewServer, setPassviewServer] = useState('Exness-Real');
  const [passviewPastedData, setPassviewPastedData] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setImportStatus(null);
    setPendingParsedData(null);

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
            setImportStatus({
              success: false,
              msg: 'Đã đọc file Excel nhưng không tìm thấy vị thế (Positions) hoặc khớp lệnh (Deals). Vui lòng kiểm tra lại cấu trúc file xuất từ MT5 hoặc Exness.',
            });
          } else {
            setPendingParsedData(parsed);
            setImportStatus({
              success: true,
              msg: `Nhận diện chính xác từ file Excel: ${parsed.trades.length} lệnh giao dịch và ${parsed.cash.length} giao dịch nạp/rút!`,
            });
          }
        } catch (err: any) {
          setImportStatus({ success: false, msg: `Lỗi đọc file Excel: ${err.message}` });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          // Check if user uploaded an Excel file with .csv extension or XML
          let parsed: AccountReportData;
          try {
            parsed = parseMt5Csv(text);
          } catch {
            // fallback try parse as excel
            const encoder = new TextEncoder();
            parsed = parseMt5Excel(encoder.encode(text));
          }

          if (parsed.trades.length === 0 && parsed.cash.length === 0) {
            setImportStatus({
              success: false,
              msg: 'File không có vị thế giao dịch (Positions) hoặc khớp lệnh (Deals). Vui lòng kiểm tra file báo cáo MT5.',
            });
          } else {
            setPendingParsedData(parsed);
            setImportStatus({
              success: true,
              msg: `Nhận diện thành công ${parsed.trades.length} lệnh và ${parsed.cash.length} giao dịch nạp/rút! Tiền rút được phân lập riêng biệt.`,
            });
          }
        } catch (err: any) {
          setImportStatus({ success: false, msg: `Lỗi đọc file: ${err.message}` });
        }
      };
      reader.readAsText(file);
    }
  };

  const applyImportedData = (dataToImport: AccountReportData) => {
    // Deduplicate with current data if matching account login
    const merged =
      currentData.trades.length > 0 && dataToImport.account.login === currentData.account.login
        ? mergeReportData(currentData, dataToImport)
        : dataToImport;

    onImportData(merged);
    setImportStatus({
      success: true,
      msg: `Đã nạp thành công ${merged.trades.length} lệnh vào hệ thống phân tích!`,
    });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const executeFileImport = () => {
    if (pendingParsedData) {
      applyImportedData(pendingParsedData);
    }
  };

  const executePastedImport = () => {
    if (!pastedText.trim()) {
      setImportStatus({ success: false, msg: 'Nội dung dữ liệu rỗng. Vui lòng dán văn bản báo cáo MT5.' });
      return;
    }

    try {
      const parsed = parseMt5Csv(pastedText);
      if (parsed.trades.length === 0 && parsed.cash.length === 0) {
        setImportStatus({
          success: false,
          msg: 'Không trích xuất được lệnh giao dịch. Hãy mở MT5 -> Tab History -> Bấm Ctrl+A rồi Ctrl+C để copy toàn bộ bảng và dán lại.',
        });
        return;
      }
      applyImportedData(parsed);
    } catch (err: any) {
      setImportStatus({ success: false, msg: `Lỗi xử lý dữ liệu dán: ${err.message}` });
    }
  };

  const executePassviewHelperImport = () => {
    if (!passviewPastedData.trim() && !pendingParsedData) {
      setImportStatus({
        success: false,
        msg: 'Vui lòng dán danh sách lệnh hoặc kéo thả file Excel từ MT5/Exness vào ô bên dưới.',
      });
      return;
    }

    try {
      let parsed = pendingParsedData;
      if (!parsed && passviewPastedData.trim()) {
        parsed = parseMt5Csv(passviewPastedData);
      }

      if (!parsed || (parsed.trades.length === 0 && parsed.cash.length === 0)) {
        setImportStatus({
          success: false,
          msg: 'Không trích xuất được lệnh giao dịch. Vui lòng xuất file Excel từ MT5 hoặc copy danh sách lệnh.',
        });
        return;
      }

      // If user provided Login ID or Server, override if not specified
      if (passviewLogin.trim()) {
        parsed.account.login = passviewLogin.trim();
      }
      if (passviewServer.trim()) {
        parsed.account.server = passviewServer.trim();
      }

      applyImportedData(parsed);
    } catch (err: any) {
      setImportStatus({ success: false, msg: `Lỗi xử lý: ${err.message}` });
    }
  };

  const loadSampleDataset = () => {
    onImportData(SAMPLE_REPORT_DATA);
    setImportStatus({
      success: true,
      msg: 'Đã nạp bộ dữ liệu mẫu chuẩn MISU (154 lệnh XAUUSD)!',
    });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] w-full max-w-2xl rounded-2xl border border-[var(--line)] shadow-2xl p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[var(--brand)]" />
              Nạp Báo Cáo Giao Dịch MT5 / Exness
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Hỗ trợ đầy đủ định dạng Excel (.xlsx, .xls), CSV, HTML và Passview (Không cần cài đặt Python)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--sunk)] text-[var(--muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-[var(--sunk)] p-1 text-xs font-semibold gap-1">
          <button
            onClick={() => {
              setActiveTab('excel');
              setImportStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'excel'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Nạp File Excel / CSV / HTML</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setImportStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'paste'
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-[var(--brand)]" />
            <span>Dán Báo Cáo (Copy/Paste)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('passview');
              setImportStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
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
        {importStatus && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
              importStatus.success
                ? 'bg-[var(--win)]/10 text-[var(--win)] border-[var(--win)]/30'
                : 'bg-[var(--loss)]/10 text-[var(--loss)] border-[var(--loss)]/30'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{importStatus.msg}</span>
          </div>
        )}

        {/* Tab 1: Excel & CSV File Upload */}
        {activeTab === 'excel' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[var(--line)] rounded-2xl p-6 sm:p-8 text-center hover:border-[var(--brand)] transition-colors bg-[var(--sunk)]/30 relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.htm,.html,.xml"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div className="font-bold text-sm text-[var(--ink)]">
                Kéo thả file Excel (.xlsx, .xls) hoặc CSV / HTML vào đây
              </div>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
                Hỗ trợ trực tiếp file Excel xuất từ MT5 (Chuột phải History &rarr; Report &rarr; Open XML) hoặc file sao kê Exness.
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="px-3.5 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-bold shadow-xs">
                  Chọn file từ máy tính
                </span>
                <span className="text-[11px] text-[var(--muted)]">.xlsx, .xls, .csv, .html</span>
              </div>

              {fileName && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs font-mono font-medium text-[var(--ink)] shadow-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{fileName}</span>
                  <span className="text-[var(--muted)] text-[10px]">({fileSize})</span>
                  {pendingParsedData && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--win)]/15 text-[var(--win)] text-[10px] font-bold">
                      {pendingParsedData.trades.length} lệnh
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[var(--sunk)]/60 rounded-xl p-3.5 text-xs text-[var(--muted)] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <ShieldCheck className="w-4 h-4 text-[var(--win)]" />
                <span>Bảo vệ số liệu & Phân lập rút tiền:</span>
              </div>
              <p className="leading-relaxed">
                Hệ thống tự động nhận diện chính xác các khoản Rút tiền (Withdrawals) và Nạp tiền (Deposits) để đưa vào mục Quản trị dòng tiền, tuyệt đối không trừ vào Lợi nhuận giao dịch (Pure Trading P&L) hay làm lệch Winrate.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={loadSampleDataset}
                className="px-3.5 py-2 rounded-xl border border-[var(--line)] hover:bg-[var(--sunk)] text-xs font-semibold text-[var(--gold)] flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp Dữ Liệu Mẫu (154 lệnh)</span>
              </button>

              <button
                type="button"
                onClick={executeFileImport}
                disabled={!pendingParsedData}
                className={`px-6 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold transition-opacity shadow-xs ${
                  pendingParsedData ? 'hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                Nhập Dữ Liệu Ngay ({pendingParsedData ? `${pendingParsedData.trades.length} lệnh` : 'Chờ file'})
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Direct Paste (Copy/Paste from MT5) */}
        {activeTab === 'paste' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 mb-1.5">
                <ClipboardPaste className="w-3.5 h-3.5 text-[var(--brand)]" />
                Dán văn bản báo cáo hoặc bảng lịch sử lệnh MT5:
              </label>
              <textarea
                rows={7}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Trong MT5: Mở tab History -> Chọn khoảng thời gian -> Bấm Ctrl+A rồi Ctrl+C -> Dán vào ô này (hỗ trợ cả định dạng bảng copy từ MT5, Excel hoặc HTML report)..."
                className="w-full text-xs p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>

            <div className="bg-[var(--sunk)]/60 rounded-xl p-3 text-xs text-[var(--muted)] space-y-1">
              <div className="font-semibold text-[var(--ink)]">Cách lấy dữ liệu nhanh nhất:</div>
              <p>
                Trên MT5 Desktop hoặc WebTerminal: Mở tab Lịch sử &rarr; Chuột phải &rarr; <strong>Report &rarr; Open XML (Excel)</strong> hoặc <strong>HTML</strong>, hoặc nhấn <code>Ctrl + A</code> rồi <code>Ctrl + C</code> để copy toàn bộ bảng lịch sử dán vào đây.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--line)] text-xs text-[var(--muted)] hover:bg-[var(--sunk)]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={executePastedImport}
                disabled={!pastedText.trim()}
                className={`px-5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold transition-opacity shadow-xs ${
                  pastedText.trim() ? 'hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                Phân Tích Dữ Liệu Đã Dán
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Passview & Exness Zero-Install Solution */}
        {activeTab === 'passview' && (
          <div className="space-y-4">
            {/* Zero-Install Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Giải Pháp Chuẩn Xác 100% • HOÀN TOÀN KHÔNG CẦN CÀI PYTHON</span>
              </div>
              <p className="text-[var(--muted)] text-[11px] leading-relaxed">
                Máy chủ sàn Exness dùng kết nối TCP nhị phân nội bộ (cổng 443/1950) chỉ ứng dụng MT5 mới mở được, trình duyệt web sandbox không được phép mở trực tiếp. Bạn <strong>không cần phải cài đặt Python hay bất kỳ ứng dụng nào khác</strong> để lấy dữ liệu. Hãy chọn 1 trong 2 cách sau:
              </p>
            </div>

            {/* 2 Ways Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Way 1: Export Excel from MT5 */}
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

              {/* Way 2: Exness WebTerminal */}
              <div className="p-3.5 rounded-xl bg-[var(--sunk)]/50 border border-[var(--line)] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                  <ExternalLink className="w-4 h-4 text-[var(--gold)]" />
                  <span>Cách 2: Dùng Exness WebTerminal</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Nếu không muốn mở app MT5, mở WebTerminal chính thức của Exness ngay trên trình duyệt web, đăng nhập Passview rồi sao chép bảng lịch sử lệnh.
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

            {/* Quick Profile & Paste Box */}
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
                  Dán nội dung lịch sử lệnh hoặc thả file Excel vào đây:
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
                <span>Không cần quyền giao dịch • Bảo mật tuyệt đối</span>
              </span>

              <button
                type="button"
                onClick={executePassviewHelperImport}
                disabled={!passviewPastedData.trim() && !pendingParsedData}
                className={`px-5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold transition-opacity shadow-xs ${
                  passviewPastedData.trim() || pendingParsedData ? 'hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                Phân Tích Dữ Liệu Ngay
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer with Clear All Data action */}
        {onClearData && currentData.trades.length > 0 && (
          <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Muốn làm mới hoàn toàn?</span>
            <button
              type="button"
              onClick={() => {
                onClearData();
                onClose();
              }}
              className="text-amber-500 hover:text-amber-600 font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá hết dữ liệu để import mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
