'use client';
import { useParams } from 'next/navigation';
import { TeamPage } from '@/components/pages/TeamPage';
export default function Page() { const { id } = useParams<{ id: string }>(); return <TeamPage id={id} />; }
