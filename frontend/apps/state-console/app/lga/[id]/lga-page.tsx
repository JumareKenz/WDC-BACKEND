'use client';

import { useParams } from 'next/navigation';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../../src/components/Sidebar';
import { TopBar } from '../../../src/components/TopBar';
import { mockLgaHeatmap } from '../../../src/lib/mock-dashboard';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DB] p-5">
      <p className="text-sm text-[#555550] font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function LgaDrilldownPageClient() {
  const params = useParams();
  const t = useFormatMessage();
  const lgaId = params.id as string;
  const lga = mockLgaHeatmap.find((l) => l.id === lgaId) ?? mockLgaHeatmap[0]!;

  // Mock ward breakdown
  const wards = [
    { name: `${lga.name} Ward 1`, submissions: Math.round(lga.submissions * 0.35), approved: Math.round(lga.approved * 0.4), pending: Math.round(lga.pending * 0.3), returned: Math.round(lga.returned * 0.4) },
    { name: `${lga.name} Ward 2`, submissions: Math.round(lga.submissions * 0.3), approved: Math.round(lga.approved * 0.35), pending: Math.round(lga.pending * 0.4), returned: Math.round(lga.returned * 0.3) },
    { name: `${lga.name} Ward 3`, submissions: Math.round(lga.submissions * 0.25), approved: Math.round(lga.approved * 0.2), pending: Math.round(lga.pending * 0.2), returned: Math.round(lga.returned * 0.2) },
    { name: `${lga.name} Ward 4`, submissions: Math.round(lga.submissions * 0.1), approved: Math.round(lga.approved * 0.05), pending: Math.round(lga.pending * 0.1), returned: Math.round(lga.returned * 0.1) },
  ];

  const approvalRate = lga.submissions > 0 ? Math.round((lga.approved / lga.submissions) * 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <a href="/" className="text-sm text-[#1A7A4A] hover:underline">
                {t('lga.backToDashboard' as any)}
              </a>
              <span className="text-[#999]">›</span>
              <span className="text-sm font-semibold text-[#2B2B2B]">{lga.name}</span>
            </div>

            <h1 className="text-2xl font-bold text-[#2B2B2B]">
              {lga.name} — {t('lga.title' as any)}
            </h1>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={t('kpi.totalSubmissions' as any)} value={String(lga.submissions)} color="text-[#1A7A4A]" />
              <StatCard label={t('kpi.approved' as any)} value={String(lga.approved)} color="text-[#135A37]" />
              <StatCard label={t('lga.approvalRate' as any)} value={`${approvalRate}%`} color="text-[#E8730A]" />
              <StatCard label={t('kpi.returned' as any)} value={String(lga.returned)} color="text-[#C0392B]" />
            </div>

            {/* Wards table */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4">{t('lga.reportsByWard' as any)}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F9F7F4] border-b border-[#E8E3DB]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#555550]">{t('submissions.columns.ward' as any)}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#555550]">{t('kpi.totalSubmissions' as any)}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#555550]">{t('kpi.approved' as any)}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#555550]">{t('kpi.pendingReview' as any)}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#555550]">{t('kpi.returned' as any)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wards.map((ward, i) => (
                      <tr key={i} className="border-b border-[#E8E3DB] hover:bg-[#F9F7F4] transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[#2B2B2B]">{ward.name}</td>
                        <td className="px-4 py-3 text-sm text-[#2B2B2B]">{ward.submissions}</td>
                        <td className="px-4 py-3 text-sm text-[#1A7A4A]">{ward.approved}</td>
                        <td className="px-4 py-3 text-sm text-[#E8730A]">{ward.pending}</td>
                        <td className="px-4 py-3 text-sm text-[#C0392B]">{ward.returned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
