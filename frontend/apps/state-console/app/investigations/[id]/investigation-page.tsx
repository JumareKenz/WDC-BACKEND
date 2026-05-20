'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../../src/components/Sidebar';
import { TopBar } from '../../../src/components/TopBar';
import { mockInvestigations } from '../../../src/lib/mock-data-tables';

function statusBadge(status: string): string {
  switch (status) {
    case 'open': return 'bg-[#F7E0DD] text-[#C0392B]';
    case 'in_progress': return 'bg-[#FDEBD8] text-[#E8730A]';
    case 'resolved': return 'bg-[#E6F2EC] text-[#1A7A4A]';
    case 'closed': return 'bg-[#F3EFE9] text-[#555550]';
    default: return 'bg-[#F3EFE9] text-[#555550]';
  }
}

function priorityBadge(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-[#C0392B] text-white';
    case 'high': return 'bg-[#F7E0DD] text-[#C0392B]';
    case 'medium': return 'bg-[#FDEBD8] text-[#E8730A]';
    case 'low': return 'bg-[#E6F2EC] text-[#1A7A4A]';
    default: return 'bg-[#F3EFE9] text-[#555550]';
  }
}

export default function InvestigationDetailPageClient() {
  const params = useParams();
  const t = useFormatMessage();
  const caseId = params.id as string;
  const investigation = mockInvestigations.find((i) => i.id === caseId) ?? mockInvestigations[0]!;
  const [newNote, setNewNote] = useState('');

  const timeline = [
    { type: 'opened', date: investigation.openedAt, text: t('investigationDetail.timeline.opened' as any) },
    { type: 'assigned', date: investigation.openedAt, text: t('investigationDetail.timeline.assigned' as any).replace('{name}', investigation.assignedTo) },
    { type: 'updated', date: investigation.updatedAt, text: t('investigationDetail.timeline.updated' as any).replace('{status}', investigation.status) },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <a href="/investigations" className="text-sm text-[#1A7A4A] hover:underline">
                {t('console.investigations' as any)}
              </a>
              <span className="text-[#999]">›</span>
              <span className="text-sm font-semibold text-[#2B2B2B]">{investigation.caseId}</span>
            </div>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-xl font-bold text-[#2B2B2B]">{investigation.title}</h1>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(investigation.status)}`}>
                      {t(`investigations.status.${investigation.status}` as any)}
                    </span>
                  </div>
                  <p className="text-sm text-[#555550]">
                    {t('investigationDetail.reportRef' as any)}: {investigation.reportId}
                  </p>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${priorityBadge(investigation.priority)}`}>
                  {t(`investigations.priority.${investigation.priority}` as any)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('investigationDetail.caseId' as any)}</p>
                  <p className="text-sm font-mono font-semibold text-[#2B2B2B]">{investigation.caseId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('investigationDetail.assignedTo' as any)}</p>
                  <p className="text-sm font-semibold text-[#2B2B2B]">{investigation.assignedTo}</p>
                </div>
                <div>
                  <p className="text-xs text-[#555550] mb-1">{t('investigationDetail.openedAt' as any)}</p>
                  <p className="text-sm font-semibold text-[#2B2B2B]">{investigation.openedAt.split('T')[0]}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#555550] mb-3">
                {t('investigationDetail.description' as any)}
              </h3>
              <p className="text-sm text-[#2B2B2B] leading-relaxed">
                {investigation.title}. This case was opened following an automated anomaly detection
                on report {investigation.reportId}. Further review is required to determine if
                corrective action is needed.
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#555550] mb-4">
                {t('investigationDetail.timeline' as any)}
              </h3>
              <div className="space-y-4">
                {timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#1A7A4A] mt-1.5" />
                    <div>
                      <p className="text-sm text-[#2B2B2B]">{event.text}</p>
                      <p className="text-xs text-[#999]">{event.date.split('T')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add note */}
              <div className="mt-6 pt-4 border-t border-[#E8E3DB]">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] resize-none"
                  placeholder={t('investigationDetail.addNote' as any)}
                />
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-2 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors">
                    {t('investigationDetail.addNote' as any)}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            {investigation.status !== 'closed' && (
              <div className="flex gap-4">
                <button className="flex-1 py-3 bg-[#1A7A4A] text-white font-semibold rounded-xl hover:bg-[#135A37] transition-colors">
                  {t('investigations.status.resolved' as any)}
                </button>
                <button className="flex-1 py-3 bg-[#F3EFE9] text-[#555550] font-semibold rounded-xl border border-[#E8E3DB] hover:bg-[#E8E3DB] transition-colors">
                  {t('investigationDetail.closeCase' as any)}
                </button>
              </div>
            )}
            {investigation.status === 'closed' && (
              <button className="w-full py-3 bg-[#F3EFE9] text-[#555550] font-semibold rounded-xl border border-[#E8E3DB] hover:bg-[#E8E3DB] transition-colors">
                {t('investigationDetail.reopen' as any)}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
