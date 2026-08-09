'use client';

import type { Turn } from '@/lib/types';
import ToolCallCard from './ToolCallCard';
import DispatchCard from './DispatchCard';
import DelegateCard from './DelegateCard';

const time = (ts: number) => new Date(ts).toLocaleTimeString();

export default function WorkflowTimeline({ turns }: { turns: Turn[] }) {
  return (
    <div className="flex flex-1 flex-col gap-[22px] overflow-y-auto px-[22px] py-[18px]">
      {turns.length === 0 && (
        <p className="mt-10 text-center text-muted">
          No activity yet. Watch the agent loop appear here in real time.
        </p>
      )}

      {turns.map((turn, ti) => (
        <section key={ti} className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2.5 rounded-lg bg-[var(--panel-2)] px-3.5 py-2.5">
            <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted">user</span>
            <span className="whitespace-pre-wrap break-words">{turn.userText}</span>
            <span className="ml-auto shrink-0 text-[11px] text-muted">{time(turn.startedAt)}</span>
          </div>

          <ol className="flex flex-col gap-3.5 border-l-2 border-border pl-3.5">
            {turn.iterations.map((it) => (
              <li key={it.iteration} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
                    loop {it.iteration}
                  </span>
                  {it.tools.length ? (
                    <span className="text-[11px] text-muted">{it.tools.length} tool call(s)</span>
                  ) : (
                    <span className="text-[11px] text-muted">reasoning</span>
                  )}
                </div>
                {it.content && (
                  <p className="whitespace-pre-wrap break-words text-[13px] text-foreground">{it.content}</p>
                )}
                <div className="flex flex-col gap-2">
                  {it.tools.map((t, idx) => (
                    <ToolCallCard key={idx} tool={t} />
                  ))}
                </div>
              </li>
            ))}
          </ol>

          {turn.dispatches.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {turn.dispatches.map((d) => (
                <DispatchCard key={d.taskId} step={d} />
              ))}
            </div>
          )}

          {turn.delegates.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {turn.delegates.map((d) => (
                <DelegateCard key={d.taskId} step={d} />
              ))}
            </div>
          )}

          {turn.running ? (
            <div className="flex items-center gap-2 text-[13px] text-amber">
              <span className="h-3 w-3 animate-spin-slow rounded-full border-2 border-amber border-t-transparent" />
              {(() => {
                const active = turn.delegates.find((d) => d.running);
                return active ? `${active.toRoleName} 執行中…（受委派）` : 'agent is working…';
              })()}
            </div>
          ) : (
            turn.finalText && (
              <div className="flex items-baseline gap-2.5 rounded-lg border border-[rgba(110,168,254,0.25)] bg-[rgba(110,168,254,0.08)] px-3.5 py-2.5">
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-accent">agent</span>
                <span className="whitespace-pre-wrap break-words">{turn.finalText}</span>
              </div>
            )
          )}
        </section>
      ))}
    </div>
  );
}
