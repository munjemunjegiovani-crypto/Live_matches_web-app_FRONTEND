import type { Metadata } from 'next';
import { Admin } from '@/components/pages/Admin';
export const metadata: Metadata = { title: 'Admin console' };
export default function Page() { return <Admin />; }
