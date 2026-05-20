'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { DataTable } from '../../src/components/DataTable';
import { mockAuditLogs, type AuditLogRow } from '../../src/lib/mock-data-tables';

export default function AuditPage() {
  const t = useFormatMessage();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredData = activeFilter === 'all'
    ? mockAuditLogs
    : mockAuditLogs.filter((a) => a.action === activeFilter);

  const filters = [
    { key: 'all', labelKey: 'audit.filterAll' },
    { key: 'create', labelKey: 'audit.filterCreate' },
    { key: 'update', labelKey: 'audit.filterUpdate' },
    { key: 'delete', labelKey: 'audit.filterDelete' },
    { key: 'seal', labelKey: 'audit.filterSeal' },
  ];

  function actionBadge(action: string): string {
    switch (action) {
      case 'create': return 'bg-[#E6F2EC] text-[#1A7A4A]';
      case 'update': return 'bg-[#FDEBD8] text-[#E8730A]';
      case 'delete': return 'bg-[#F7E0DD] text-[#C0392B]';
      case 'seal': return 'bg-[#EEE7F5] text-[#3D1A5C]';
      default: return 'bg-[#F3EFE9] text-[#555550]';
    }
  }

  const columns = [
    {
      key: 'timestamp',
      header: t('audit.columns.timestamp' as any),
      accessor: (row: AuditLogRow) => <span className="font-mono text-xs">{row.timestamp.split('T').join(' ').replace('Z', '')}</span>,
      sortable: true,
      sortFn: (a: AuditLogRow, b: AuditLogRow) => a.timestamp.localeCompare(b.timestamp),
    },
    {
      key: 'actor',
      header: t('audit.columns.actor' as any),
      accessor: (row: AuditLogRow) => row.actor,
      sortable: true,
      sortFn: (a: AuditLogRow, b: AuditLogRow) => a.actor.localeCompare(b.actor),
    },
    {
      key: 'action',
      header: t('audit.columns.action' as any),
      accessor: (row: AuditLogRow) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${actionBadge(row.action)}`}>
          {t(`audit.filter${row.action.charAt(0).toUpperCase() + row.action.slice(1)}` as any)}
        </span>
      ),
    },
    {
      key: 'resource',
      header: t('audit.columns.resource' as any),
      accessor: (row: AuditLogRow) => <span className="font-mono text-xs">{row.resource}</span>,
    },
    {
      key: 'details',
      header: t('audit.columns.details' as any),
      accessor: (row: AuditLogRow) => <span className="text-sm text-[#555550]">{row.details}</span>,
    },
  ];

  const handleExport = () => {
    const header = 'Timestamp,Actor,Action,Resource,Details\n';
    const rows = filteredData
      .map((r) => `"${r.timestamp}","${r.actor}","${r.action}","${r.resource}","${r.details}"`)
      .join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('audit.title' as any)}</h1>
              <button
                onClick={handleExport}
                className="px-5 py-2.5 bg-[#F3EFE9] text-[#2B2B2B] text-sm font-semibold rounded-xl border border-[#E8E3DB] hover:bg-[#E8E3DB] transition-colors"
              >
                {t('audit.exportCsv' as any)}
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
              emptyMessage="No audit logs"
              totalMessage={t('submissions.total' as any)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
