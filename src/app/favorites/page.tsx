import type { Metadata } from 'next';
import { Favorites } from '@/components/pages/Favorites';
export const metadata: Metadata = { title: 'Favorites' };
export default function Page() { return <Favorites />; }
