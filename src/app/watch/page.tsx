import type { Metadata } from 'next';
import { WatchHub } from '@/components/pages/WatchHub';
export const metadata: Metadata = { title: 'Watch live' };
export default function Page() { return <WatchHub />; }
