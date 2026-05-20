'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { mockAnalyticsPeriods, mockAnalyticsByMethod } from '../../src/lib/mock-dashboard';

function BarChart({ data, max }: { data: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-[#555550] w-20 text-right truncate">{d.label}</span>
          <div className="flex-1 h-6 bg-[#F3EFE9] rounded-lg overflow-hidden">
            <div
              className={`h-full rounded-lg ${d.color}`}
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-[#2B2B2B] w-10">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useFormatMessage();
  const [period, setPeriod] = useState('month');

  const periods = [
    { key: 'week', labelKey: 'analytics.period.week' },
    { key: 'month', labelKey: 'analytics.period.month' },
    { key: 'quarter', labelKey: 'analytics.period.quarter' },
    { key: 'year', labelKey: 'analytics.period.year' },
  ];

  const submissionsData = mockAnalyticsPeriods.map((p) => ({
    label: p.label,
    value: p.submissions,
    color: 'bg-[#1A7A4A]',
  }));
  const approvedData = mockAnalyticsPeriods.map((p) => ({
    label: p.label,
    value: p.approved,
    color: 'bg-[#A8C5A0]',
  }));
  const returnedData = mockAnalyticsPeriods.map((p) => ({
    label: p.label,
    value: p.returned,
    color: 'bg-[#C0392B]',
  }));

  const maxVal = Math.max(...mockAnalyticsPeriods.map((p) => p.submissions));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('analytics.title' as any)}</h1>
              <div className="flex gap-2">
                {periods.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      period === p.key
                        ? 'bg-[#1A7A4A] text-white'
                        : 'bg-white text-[#555550] border border-[#E8E3DB] hover:bg-[#F9F7F4]'
                    }`}
                  >
                    {t(p.labelKey as any)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submissions over time */}
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">{t('analytics.submissionsOverTime' as any)}</h3>
                <BarChart data={submissionsData} max={maxVal} />
              </div>

              {/* By method */}
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">{t('analytics.byMethod' as any)}</h3>
                <BarChart
                  data={mockAnalyticsByMethod.map((m) => ({
                    label: m.method,
                    value: m.count,
                    color: m.method === 'wizard' ? 'bg-[#1A7A4A]' : m.method === 'amira' ? 'bg-[#E8730A]' : 'bg-[#3D1A5C]',
                  }))}
                  max={Math.max(...mockAnalyticsByMethod.map((m) => m.count))}
                />
              </div>

              {/* Approval rate */}
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">{t('analytics.approvalRate' as any)}</h3>
                <BarChart data={approvedData} max={maxVal} />
              </div>

              {/* Returned */}
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">{t('analytics.responseTime' as any)}</h3>
                <BarChart data={returnedData} max={maxVal} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
