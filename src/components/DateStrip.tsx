'use client';
import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DAY_MS, cn, dayLabel, startOfDay } from '@/lib/format';

export function DateStrip({ value, onChange, counts, liveToday, range = 3 }: { value: number; onChange: (d: number) => void; counts?: Record<number, number>; liveToday?: number; range?: number }) {
  const today = startOfDay(Date.now());
  const days = Array.from({ length: range * 2 + 1 }, (_, i) => today + (i - range) * DAY_MS);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('[aria-current="date"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [value]);
  const step = (n: number) => onChange(value + n * DAY_MS);
  return (
    <div className="flex items-center gap-2">
      <button aria-label="Previous day" onClick={() => step(-1)} className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink sm:grid"><ChevronLeft size={18} /></button>
      <div ref={ref} className="hide-scroll -mx-4 flex flex-1 gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Choose a day">
        {days.map((d) => {
          const on = d === value;
          const dt = new Date(d);
          const isToday = d === today;
          return (
            <button key={d} role="tab" aria-selected={on} aria-current={on ? 'date' : undefined} onClick={() => onChange(d)}
              className={cn('relative min-w-[84px] flex-1 rounded-lg border px-3 py-2.5 text-center transition-all', on ? 'border-transparent bg-gradient-to-br from-primary to-accent text-on-primary shadow-card' : 'border-line bg-surface text-muted hover:border-faint hover:text-ink')}>
              <p className={cn('text-[10.5px] font-bold uppercase tracking-wider', on ? 'text-on-primary/80' : 'text-faint')}>{dayLabel(d)}</p>
              <p className="num font-display text-[17px] font-extrabold leading-tight">{dt.getDate()} <span className="text-sm font-bold">{dt.toLocaleDateString([], { month: 'short' })}</span></p>
              <p className={cn('num text-[11px] font-semibold', on ? 'text-on-primary/85' : 'text-faint')}>
                {isToday && liveToday ? <span className="inline-flex items-center gap-1"><span className={cn('h-1.5 w-1.5 animate-pulse-dot rounded-full', on ? 'bg-white' : 'bg-live')} />{liveToday} live</span> : counts?.[d] !== undefined ? `${counts[d]} games` : ' '}
              </p>
            </button>
          );
        })}
      </div>
      <button aria-label="Next day" onClick={() => step(1)} className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink sm:grid"><ChevronRight size={18} /></button>
    </div>
  );
}
