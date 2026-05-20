'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';

type SettingsTab = 'general' | 'notifications' | 'security' | 'language';

export default function SettingsPage() {
  const t = useFormatMessage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);

  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  const tabs: Array<{ key: SettingsTab; labelKey: string }> = [
    { key: 'general', labelKey: 'settings.general' },
    { key: 'notifications', labelKey: 'settings.notifications' },
    { key: 'security', labelKey: 'settings.security' },
    { key: 'language', labelKey: 'settings.language' },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('settings.title' as any)}</h1>

            {/* Sub-nav */}
            <div className="flex gap-2 border-b border-[#E8E3DB] pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                    activeTab === tab.key
                      ? 'border-[#1A7A4A] text-[#1A7A4A]'
                      : 'border-transparent text-[#555550] hover:text-[#2B2B2B]'
                  }`}
                >
                  {t(tab.labelKey as any)}
                </button>
              ))}
            </div>

            {/* General */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-2">{t('settings.theme' as any)}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        theme === 'light'
                          ? 'bg-[#1A7A4A] text-white border-[#1A7A4A]'
                          : 'bg-white text-[#555550] border-[#E8E3DB] hover:bg-[#F9F7F4]'
                      }`}
                    >
                      {t('settings.theme.light' as any)}
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        theme === 'dark'
                          ? 'bg-[#1A7A4A] text-white border-[#1A7A4A]'
                          : 'bg-white text-[#555550] border-[#E8E3DB] hover:bg-[#F9F7F4]'
                      }`}
                    >
                      {t('settings.theme.dark' as any)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#2B2B2B]">Email Notifications</p>
                    <p className="text-xs text-[#999]">Receive updates via email</p>
                  </div>
                  <button
                    onClick={() => setEmailNotifs(!emailNotifs)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      emailNotifs ? 'bg-[#1A7A4A]' : 'bg-[#E8E3DB]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        emailNotifs ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#2B2B2B]">SMS Notifications</p>
                    <p className="text-xs text-[#999]">Receive critical alerts via SMS</p>
                  </div>
                  <button
                    onClick={() => setSmsNotifs(!smsNotifs)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      smsNotifs ? 'bg-[#1A7A4A]' : 'bg-[#E8E3DB]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        smsNotifs ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Language */}
            {activeTab === 'language' && (
              <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-2">{t('settings.language' as any)}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        language === 'en'
                          ? 'bg-[#1A7A4A] text-white border-[#1A7A4A]'
                          : 'bg-white text-[#555550] border-[#E8E3DB] hover:bg-[#F9F7F4]'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('ha')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        language === 'ha'
                          ? 'bg-[#1A7A4A] text-white border-[#1A7A4A]'
                          : 'bg-white text-[#555550] border-[#E8E3DB] hover:bg-[#F9F7F4]'
                      }`}
                    >
                      Hausa
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors"
              >
                {t('settings.save' as any)}
              </button>
              {saved && (
                <span className="text-sm text-[#1A7A4A] font-medium">✓ {t('settings.saved' as any)}</span>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
