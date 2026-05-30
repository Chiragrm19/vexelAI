import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Vexel — AI Token Governance Platform',
  description:
    'Enterprise platform to track, control, and optimize AI token usage. Reduce AI costs by 80% via quota enforcement, semantic caching, and intelligent model routing.',
  keywords: 'AI governance, token tracking, LLM cost optimization, enterprise AI',
  openGraph: {
    title: 'Vexel',
    description: 'Enterprise AI Token Governance Platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} animated-bg min-h-screen antialiased`} style={{ fontFamily: 'var(--font-inter), -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}

