import type { Metadata } from 'next';
import { Scoreboard } from '@/components/Scoreboard';

export const metadata: Metadata = { title: 'Live scores' };
export default function Page() { return <Scoreboard />; }
