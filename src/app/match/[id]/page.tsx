'use client';
import { useParams } from 'next/navigation';
import { MatchPage } from '@/components/match/MatchPage';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <MatchPage id={decodeURIComponent(id)} />;
}
