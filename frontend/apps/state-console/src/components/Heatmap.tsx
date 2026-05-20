'use client';

import { useFormatMessage } from '@wdc/i18n';
import { mockLgaHeatmap } from '../lib/mock-dashboard';

function getIntensityLevel(submissions: number): string {
  if (submissions >= 200) return 'high';
  if (submissions >= 100) return 'medium';
  if (submissions >= 50) return 'low';
  return 'none';
}

function getColorClass(level: string): string {
  switch (level) {
    case 'high':
      return 'bg-[#1A7A4A] text-white';
    case 'medium':
      return 'bg-[#A8C5A0] text-[#2B2B2B]';
    case 'low':
      return 'bg-[#FDEBD8] text-[#2B2B2B]';
    default:
      return 'bg-[#F3EFE9] text-[#999]';
  }
}

export function Heatmap() {
  const t = useFormatMessage();

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-[#2B2B2B]">{t('heatmap.title' as any)}</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#1A7A4A]" />
            <span className="text-[#555550]">{t('heatmap.highActivity' as any)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#A8C5A0]" />
            <span className="text-[#555550]">{t('heatmap.mediumActivity' as any)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#FDEBD8]" />
            <span className="text-[#555550]">{t('heatmap.lowActivity' as any)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F3EFE9]" />
            <span className="text-[#555550]">{t('heatmap.noActivity' as any)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {mockLgaHeatmap.map((lga) => {
          const level = getIntensityLevel(lga.submissions);
          return (
            <a
              key={lga.id}
              href={`/lga/${lga.id}`}
              className={`rounded-xl p-3 text-center transition-transform hover:scale-105 cursor-pointer ${getColorClass(level)}`}
              title={`${lga.name}: ${lga.submissions} submissions`}
            >
              <p className="text-xs font-semibold truncate">{lga.name}</p>
              <p className="text-lg font-bold mt-1">{lga.submissions}</p>
              <p className="text-[10px] opacity-80 mt-0.5">
                {lga.approved}/{lga.pending}/{lga.returned}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
