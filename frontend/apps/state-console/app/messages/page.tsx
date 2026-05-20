'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { DataTable } from '../../src/components/DataTable';
import { mockBroadcasts, type BroadcastRow } from '../../src/lib/mock-data-tables';

export default function MessagesPage() {
  const t = useFormatMessage();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [sent, setSent] = useState(false);

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim() || channels.length === 0) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSubject('');
      setBody('');
      setChannels(['in_app']);
    }, 1500);
  };

  const columns = [
    {
      key: 'subject',
      header: t('messages.subject' as any),
      accessor: (row: BroadcastRow) => <span className="font-medium text-[#2B2B2B]">{row.subject}</span>,
      sortable: true,
      sortFn: (a: BroadcastRow, b: BroadcastRow) => a.subject.localeCompare(b.subject),
    },
    {
      key: 'channels',
      header: t('messages.channels' as any),
      accessor: (row: BroadcastRow) => (
        <div className="flex gap-1">
          {row.channels.map((c) => (
            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-[#E6F2EC] text-[#1A7A4A] uppercase font-semibold">
              {c}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'recipients',
      header: t('messages.columns.recipients' as any),
      accessor: (row: BroadcastRow) => <span className="font-mono text-xs">{row.recipientCount}</span>,
    },
    {
      key: 'sentAt',
      header: t('messages.columns.sentAt' as any),
      accessor: (row: BroadcastRow) => row.sentAt.split('T')[0],
      sortable: true,
      sortFn: (a: BroadcastRow, b: BroadcastRow) => a.sentAt.localeCompare(b.sentAt),
    },
    {
      key: 'status',
      header: t('messages.columns.status' as any),
      accessor: (row: BroadcastRow) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
          row.status === 'delivered' ? 'bg-[#E6F2EC] text-[#1A7A4A]' :
          row.status === 'pending' ? 'bg-[#FDEBD8] text-[#E8730A]' :
          'bg-[#F7E0DD] text-[#C0392B]'
        }`}>
          {row.status}
        </span>
      ),
    },
  ];

  const channelOptions = [
    { key: 'in_app', labelKey: 'messages.channel.inApp' },
    { key: 'email', labelKey: 'messages.channel.email' },
    { key: 'sms', labelKey: 'messages.channel.sms' },
    { key: 'whatsapp', labelKey: 'messages.channel.whatsapp' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-[#2B2B2B]">{t('console.messages' as any)}</h1>

            {/* Composer */}
            <div className="bg-white rounded-2xl border border-[#E8E3DB] p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#2B2B2B]">{t('messages.newBroadcast' as any)}</h2>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">{t('messages.subject' as any)}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                  placeholder="Enter subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">{t('messages.body' as any)}</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] resize-none"
                  placeholder="Enter message body..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">{t('messages.channels' as any)}</label>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map((ch) => (
                    <button
                      key={ch.key}
                      onClick={() => toggleChannel(ch.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        channels.includes(ch.key)
                          ? 'bg-[#1A7A4A] text-white'
                          : 'bg-white text-[#555550] border border-[#E8E3DB] hover:bg-[#F9F7F4]'
                      }`}
                    >
                      {t(ch.labelKey as any)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSend}
                  disabled={!subject.trim() || !body.trim() || channels.length === 0}
                  className="px-5 py-2.5 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sent ? t('messages.sent' as any) : t('messages.send' as any)}
                </button>
                {sent && (
                  <span className="text-sm text-[#1A7A4A] font-medium">✓ {t('messages.sent' as any)}</span>
                )}
              </div>
            </div>

            {/* History */}
            <div>
              <h2 className="text-lg font-semibold text-[#2B2B2B] mb-4">{t('messages.history' as any)}</h2>
              <DataTable
                columns={columns}
                data={mockBroadcasts}
                rowKey={(row) => row.id}
                emptyMessage="No broadcasts yet"
                totalMessage={t('submissions.total' as any)}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
