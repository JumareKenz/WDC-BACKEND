'use client';

import { useState } from 'react';
import { useFormatMessage } from '@wdc/i18n';
import { mockLgas } from '../lib/mock-lgas';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AssignSecretaryModal({ open, onClose }: Props) {
  const t = useFormatMessage();
  const [lgaId, setLgaId] = useState('');
  const [ward, setWard] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const selectedLga = mockLgas.find((l) => l.id === lgaId);
  const wards = selectedLga ? selectedLga.wards : [];

  const handleSubmit = () => {
    if (!lgaId || !ward || !name || !phone) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setLgaId('');
      setWard('');
      setName('');
      setPhone('');
      setEmail('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E3DB] shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#2B2B2B]">{t('assignSecretary.title' as any)}</h2>
          <button
            onClick={onClose}
            className="text-[#999] hover:text-[#2B2B2B] text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E6F2EC] text-[#1A7A4A] flex items-center justify-center mx-auto mb-3 text-xl">
              ✓
            </div>
            <p className="text-sm font-medium text-[#2B2B2B]">{t('assignSecretary.success' as any)}</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                {t('assignSecretary.selectLga' as any)}
              </label>
              <select
                value={lgaId}
                onChange={(e) => {
                  setLgaId(e.target.value);
                  setWard('');
                }}
                className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
              >
                <option value="">—</option>
                {mockLgas.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                {t('assignSecretary.selectWard' as any)}
              </label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                disabled={!lgaId}
                className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] disabled:opacity-50"
              >
                <option value="">—</option>
                {wards.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                {t('assignSecretary.name' as any)}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                placeholder="e.g. Aisha Bello"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                {t('assignSecretary.phone' as any)}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                placeholder="0800 000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                {t('assignSecretary.email' as any)}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                placeholder="optional@email.com"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!lgaId || !ward || !name || !phone}
              className="w-full py-3 bg-[#1A7A4A] text-white font-semibold rounded-xl hover:bg-[#135A37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('assignSecretary.confirm' as any)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
