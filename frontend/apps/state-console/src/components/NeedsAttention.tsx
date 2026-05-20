'use client';

import { useFormatMessage } from '@wdc/i18n';
import { mockNeedsAttention } from '../lib/mock-dashboard';

function typeStyles(type: string) {
  switch (type) {
    case 'overdue':
      return { badge: 'bg-[#F7E0DD] text-[#C0392B]', icon: '⏰' };
    case 'returned':
      return { badge: 'bg-[#FDEBD8] text-[#E8730A]', icon: '↩' };
    case 'pendingSealing':
      return { badge: 'bg-[#EEE7F5] text-[#3D1A5C]', icon: '🔒' };
    default:
      return { badge: 'bg-[#E6F2EC] text-[#1A7A4A]', icon: '•' };
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'overdue':
      return 'needsAttention.overdueReports';
    case 'returned':
      return 'needsAttention.returnedForRevision';
    case 'pendingSealing':
      return 'needsAttention.pendingSealing';
    default:
      return '';
  }
}

export function NeedsAttention() {
  const t = useFormatMessage();

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-[#2B2B2B]">{t('needsAttention.title' as any)}</h3>
        <span className="text-sm text-[#1A7A4A] font-medium cursor-pointer hover:underline">
          {t('needsAttention.viewAll' as any)} ›
        </span>
      </div>

      <div className="space-y-2">
        {mockNeedsAttention.map((item) => {
          const styles = typeStyles(item.type);
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#F9F7F4] transition-colors cursor-pointer"
            >
              <span className="text-lg">{styles.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2B2B2B] truncate">{item.title}</p>
                <p className="text-xs text-[#555550]">
                  {item.ward}, {item.lga}
                  {item.daysOverdue && (
                    <span className="text-[#C0392B] font-medium"> · {item.daysOverdue}d overdue</span>
                  )}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${styles.badge}`}>
                {t(typeLabel(item.type) as any)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
