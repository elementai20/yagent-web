'use client';

import { useState } from 'react';
import { useAgentStore } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (used: number, limit: number) => (limit > 0 ? Math.min(100, (used / limit) * 100) : 0);

/**
 * Compact budget view for the sidebar: total spend + per-budget progress bars,
 * with the keys/subscriptions breakdown tucked into a collapsible.
 */
export default function BudgetPanel() {
  const usage = useAgentStore((s) => s.usage);
  const [detailOpen, setDetailOpen] = useState(false);

  const totalSpend = usage?.summary.totalUSD ?? 0;
  const budgets = usage?.budgets ?? [];
  const keys = usage?.keys ?? [];

  return (
    <div className="flex flex-col gap-3 px-2 pb-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">Spend (30d)</span>
        <strong className="tabular-nums">{money(totalSpend)}</strong>
      </div>

      {budgets.map((b) => (
        <div key={b.budget.id} className="flex flex-col gap-1">
          <div className="flex justify-between text-[12px]">
            <span className="capitalize text-muted">
              {b.budget.scope}
              {b.budget.match ? ` · ${b.budget.match}` : ''}
            </span>
            <span className={cn('tabular-nums text-muted', b.exceeded && 'text-danger')}>
              {money(b.usedUSD)} / {money(b.limitUSD)}
            </span>
          </div>
          <Progress
            value={pct(b.usedUSD, b.limitUSD)}
            indicatorClassName={b.exceeded ? 'bg-danger' : undefined}
          />
        </div>
      ))}
      {budgets.length === 0 && <p className="text-[12px] text-muted">No budgets set.</p>}

      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-[11px] uppercase tracking-wide text-muted hover:text-accent">
          <span>Subscriptions / keys</span>
          <span className={cn('transition-transform', detailOpen && 'rotate-90')}>›</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex justify-between rounded-md border border-border bg-panel px-2.5 py-1.5 text-[12px]"
              >
                <span>{k.label}</span>
                <span className="tabular-nums text-muted">{money(usage?.summary.byKey[k.id] ?? 0)}</span>
              </li>
            ))}
            {keys.length === 0 && (
              <li className="text-[12px] text-muted">
                Configure in <code>billing.json</code>.
              </li>
            )}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
