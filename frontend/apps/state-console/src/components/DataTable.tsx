import { useState, useMemo, ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  filterFn?: (row: T, query: string) => boolean;
  emptyMessage: string;
  totalMessage: string;
  rowHref?: (row: T) => string;
}

export function DataTable<T>({ columns, data, rowKey, filterFn, emptyMessage, totalMessage, rowHref }: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    if (!search.trim() || !filterFn) return data;
    const q = search.toLowerCase();
    return data.filter((row) => filterFn(row, q));
  }, [data, search, filterFn]);

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    const col = columns.find((c) => c.key === sortColumn);
    if (!col || !col.sortable || !col.sortFn) return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = col.sortFn!(a, b);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortColumn, sortDirection, columns]);

  const handleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortColumn === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
          />
        </div>
        <p className="text-sm text-[#555550]">{totalMessage.replace('{count}', String(sorted.length))}</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E3DB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9F7F4] border-b border-[#E8E3DB]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#555550] ${
                      col.sortable ? 'cursor-pointer hover:bg-[#F3EFE9] select-none' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortColumn === col.key && (
                        <span className="text-[#1A7A4A]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[#999]">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={`border-b border-[#E8E3DB] hover:bg-[#F9F7F4] transition-colors ${rowHref ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (rowHref) {
                        window.location.href = rowHref(row);
                      }
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-[#2B2B2B]">
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
