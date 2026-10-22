import type { Metadata } from 'next';
import { Alerts } from '@/components/pages/Alerts';
export const metadata: Metadata = { title: 'Alerts' };
export default function Page() { return <Alerts />; }
