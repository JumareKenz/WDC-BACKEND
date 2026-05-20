'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim() || !totp.trim()) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);

    // Simulate login delay
    setTimeout(() => {
      // In production: call api.auth.signInConsole
      setIsSubmitting(false);
      router.push('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E3DB] p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E6F2EC] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">◆</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">State Console</h1>
          <p className="text-sm text-[#555550] mt-1">Kaduna State Digital Reporting Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#F7E0DD] text-[#C0392B] text-sm rounded-xl border border-[#C0392B] border-opacity-20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="director@kdsg.gov.ng"
              className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] focus:border-transparent"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] focus:border-transparent"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">TOTP Code</label>
            <input
              type="text"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] focus:border-transparent tracking-widest"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#1A7A4A] text-white font-semibold rounded-xl hover:bg-[#135A37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-[#999]">
          State Director access only. Contact IT if you need credentials.
        </p>
      </div>
    </div>
  );
}
