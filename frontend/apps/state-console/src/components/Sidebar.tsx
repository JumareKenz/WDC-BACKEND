'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useFormatMessage } from '@wdc/i18n';

const navItems = [
  { key: 'console.dashboard', href: '/', icon: '◆' },
  { key: 'console.submissions', href: '/submissions', icon: '📄' },
  { key: 'console.investigations', href: '/investigations', icon: '🔍' },
  { key: 'console.users', href: '/users', icon: '👥' },
  { key: 'console.forms', href: '/forms', icon: '📝' },
  { key: 'console.messages', href: '/messages', icon: '✉' },
  { key: 'console.audit', href: '/audit', icon: '📋' },
  { key: 'console.analytics', href: '/analytics', icon: '📊' },
  { key: 'console.aiAssistant', href: '/ai', icon: '🤖' },
  { key: 'console.settings', href: '/settings', icon: '⚙' },
];

export function Sidebar() {
  const t = useFormatMessage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-[#E8E3DB] bg-[#F9F7F4] transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo / Toggle */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#E8E3DB]">
        {!collapsed && (
          <span className="text-lg font-bold text-[#1A7A4A] tracking-tight">
            {t('console.title')}
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-[#E6F2EC] text-[#555550] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-lg">{collapsed ? '›' : '‹'}</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#E6F2EC] text-[#1A7A4A]'
                  : 'text-[#555550] hover:bg-[#F3EFE9] hover:text-[#2B2B2B]'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {!collapsed && <span>{t(item.key as any)}</span>}
            </a>
          );
        })}
      </nav>

      {/* Bottom */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-[#E8E3DB]">
          <div className="bg-[#E6F2EC] rounded-xl p-3">
            <p className="text-xs font-semibold text-[#1A7A4A] mb-1">AI Assistant</p>
            <p className="text-xs text-[#555550]">Ask questions about any report</p>
          </div>
        </div>
      )}
    </aside>
  );
}
