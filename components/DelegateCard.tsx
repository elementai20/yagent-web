'use client';

import type { DelegateStep } from '@/lib/types';
import { useAgentStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function DelegateCard({ step }: { step: DelegateStep }) {
  const select = useAgentStore((s) => s.select);
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3',
        step.isError
          ? 'border-[rgba(229,72,77,0.4)] bg-[rgba(229,72,77,0.06)]'
          : 'border-[rgba(110,168,254,0.35)] bg-[rgba(110,168,254,0.06)]',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
          delegate → {step.toRoleName}
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
      </div>
      <p className="whitespace-pre-wrap break-words text-[13px] text-foreground">{step.task}</p>
      {step.lines.length > 0 && (
        <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-[var(--bg)] px-2.5 py-2 text-xs leading-relaxed text-muted">
          {step.lines.join('\n')}
        </pre>
      )}
      {step.result && (
        <div className="flex items-baseline gap-2.5 rounded-md border border-[rgba(110,168,254,0.25)] bg-[rgba(110,168,254,0.08)] px-2.5 py-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-accent">{step.toRoleName}</span>
          <span className="whitespace-pre-wrap break-words text-[13px]">{step.result}</span>
        </div>
      )}
      {step.subSessionKey && (
        <button
          onClick={() => select(step.subSessionKey)}
          className="self-start text-[12px] font-semibold text-accent hover:underline"
        >
          查看 {step.toRoleName} 的完整工作 →
        </button>
      )}
    </div>
  );
}
