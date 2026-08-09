'use client';

import { useMemo } from 'react';
import { useAgentStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const badgeColor = (ch: string) =>
  ch === 'web' ? 'text-accent' : ch === 'discord' ? 'text-tool' : ch === 'cli' ? 'text-green' : 'text-muted';

export default function SessionList({ onSelect }: { onSelect?: () => void }) {
  const sessions = useAgentStore((s) => s.sessions);
  const selected = useAgentStore((s) => s.selected);
  const select = useAgentStore((s) => s.select);
  const sessionList = useMemo(
    () => Object.values(sessions).sort((a, b) => b.lastActivity - a.lastActivity),
    [sessions],
  );

  function pick(key: string) {
    select(key);
    onSelect?.(); // lets the parent close the mobile drawer
  }

  return (
    <nav className="flex-1 overflow-y-auto p-2">
      <button
        className="mb-2 w-full rounded-md border border-border bg-[var(--panel-2)] px-3 py-2.5 font-semibold text-accent hover:border-accent"
        onClick={() => pick('web')}
      >
        ＋ New web chat
      </button>
      {sessionList.length === 0 && (
        <p className="p-3 text-[13px] text-muted">No sessions yet. Send a message to begin.</p>
      )}
      {sessionList.map((s) => (
        <button
          key={s.sessionKey}
          onClick={() => pick(s.sessionKey)}
          className={cn(
            'flex w-full flex-col gap-1.5 rounded-md border border-transparent px-3 py-2.5 text-left text-foreground hover:bg-[var(--panel-2)]',
            s.sessionKey === selected && 'border-accent bg-[var(--panel-2)]',
          )}
        >
          <span className="break-all text-[13px] font-semibold">{s.sessionKey}</span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full bg-border px-1.5 py-px text-[11px] uppercase tracking-wide',
                badgeColor(s.channel),
              )}
            >
              {s.channel}
            </span>
            {s.turns.some((t) => t.running) && (
              <span className="text-[11px] text-green">●&nbsp;live</span>
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}
