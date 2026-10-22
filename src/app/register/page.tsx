import type { Metadata } from 'next';
import { AuthPage } from '@/components/pages/AuthPage';
export const metadata: Metadata = { title: 'Create account' };
export default function Page() { return <AuthPage mode="register" />; }
