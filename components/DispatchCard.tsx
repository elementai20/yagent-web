'use client';

import type { DispatchStep } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DispatchCard({ step }: { step: DispatchStep }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3',
        step.isError
          ? 'border-[rgba(229,72,77,0.4)] bg-[rgba(229,72,77,0.06)]'
          : 'border-[rgba(186,140,255,0.35)] bg-[rgba(186,140,255,0.06)]',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#ba8cff]">
          delegate → {step.agent}
        </span>
        {step.running ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber">
            <span className="h-[11px] w-[11px] animate-spin-slow rounded-full border-2 border-amber border-t-transparent" />
            running
          </span>
        ) : step.isError ? (
          <span className="text-[11px] text-[#e5484d]">error</span>
        ) : (
          <span className="text-[11px] text-green">done</span>
        )}
        {step.costUSD != null && (
          <span className="ml-auto text-[11px] tabular-nums text-muted">${step.costUSD.toFixed(4)}</span>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words text-[13px] text-foreground">{step.task}</p>
      {step.lines.length > 0 && (
        <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-[var(--bg)] px-2.5 py-2 text-xs leading-relaxed text-muted">
          {step.lines.join('\n')}
        </pre>
      )}
      {step.summary && (
        <div className="flex items-baseline gap-2.5 rounded-md border border-[rgba(110,168,254,0.25)] bg-[rgba(110,168,254,0.08)] px-2.5 py-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-accent">result</span>
          <span className="whitespace-pre-wrap break-words text-[13px]">{step.summary}</span>
        </div>
      )}
    </div>
  );
}
