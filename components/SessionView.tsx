'use client';

import { useEffect, useMemo, useState } from 'react';
import { roleById, selectCurrent, useAgentStore } from '@/lib/store';
import WorkflowTimeline from './WorkflowTimeline';
import ChatInput from './ChatInput';
import MemoryPanel, { useMemory } from './MemoryPanel';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SessionViewProps {
  send: (sessionKey: string, text: string, roleId?: string, actionMode?: 'act' | 'advise') => void;
  abort: (sessionKey: string) => void;
}

export default function SessionView({ send, abort }: SessionViewProps) {
  const current = useAgentStore(selectCurrent);
  const roles = useAgentStore((s) => s.roles);
  const loadHistory = useAgentStore((s) => s.loadHistory);

  const role = useMemo(() => roleById(roles, current?.roleId), [roles, current?.roleId]);

  // Chat is only allowed for web sessions (or a freshly created one with no
  // events yet). CLI/Discord sessions are monitored read-only.
  const canChat = current?.channel === 'web' || current?.channel === 'unknown';

  const sessionKey = current?.sessionKey ?? null;

  // Rehydrate this session's chat history from disk (survives a page refresh).
  useEffect(() => {
    if (sessionKey) void loadHistory(sessionKey);
  }, [sessionKey, loadHistory]);

  // Refresh memory whenever a turn finishes (the agent may have called save_memory).
  const finishedTurns = current?.turns.filter((t) => !t.running).length ?? 0;
  const { memory, loading, reload } = useMemory(sessionKey, finishedTurns);

  // Mobile: memory is an off-canvas drawer. Close it when switching sessions.
  const [memoryOpen, setMemoryOpen] = useState(false);
  useEffect(() => setMemoryOpen(false), [sessionKey]);

  // A turn is in flight while its last entry is still marked running.
  const isRunning = current?.turns.some((t) => t.running) ?? false;
  // Latch the click so the button can't be spammed; reset once the turn actually ends.
  const [stopping, setStopping] = useState(false);
  useEffect(() => {
    if (!isRunning) setStopping(false);
  }, [isRunning, sessionKey]);

  // Per-session action mode (like plan/edit mode). Seeds from the role's
  // default on session switch; overrides the role default per turn.
  const [mode, setMode] = useState<'act' | 'advise'>('act');
  useEffect(() => setMode(role?.actionMode ?? 'act'), [sessionKey, role?.actionMode]);

  function onSend(key: string, text: string) {
    send(key, text, current?.roleId, mode);
  }

  if (!current) {
    return (
      <div className="grid flex-1 place-items-center text-center text-muted">
        <div>
          <h2 className="mb-1.5 text-foreground">Workflow monitor</h2>
          <p>Select a session, or start a web chat to drive the agent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-panel px-[22px] py-3 max-md:px-3.5">
          {role && (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold">
              <span className="text-base">{role.emoji ?? '🤖'}</span>
              {role.name}
            </span>
          )}
          <span className="break-all text-xs font-semibold text-muted">{current.sessionKey}</span>
          <span className="rounded-full bg-border px-2 py-px text-[11px] uppercase text-muted">
            {current.channel}
          </span>
          <button
            onClick={() => setMode((m) => (m === 'act' ? 'advise' : 'act'))}
            title="切換動作模式（唯諮詢時不會寫檔/shell/委派）"
            className={cn(
              'ml-auto rounded-md border px-2.5 py-0.5 text-xs',
              mode === 'advise'
                ? 'border-accent bg-[rgba(110,168,254,0.12)] text-accent'
                : 'border-border text-muted hover:border-accent',
            )}
          >
            {mode === 'advise' ? '🔵 唯諮詢' : '🟢 有動作'}
          </button>
          <span className="text-xs text-muted">{current.turns.length} turn(s)</span>
          <button
            className="rounded-sm border border-border bg-[var(--panel-2)] px-2.5 py-0.5 text-xs text-accent md:hidden"
            onClick={() => setMemoryOpen(true)}
          >
            Memory
          </button>
        </header>

        <WorkflowTimeline turns={current.turns} />

        {/* Only while a turn is actually running — a stop button on an idle session
            would just set a flag that the next message immediately trips over. */}
        {isRunning && (
          <div className="flex items-center gap-2 border-t border-border bg-panel px-[22px] py-2">
            <button
              className="rounded-sm border border-border bg-[var(--panel-2)] px-2.5 py-1 text-xs text-accent hover:bg-border disabled:opacity-50"
              onClick={() => {
                abort(current.sessionKey);
                setStopping(true);
              }}
              disabled={stopping}
            >
              {stopping ? '停止中…' : '■ 停止這一輪'}
            </button>
            <span className="text-[11px] text-muted">
              {stopping ? '等目前這個工具跑完就會停下來' : '會在下一個安全點停止，過程會保留'}
            </span>
          </div>
        )}

        {canChat ? (
          <ChatInput sessionKey={current.sessionKey} onSend={onSend} />
        ) : (
          <div className="border-t border-border bg-panel px-[22px] py-3.5 text-[13px] text-muted">
            Read-only — monitoring {current.channel} session
          </div>
        )}
      </div>

      {/* Desktop: memory is a static right-hand column. */}
      <div className="hidden w-[300px] border-l border-border md:flex">
        <MemoryPanel
          memory={memory}
          loading={loading}
          reload={reload}
          canRefresh={!!sessionKey}
          className="w-full"
        />
      </div>

      {/* Mobile: memory becomes a right-side drawer. */}
      <Sheet open={memoryOpen} onOpenChange={setMemoryOpen}>
        <SheetContent side="right" className="w-[85%] max-w-[340px] md:hidden">
          <SheetTitle className="sr-only">Memory</SheetTitle>
          <MemoryPanel
            memory={memory}
            loading={loading}
            reload={reload}
            canRefresh={!!sessionKey}
            showClose
            onClose={() => setMemoryOpen(false)}
            className="h-full"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
