'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { DataTable } from '../../src/components/DataTable';
import { mockForms } from '../../src/lib/mock-data-tables';
import type { FormRow } from '../../src/lib/mock-data-tables';

function statusBadge(status: string): string {
  switch (status) {
    case 'deployed': return 'bg-[#E6F2EC] text-[#1A7A4A]';
    case 'draft': return 'bg-[#FDEBD8] text-[#E8730A]';
    case 'archived': return 'bg-[#F3EFE9] text-[#555550]';
    default: return 'bg-[#F3EFE9] text-[#555550]';
  }
}

export default function FormsPage() {
  const t = useFormatMessage();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredData = activeFilter === 'all'
    ? mockForms
    : mockForms.filter((f) => f.status === activeFilter);

  const filters = [
    { key: 'all', labelKey: 'submissions.filterAll' },
    { key: 'deployed', labelKey: 'forms.status.deployed' },
    { key: 'draft', labelKey: 'forms.status.draft' },
    { key: 'archived', labelKey: 'forms.status.archived' },
  ];

  const columns = [
    {
      key: 'title',
      header: t('forms.columns.title' as any),
      accessor: (row: FormRow) => (
        <div>
          <p className="font-medium text-[#2B2B2B]">{row.title}</p>
          <p className="text-xs text-[#999]">{row.titleHa}</p>
        </div>
      ),
      sortable: true,
      sortFn: (a: FormRow, b: FormRow) => a.title.localeCompare(b.title),
    },
    {
      key: 'scope',
      header: t('forms.columns.scope' as any),
      accessor: (row: FormRow) => (
        <span className="text-sm text-[#555550]">{t(`forms.scope.${row.scopeKind}` as any)}</span>
      ),
    },
    {
      key: 'status',
      header: t('forms.columns.status' as any),
      accessor: (row: FormRow) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(row.status)}`}>
          {t(`forms.status.${row.status}` as any)}
        </span>
      ),
    },
    {
      key: 'version',
      header: t('forms.columns.version' as any),
      accessor: (row: FormRow) => <span className="font-mono text-xs">v{row.versionNumber}</span>,
      sortable: true,
      sortFn: (a: FormRow, b: FormRow) => a.versionNumber - b.versionNumber,
    },
    {
      key: 'updatedAt',
      header: t('forms.columns.updatedAt' as any),
      accessor: (row: FormRow) => row.updatedAt.split('T')[0],
      sortable: true,
      sortFn: (a: FormRow, b: FormRow) => a.updatedAt.localeCompare(b.updatedAt),
    },
  ];

  const filterFn = (row: FormRow, q: string) =>
    row.title.toLowerCase().includes(q) ||
    row.titleHa.toLowerCase().includes(q);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('forms.title' as any)}</h1>
              <a
                href="/forms/new"
                className="px-5 py-2.5 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors inline-block"
              >
                {t('forms.newForm' as any)}
              </a>
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
              emptyMessage={t('forms.listEmpty' as any)}
              totalMessage={t('submissions.total' as any)}
              rowHref={(row) => `/forms/${row.id}`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
