import Link from 'next/link';
export default function NotFound() {
  return <div className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center"><p className="font-display text-7xl font-extrabold text-primary">404</p><h1 className="mt-3 text-2xl font-extrabold">Offside! This page doesn&apos;t exist.</h1><p className="mt-2 text-muted">The page you are looking for was moved or never existed.</p><Link href="/scores" className="btn-primary mt-6">Back to live scores</Link></div>;
}
