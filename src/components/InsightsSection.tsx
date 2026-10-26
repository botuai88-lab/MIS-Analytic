import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { RuleInsight } from '../types/trading';

interface InsightsSectionProps {
  insights: RuleInsight[];
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ insights }) => {
  const getBadgeStyle = (tag: RuleInsight['tag']) => {
    switch (tag) {
      case 'good':
        return {
          bg: 'bg-[var(--win)]/15',
          text: 'text-[var(--win)]',
          border: 'border-[var(--win)]/30',
          dot: 'bg-[var(--win)]',
          icon: CheckCircle2,
        };
      case 'risk':
        return {
          bg: 'bg-[var(--loss)]/15',
          text: 'text-[var(--loss)]',
          border: 'border-[var(--loss)]/30',
          dot: 'bg-[var(--loss)]',
          icon: AlertTriangle,
        };
      case 'info':
      default:
        return {
          bg: 'bg-[var(--gold)]/15',
          text: 'text-[var(--gold)]',
          border: 'border-[var(--gold)]/30',
          dot: 'bg-[var(--gold)]',
          icon: Info,
        };
    }
  };

  return (
    <section id="nhan-xet" className="py-6 sm:py-8 space-y-4">
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--gold)]" />
            <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
              8 Nhận xét Hành vi Thực chiến
            </h2>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            Sinh tự động bởi Động cơ Phân tích Định lượng (Rule-based Quantitative Analytics Engine)
          </p>
        </div>

        {/* 3 Color Legend */}
        <div className="flex items-center gap-3 text-xs bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--line)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--win)]" />
            <span className="text-[var(--ink)] font-medium">Điểm mạnh</span>
          </div>
          <span className="text-[var(--line)]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--loss)]" />
            <span className="text-[var(--ink)] font-medium">Rủi ro cần xử lý</span>
          </div>
          <span className="text-[var(--line)]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />
            <span className="text-[var(--ink)] font-medium">Lưu ý</span>
          </div>
        </div>
      </div>

      {/* 2x4 Grid of 8 Rule-Based Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item) => {
          const style = getBadgeStyle(item.tag);
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--line)] p-4 sm:p-5 flex flex-col justify-between hover:shadow-sm transition-shadow space-y-3"
            >
              <div>
                {/* Header: Title & Tag Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-[var(--ink)] leading-snug">
                    {item.title}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border} shrink-0`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{item.tagLabel}</span>
                  </span>
                </div>

                {/* Highlight Metric Badge */}
                <div className="bg-[var(--sunk)]/70 rounded-lg p-2.5 text-xs font-mono font-medium text-[var(--ink)] border border-[var(--line)] tabular-nums mb-3">
                  {item.metric}
                </div>

                {/* In-depth behavioral analysis */}
                <p className="text-xs text-[var(--ink)]/85 leading-relaxed">
                  {item.analysis}
                </p>
              </div>

              {/* Actionable recommendation */}
              <div className="pt-2 border-t border-[var(--line)] text-xs flex items-start gap-2 text-[var(--muted)] bg-[var(--sunk)]/30 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 rounded-b-xl">
                <Lightbulb className="w-4 h-4 text-[var(--gold)] shrink-0 mt-0.5" />
                <span className="italic leading-tight">
                  <strong className="text-[var(--ink)] not-italic mr-1">Khuyến nghị:</strong>
                  {item.recommendation}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
