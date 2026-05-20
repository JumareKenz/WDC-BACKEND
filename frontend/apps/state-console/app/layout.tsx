import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from './providers';
import { LocaleProvider } from './locale-provider';

export const metadata: Metadata = {
  title: 'WDC State Console',
  description: 'Kaduna State Digital Reporting Platform — State Console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F9F7F4] text-[#2B2B2B] antialiased">
        <LocaleProvider>
          <QueryProvider>{children}</QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
