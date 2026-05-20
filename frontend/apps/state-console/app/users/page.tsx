'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { DataTable } from '../../src/components/DataTable';
import { AssignSecretaryModal } from '../../src/components/AssignSecretaryModal';
import { mockUsers } from '../../src/lib/mock-data-tables';
import type { UserRow } from '../../src/lib/mock-data-tables';

export default function UsersPage() {
  const t = useFormatMessage();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filteredData = activeFilter === 'all'
    ? mockUsers
    : mockUsers.filter((u) => u.role === activeFilter);

  const filters = [
    { key: 'all', labelKey: 'users.filterAll' },
    { key: 'secretary', labelKey: 'users.filterSecretary' },
    { key: 'coordinator', labelKey: 'users.filterCoordinator' },
    { key: 'director', labelKey: 'users.filterDirector' },
  ];

  function roleBadge(role: string): string {
    switch (role) {
      case 'director': return 'bg-[#EEE7F5] text-[#3D1A5C]';
      case 'coordinator': return 'bg-[#FDEBD8] text-[#E8730A]';
      case 'secretary': return 'bg-[#E6F2EC] text-[#1A7A4A]';
      default: return 'bg-[#F3EFE9] text-[#555550]';
    }
  }

  function statusBadge(status: string): string {
    switch (status) {
      case 'active': return 'bg-[#E6F2EC] text-[#1A7A4A]';
      case 'suspended': return 'bg-[#F7E0DD] text-[#C0392B]';
      default: return 'bg-[#F3EFE9] text-[#555550]';
    }
  }

  const columns = [
    {
      key: 'name',
      header: t('users.columns.name' as any),
      accessor: (row: UserRow) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E6F2EC] flex items-center justify-center text-xs font-bold text-[#1A7A4A]">
            {row.name.charAt(0)}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
      sortable: true,
      sortFn: (a: UserRow, b: UserRow) => a.name.localeCompare(b.name),
    },
    {
      key: 'role',
      header: t('users.columns.role' as any),
      accessor: (row: UserRow) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge(row.role)}`}>
          {t(`role.${row.role}` as any)}
        </span>
      ),
    },
    {
      key: 'phone',
      header: t('users.columns.phone' as any),
      accessor: (row: UserRow) => <span className="font-mono text-xs">{row.phone}</span>,
    },
    {
      key: 'lga',
      header: t('users.columns.lga' as any),
      accessor: (row: UserRow) => row.lga,
      sortable: true,
      sortFn: (a: UserRow, b: UserRow) => a.lga.localeCompare(b.lga),
    },
    {
      key: 'ward',
      header: t('users.columns.ward' as any),
      accessor: (row: UserRow) => row.ward ?? '—',
    },
    {
      key: 'status',
      header: t('users.columns.status' as any),
      accessor: (row: UserRow) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'lastActive',
      header: t('users.columns.lastActive' as any),
      accessor: (row: UserRow) => row.lastActive.split('T')[0],
      sortable: true,
      sortFn: (a: UserRow, b: UserRow) => a.lastActive.localeCompare(b.lastActive),
    },
  ];

  const filterFn = (row: UserRow, q: string) =>
    row.name.toLowerCase().includes(q) ||
    row.phone.toLowerCase().includes(q) ||
    row.lga.toLowerCase().includes(q);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('users.title' as any)}</h1>
              <button
                onClick={() => setModalOpen(true)}
                className="px-5 py-2.5 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors"
              >
                {t('assignSecretary.title' as any)}
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
              emptyMessage={t('users.empty' as any)}
              totalMessage={t('users.total' as any)}
            />

            <AssignSecretaryModal open={modalOpen} onClose={() => setModalOpen(false)} />
          </div>
        </main>
      </div>
    </div>
  );
}
