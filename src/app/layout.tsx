import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppShell } from '@/components/Shell';

export const metadata: Metadata = {
  title: { default: 'Scorely: live scores for every game', template: '%s · Scorely' },
  description: 'Real-time scores, match centre, standings and history for football, basketball, tennis, cricket and rugby. Demo project with simulated data.',
  icons: { icon: '/icon.svg' },
  openGraph: { title: 'Scorely: live scores for every game', description: 'Real-time scores, match centre, standings and history across five sports.', type: 'website' },
};
export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0d1321' }, { media: '(prefers-color-scheme: light)', color: '#f6f8fc' }], width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
