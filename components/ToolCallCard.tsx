'use client';

import { useState } from 'react';
import type { ToolStep } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const pretty = (v: unknown) => {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

export default function ToolCallCard({ tool }: { tool: ToolStep }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(tool.args ?? {});
  const argSummary = keys.length ? keys.join(', ') : '—';
  const pending = tool.result === undefined;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'overflow-hidden rounded-md border border-border bg-panel border-l-[3px]',
        pending ? 'border-l-amber' : 'border-l-tool',
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground">
        <span className="w-3 text-muted">{open ? '▾' : '▸'}</span>
        <span className="font-semibold text-tool font-mono">{tool.name}</span>
        <span className="text-xs text-muted">({argSummary})</span>
        {pending ? (
          <span className="ml-auto rounded-full px-2 py-px text-[11px] text-amber">running…</span>
        ) : (
          <span className="ml-auto rounded-full px-2 py-px text-[11px] text-green">done</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 px-3 pb-2.5">
        <div>
          <span className="text-[11px] uppercase tracking-wide text-muted">args</span>
          <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--bg)] px-2.5 py-2 text-xs">
            {pretty(tool.args)}
          </pre>
        </div>
        {tool.result !== undefined && (
          <div>
            <span className="text-[11px] uppercase tracking-wide text-muted">result</span>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--bg)] px-2.5 py-2 text-xs">
              {tool.result}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
