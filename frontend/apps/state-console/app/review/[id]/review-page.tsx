'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../../src/components/Sidebar';
import { TopBar } from '../../../src/components/TopBar';
import { mockSubmissions } from '../../../src/lib/mock-data-tables';

function statusBadge(status: string): string {
  switch (status) {
    case 'approved': return 'bg-[#E6F2EC] text-[#1A7A4A]';
    case 'submitted': return 'bg-[#E6F2EC] text-[#135A37]';
    case 'in_review': return 'bg-[#FDEBD8] text-[#E8730A]';
    case 'returned': return 'bg-[#F7E0DD] text-[#C0392B]';
    case 'sealed': return 'bg-[#EEE7F5] text-[#3D1A5C]';
    default: return 'bg-[#F3EFE9] text-[#555550]';
  }
}

export default function ReviewPageClient() {
  const params = useParams();
  const t = useFormatMessage();
  const reportId = params.id as string;
  const report = mockSubmissions.find((s) => s.id === reportId) ?? mockSubmissions[0]!;
  const [returnNotes, setReturnNotes] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <a href="/submissions" className="text-sm text-[#1A7A4A] hover:underline">
                {t('console.submissions' as any)}
              </a>
              <span className="text-[#999]">›</span>
              <span className="text-sm font-semibold text-[#2B2B2B]">{t('review.title' as any)}</span>
            </div>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-[#2B2B2B]">{report.ward}</h1>
                  <p className="text-sm text-[#555550]">{report.lga} · {report.secretary}</p>
                </div>
                <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${statusBadge(report.status)}`}>
                  {t(`reports.${report.status.replace('-', '')}` as any)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('review.meetingDate' as any)}</p>
                  <p className="text-sm font-semibold text-[#2B2B2B]">2024-06-14</p>
                </div>
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('review.attendance' as any)}</p>
                  <p className="text-sm font-semibold text-[#2B2B2B]">47</p>
                </div>
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('review.agendaItems' as any)}</p>
                  <p className="text-sm font-semibold text-[#2B2B2B]">4</p>
                </div>
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('submissions.columns.method' as any)}</p>
                  <p className="text-sm font-semibold text-[#2B2B2B] capitalize">{report.method}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#555550] mb-3">
                {t('review.summary' as any)}
              </h3>
              <p className="text-sm text-[#2B2B2B] leading-relaxed">
                Ward meeting held with good attendance. Key decisions made on water project allocation and road repair scheduling. Budget approved for next quarter.
              </p>
            </div>

            {/* Audit History */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#555550] mb-4">
                {t('review.history' as any)}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#1A7A4A] mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-[#2B2B2B]">{t('review.history.submitted' as any)}</p>
                    <p className="text-xs text-[#999]">{report.submittedAt.split('T')[0]} · {report.secretary}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#E8730A] mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-[#2B2B2B]">{t('review.history.openedReview' as any)}</p>
                    <p className="text-xs text-[#999]">2024-06-15 · Ibrahim Abdullahi</p>
                  </div>
                </div>
                {report.status === 'approved' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#135A37] mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2B2B2B]">{t('review.history.approved' as any)}</p>
                      <p className="text-xs text-[#999]">2024-06-16 · Director</p>
                    </div>
                  </div>
                )}
                {report.status === 'returned' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#C0392B] mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2B2B2B]">{t('review.history.returned' as any)}</p>
                      <p className="text-xs text-[#999]">2024-06-16 · Ibrahim Abdullahi</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {(report.status === 'submitted' || report.status === 'in_review') && (
              <div className="flex gap-4">
                <button className="flex-1 py-3 bg-[#1A7A4A] text-white font-semibold rounded-xl hover:bg-[#135A37] transition-colors">
                  {t('review.approve' as any)}
                </button>
                <button
                  onClick={() => setShowReturnForm(!showReturnForm)}
                  className="flex-1 py-3 bg-[#F7E0DD] text-[#C0392B] font-semibold rounded-xl border border-[#C0392B] hover:bg-[#F7E0DD]/80 transition-colors"
                >
                  {t('review.return' as any)}
                </button>
              </div>
            )}

            {/* Return notes form */}
            {showReturnForm && (
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                  {t('review.returnNotes' as any)}
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] resize-none"
                  placeholder="Enter notes for the secretary..."
                />
                <div className="flex justify-end mt-3">
                  <button className="px-5 py-2.5 bg-[#C0392B] text-white text-sm font-semibold rounded-xl hover:bg-[#a93226] transition-colors">
                    {t('review.return' as any)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
