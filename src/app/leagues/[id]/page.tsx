'use client';
import { useParams } from 'next/navigation';
import { LeagueDetail } from '@/components/pages/LeagueDetail';
export default function Page() { const { id } = useParams<{ id: string }>(); return <LeagueDetail id={id} />; }
