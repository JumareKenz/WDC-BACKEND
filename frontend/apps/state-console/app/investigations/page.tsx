'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { DataTable } from '../../src/components/DataTable';
import { mockInvestigations } from '../../src/lib/mock-data-tables';
import type { InvestigationCase } from '../../src/lib/mock-data-tables';

export default function InvestigationsPage() {
  const t = useFormatMessage();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredData = activeFilter === 'all'
    ? mockInvestigations
    : mockInvestigations.filter((i) => i.status === activeFilter);

  const filters = [
    { key: 'all', labelKey: 'reportsList.filter.all' },
    { key: 'open', labelKey: 'investigations.status.open' },
    { key: 'in_progress', labelKey: 'investigations.status.inProgress' },
    { key: 'resolved', labelKey: 'investigations.status.resolved' },
    { key: 'closed', labelKey: 'investigations.status.closed' },
  ];

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

  const columns = [
    {
      key: 'caseId',
      header: t('investigations.columns.caseId' as any),
      accessor: (row: InvestigationCase) => <span className="font-mono text-xs">{row.caseId}</span>,
      sortable: true,
      sortFn: (a: InvestigationCase, b: InvestigationCase) => a.caseId.localeCompare(b.caseId),
    },
    {
      key: 'title',
      header: 'Title',
      accessor: (row: InvestigationCase) => <span className="font-medium">{row.title}</span>,
      sortable: true,
      sortFn: (a: InvestigationCase, b: InvestigationCase) => a.title.localeCompare(b.title),
    },
    {
      key: 'assignedTo',
      header: t('investigations.columns.assignedTo' as any),
      accessor: (row: InvestigationCase) => row.assignedTo,
      sortable: true,
      sortFn: (a: InvestigationCase, b: InvestigationCase) => a.assignedTo.localeCompare(b.assignedTo),
    },
    {
      key: 'status',
      header: t('investigations.columns.status' as any),
      accessor: (row: InvestigationCase) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(row.status)}`}>
          {t(`investigations.status.${row.status}` as any)}
        </span>
      ),
    },
    {
      key: 'priority',
      header: t('investigations.columns.priority' as any),
      accessor: (row: InvestigationCase) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${priorityBadge(row.priority)}`}>
          {t(`investigations.priority.${row.priority}` as any)}
        </span>
      ),
      sortable: true,
      sortFn: (a: InvestigationCase, b: InvestigationCase) => {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[a.priority as keyof typeof order] ?? 0) - (order[b.priority as keyof typeof order] ?? 0);
      },
    },
    {
      key: 'openedAt',
      header: t('investigations.columns.openedAt' as any),
      accessor: (row: InvestigationCase) => row.openedAt.split('T')[0],
      sortable: true,
      sortFn: (a: InvestigationCase, b: InvestigationCase) => a.openedAt.localeCompare(b.openedAt),
    },
  ];

  const filterFn = (row: InvestigationCase, q: string) =>
    row.caseId.toLowerCase().includes(q) ||
    row.title.toLowerCase().includes(q) ||
    row.assignedTo.toLowerCase().includes(q);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('investigations.title' as any)}</h1>
              <button className="px-5 py-2.5 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors">
                {t('investigations.newCase' as any)}
              </button>
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
              emptyMessage={t('investigations.empty' as any)}
              totalMessage={t('submissions.total' as any)}
              rowHref={(row) => `/investigations/${row.id}`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
