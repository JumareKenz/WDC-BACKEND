'use client';

import { useState, useRef, useEffect } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { mockAiConversation, mockAiCapabilities, mockRecentPrompts, type AiMessage } from '../../src/lib/mock-data-tables';

function ChatMessage({ msg, t }: { msg: AiMessage; t: (key: string) => string }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isUser ? 'bg-[#1A7A4A] text-white' : 'bg-[#EEE7F5] text-[#3D1A5C]'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#1A7A4A] text-white rounded-tr-sm'
              : 'bg-[#F3EFE9] text-[#2B2B2B] rounded-tl-sm border border-[#E8E3DB]'
          }`}
        >
          {msg.content}
        </div>

        {/* Citations */}
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.citations.map((c) => (
              <a
                key={c.id}
                href={c.type === 'report' ? `/review/${c.id}` : c.type === 'investigation' ? `/investigations/${c.id}` : `/forms/${c.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8E3DB] text-xs text-[#555550] hover:bg-[#F9F7F4] transition-colors"
              >
                <span className="text-[10px] uppercase font-semibold text-[#1A7A4A]">
                  {t(`ai.citation.${c.type}` as any)}
                </span>
                <span className="truncate max-w-[200px]">{c.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.actions.map((a, i) => (
              <a
                key={i}
                href={a.href}
                className="inline-flex px-3 py-1.5 rounded-lg bg-[#E6F2EC] text-[#1A7A4A] text-xs font-semibold hover:bg-[#1A7A4A] hover:text-white transition-colors"
              >
                {t(a.label as any)}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const t = useFormatMessage();
  const [messages, setMessages] = useState<AiMessage[]>(mockAiConversation);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: AiMessage = {
      id: `ai-msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Mock assistant response
    setTimeout(() => {
      const assistantMsg: AiMessage = {
        id: `ai-msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'I have analyzed the data. Here is a summary of the key findings and recommended next steps.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setThinking(false);
    }, 1500);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden flex">
          {/* Conversation */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} t={t} />
              ))}
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EEE7F5] text-[#3D1A5C] flex items-center justify-center text-xs font-bold">AI</div>
                  <div className="bg-[#F3EFE9] border border-[#E8E3DB] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#555550]">
                    {t('ai.thinking' as any)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#E8E3DB] bg-white">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={t('ai.placeholder' as any)}
                  className="flex-1 px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="px-5 py-3 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('ai.send' as any)}
                </button>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="w-72 border-l border-[#E8E3DB] bg-[#F9F7F4] p-4 overflow-y-auto hidden lg:block">
            {/* Capabilities */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#2B2B2B] mb-3">{t('ai.capabilities' as any)}</h3>
              <div className="space-y-2">
                {mockAiCapabilities.map((cap) => (
                  <button
                    key={cap.key}
                    onClick={() => {
                      setInput(t(cap.key as any));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E8E3DB] text-sm text-[#2B2B2B] hover:bg-[#E6F2EC] hover:border-[#1A7A4A] transition-colors text-left"
                  >
                    <span>{cap.icon}</span>
                    <span>{t(cap.key as any)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent prompts */}
            <div>
              <h3 className="text-sm font-bold text-[#2B2B2B] mb-3">{t('ai.recentPrompts' as any)}</h3>
              <div className="space-y-2">
                {mockRecentPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-white border border-[#E8E3DB] text-xs text-[#555550] hover:bg-[#F3EFE9] transition-colors truncate"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
