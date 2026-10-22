'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '../Shell';
import { useAuth } from '../Providers';

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode };
// Defined at module level so it keeps the same identity between renders (otherwise the input remounts and loses focus after each keystroke)
function Field({ icon, ...p }: FieldProps) {
  return (
    <label className="relative block"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">{icon}</span><input {...p} className="input !pl-10" /></label>
  );
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const go = async (fn: () => Promise<unknown>) => {
    setErr(''); setBusy(true);
    try { await fn(); router.push('/favorites'); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); void go(() => (isLogin ? login(email, password) : register(name, email, password))); };

  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{ background: 'radial-gradient(50% 60% at 15% 10%, rgb(var(--primary)/.18), transparent 70%), radial-gradient(45% 55% at 90% 90%, rgb(var(--accent)/.16), transparent 70%)' }} />
      <div className="card w-full max-w-md animate-rise p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center"><Link href="/"><Logo size={34} /></Link>
          <h1 className="mt-2 text-2xl font-extrabold">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-sm text-muted">{isLogin ? 'Sign in to follow teams and get goal alerts.' : 'Free forever. Follow teams, get alerts, save favourites.'}</p></div>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {!isLogin && <Field icon={<User size={16} />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" required aria-label="Full name" />}
          <Field icon={<Mail size={16} />} type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required aria-label="Email" />
          <div className="relative"><Field icon={<Lock size={16} />} type={show ? 'text' : 'password'} spellCheck={false} autoCapitalize="none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? 'Password' : 'Password (8+ characters)'} autoComplete={isLogin ? 'current-password' : 'new-password'} required aria-label="Password" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          {err && <p role="alert" className="rounded-md border border-live/30 bg-live/10 px-3 py-2 text-sm font-medium text-live">{err}</p>}
          <button className="btn-primary w-full" disabled={busy || !email || password.length < (isLogin ? 1 : 8) || (!isLogin && name.trim().length < 2)}>{busy && <Loader2 size={16} className="animate-spin" />}{isLogin ? 'Sign in' : 'Create account'}</button>
        </form>
        {isLogin && (
          <div className="mt-5 rounded-lg border border-dashed border-line bg-surface-2 p-3">
            <p className="label-sm mb-2">Try the demo</p>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={() => void go(() => login('demo@livekick.dev', 'Demo1234!'))} className="btn-ghost !py-2 text-[13px]">Demo fan</button>
              <button disabled={busy} onClick={() => void go(() => login('admin@livekick.dev', 'Admin1234!'))} className="btn-ghost !py-2 text-[13px]">Admin</button>
            </div>
            <p className="mt-2 text-[11.5px] text-faint">{api.mode === 'demo' ? 'Accounts are stored in your browser only.' : 'Connected to the LiveKick API.'}</p>
          </div>
        )}
        <p className="mt-6 text-center text-sm text-muted">{isLogin ? 'New here? ' : 'Already have an account? '}<Link href={isLogin ? '/register' : '/login'} className="font-bold text-primary hover:underline">{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
      </div>
    </div>
  );
}
