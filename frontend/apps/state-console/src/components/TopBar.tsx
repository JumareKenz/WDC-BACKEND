'use client';

import { useFormatMessage } from '@wdc/i18n';

export function TopBar() {
  const t = useFormatMessage();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E8E3DB]">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]">🔍</span>
          <input
            type="text"
            placeholder={t('console.search' as any)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] focus:border-transparent"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-[#F3EFE9] transition-colors">
          <span className="text-lg">🔔</span>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E8730A] rounded-full border-2 border-white" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#E8E3DB]">
          <div className="w-9 h-9 rounded-full bg-[#E6F2EC] flex items-center justify-center text-sm font-bold text-[#1A7A4A]">
            D
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#2B2B2B]">Director</p>
            <p className="text-xs text-[#999]">State Director</p>
          </div>
        </div>
      </div>
    </header>
  );
}
