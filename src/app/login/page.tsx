import type { Metadata } from 'next';
import { AuthPage } from '@/components/pages/AuthPage';
export const metadata: Metadata = { title: 'Sign in' };
export default function Page() { return <AuthPage mode="login" />; }
