import type { Metadata } from 'next';
import { LeaguesPage } from '@/components/pages/LeaguesPage';
export const metadata: Metadata = { title: 'Leagues' };
export default function Page() { return <LeaguesPage />; }
