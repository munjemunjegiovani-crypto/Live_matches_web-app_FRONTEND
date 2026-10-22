'use client';
import { Star } from 'lucide-react';
import type { FavKind } from '@/lib/api';
import { cn } from '@/lib/format';
import { useAuth } from './Providers';

export function FavButton({ kind, id, size = 18, className = '', label }: { kind: FavKind; id: string; size?: number; className?: string; label?: string }) {
  const { isFav, toggleFav } = useAuth();
  const on = isFav(kind, id);
  return (
    <button
      aria-label={on ? `Unfollow ${label ?? kind}` : `Follow ${label ?? kind}`}
      aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleFav(kind, id); }}
      className={cn('grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-surface-3', on ? 'text-accent' : 'text-faint hover:text-ink', className)}
    >
      <Star size={size} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
