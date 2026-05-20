'use client';

import { useFormatMessage } from '@wdc/i18n';
import { mockKpis, type KpiData } from '../lib/mock-dashboard';

function KpiCard({ kpi }: { kpi: KpiData }) {
  const t = useFormatMessage();
  const isPositive = kpi.change >= 0;

  const colorMap: Record<string, string> = {
    forestGreen: 'text-[#1A7A4A]',
    forestGreenDark: 'text-[#135A37]',
    amber: 'text-[#E8730A]',
    softRed: 'text-[#C0392B]',
    aubergine: 'text-[#3D1A5C]',
  };


  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DB] p-5 hover:shadow-sm transition-shadow">
      <p className="text-sm text-[#555550] font-medium mb-1">{t(kpi.label as any)}</p>
      <p className={`text-3xl font-bold ${colorMap[kpi.color] ?? 'text-[#2B2B2B]'}`}>
        {kpi.value.toLocaleString()}
      </p>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPositive ? 'bg-[#E6F2EC] text-[#1A7A4A]' : 'bg-[#F7E0DD] text-[#C0392B]'
          }`}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(kpi.change)}%
        </span>
        <span className="text-xs text-[#999]">{t(kpi.changeLabel as any)}</span>
      </div>
    </div>
  );
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {mockKpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
