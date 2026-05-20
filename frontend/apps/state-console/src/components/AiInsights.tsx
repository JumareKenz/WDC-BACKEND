'use client';

import { useFormatMessage } from '@wdc/i18n';
import { mockAiInsights } from '../lib/mock-dashboard';

function severityStyles(severity: string) {
  switch (severity) {
    case 'critical':
      return 'border-l-[#C0392B] bg-[#F7E0DD]';
    case 'warning':
      return 'border-l-[#E8730A] bg-[#FDEBD8]';
    default:
      return 'border-l-[#1A7A4A] bg-[#E6F2EC]';
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'trend':
      return 'aiInsights.trend';
    case 'anomaly':
      return 'aiInsights.anomaly';
    case 'recommendation':
      return 'aiInsights.recommendation';
    default:
      return 'aiInsights.trend';
  }
}

export function AiInsights() {
  const t = useFormatMessage();

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-[#2B2B2B]">{t('aiInsights.title' as any)}</h3>
        <span className="text-xs px-2.5 py-1 bg-[#EEE7F5] text-[#3D1A5C] rounded-full font-medium">
          AI
        </span>
      </div>

      <div className="space-y-3">
        {mockAiInsights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-xl p-4 border-l-4 ${severityStyles(insight.severity)}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {t(typeLabel(insight.type) as any)}
              </span>
              <span className="text-xs font-medium text-[#1A7A4A] cursor-pointer hover:underline">
                {t('aiInsights.viewDetail' as any)} ›
              </span>
            </div>
            <p className="text-sm font-semibold text-[#2B2B2B] mb-1">{insight.title}</p>
            <p className="text-sm text-[#555550] leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
