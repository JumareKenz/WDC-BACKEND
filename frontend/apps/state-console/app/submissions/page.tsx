'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { DataTable } from '../../src/components/DataTable';
import { mockSubmissions } from '../../src/lib/mock-data-tables';
import type { SubmissionRow } from '../../src/lib/mock-data-tables';

type StatusFilter = 'all' | 'approved' | 'submitted' | 'in_review' | 'returned' | 'sealed';

const filters: Array<{ key: StatusFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'submissions.filterAll' },
  { key: 'approved', labelKey: 'submissions.filterApproved' },
  { key: 'submitted', labelKey: 'submissions.filterPending' },
  { key: 'in_review', labelKey: 'submissions.filterPending' },
  { key: 'returned', labelKey: 'submissions.filterReturned' },
  { key: 'sealed', labelKey: 'submissions.filterSealed' },
];

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

export default function SubmissionsPage() {
  const t = useFormatMessage();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const filteredData = activeFilter === 'all'
    ? mockSubmissions
    : activeFilter === 'submitted' || activeFilter === 'in_review'
      ? mockSubmissions.filter((s) => s.status === 'submitted' || s.status === 'in_review')
      : mockSubmissions.filter((s) => s.status === activeFilter);

  const columns = [
    {
      key: 'ward',
      header: t('submissions.columns.ward' as any),
      accessor: (row: SubmissionRow) => row.ward,
      sortable: true,
      sortFn: (a: SubmissionRow, b: SubmissionRow) => a.ward.localeCompare(b.ward),
    },
    {
      key: 'lga',
      header: t('submissions.columns.lga' as any),
      accessor: (row: SubmissionRow) => row.lga,
      sortable: true,
      sortFn: (a: SubmissionRow, b: SubmissionRow) => a.lga.localeCompare(b.lga),
    },
    {
      key: 'secretary',
      header: t('submissions.columns.secretary' as any),
      accessor: (row: SubmissionRow) => row.secretary,
      sortable: true,
      sortFn: (a: SubmissionRow, b: SubmissionRow) => a.secretary.localeCompare(b.secretary),
    },
    {
      key: 'submittedAt',
      header: t('submissions.columns.submittedAt' as any),
      accessor: (row: SubmissionRow) => row.submittedAt.split('T')[0],
      sortable: true,
      sortFn: (a: SubmissionRow, b: SubmissionRow) => a.submittedAt.localeCompare(b.submittedAt),
    },
    {
      key: 'status',
      header: t('submissions.columns.status' as any),
      accessor: (row: SubmissionRow) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(row.status)}`}>
          {t(`reports.${row.status.replace('-', '')}` as any)}
        </span>
      ),
    },
    {
      key: 'method',
      header: t('submissions.columns.method' as any),
      accessor: (row: SubmissionRow) => (
        <span className="text-xs text-[#555550] capitalize">{row.method}</span>
      ),
    },
  ];

  const filterFn = (row: SubmissionRow, q: string) =>
    row.ward.toLowerCase().includes(q) ||
    row.lga.toLowerCase().includes(q) ||
    row.secretary.toLowerCase().includes(q);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('submissions.title' as any)}</h1>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === f.key
                      ? 'bg-[#1A7A4A] text-white'
                      : 'bg-white text-[#555550] border border-[#E8E3DB] hover:bg-[#F9F7F4]'
                  }`}
                >
                  {t(f.labelKey as any)}
                </button>
              ))}
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              rowKey={(row) => row.id}
              filterFn={filterFn}
              emptyMessage={t('submissions.empty' as any)}
              totalMessage={t('submissions.total' as any)}
              rowHref={(row) => `/review/${row.id}`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
