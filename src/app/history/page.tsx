import type { Metadata } from 'next';
import { HistoryPage } from '@/components/pages/HistoryPage';
export const metadata: Metadata = { title: 'Matches & history' };
export default function Page() { return <HistoryPage />; }
