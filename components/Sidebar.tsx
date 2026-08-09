'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { useAgentStore, selectActiveRoleIds } from '@/lib/store';
import type { Role } from '@/lib/types';
import SessionList from './SessionList';
import BudgetPanel from './BudgetPanel';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Workflow cards are a recorded-but-deferred concept (node-graph designer).
const workflows = [
  { id: 'marketing-workflow', name: 'Marketing', emoji: '📣' },
  { id: 'engineering-workflow', name: 'Engineering', emoji: '⚙️' },
  { id: 'todo-result', name: 'TodoResult', emoji: '✅' },
  { id: 'analyze-report', name: 'AnalyzeReport', emoji: '📊' },
];

/** One collapsible sidebar section with an uppercase header. */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b border-border">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-foreground">
        <span>{title}</span>
        <span className="transition-transform group-data-[state=open]:rotate-90">›</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

interface SidebarProps {
  connected: boolean;
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

/**
 * Persistent left navigation: Sessions / Virtual company / Budget & spend /
 * Settings. Shared by the desktop static column and the mobile drawer.
 */
export default function Sidebar({ connected, onNavigate }: SidebarProps) {
  const roles = useAgentStore((s) => s.roles);
  const openRole = useAgentStore((s) => s.openRole);
  const showSettings = useAgentStore((s) => s.showSettings);
  const showHome = useAgentStore((s) => s.showHome);
  const showMonitor = useAgentStore((s) => s.showMonitor);
  const showGeo = useAgentStore((s) => s.showGeo);
  const showRooms = useAgentStore((s) => s.showRooms);
  const rooms = useAgentStore((s) => s.rooms);
  const activeRoomId = useAgentStore((s) => s.activeRoomId);
  const roomRound = useAgentStore((s) => s.roomRound);
  const createRoom = useAgentStore((s) => s.createRoom);
  const loadRooms = useAgentStore((s) => s.loadRooms);
  const view = useAgentStore((s) => s.view);
  const loadMonitor = useAgentStore((s) => s.loadMonitor);
  const monitorToday = useAgentStore((s) => s.monitor?.todayCount ?? 0);
  // Populate the today-count badge and the room list once on mount (two cheap
  // REST calls) — the room list is nav, so it can't wait for the view to open.
  useEffect(() => {
    void loadMonitor();
    void loadRooms();
  }, [loadMonitor, loadRooms]);
  // Which roles are executing right now (lights a live dot in the roster).
  const activeRoleIds = useAgentStore(selectActiveRoleIds);
  const activeSet = useMemo(() => new Set(activeRoleIds.split(',').filter(Boolean)), [activeRoleIds]);

  const go = (fn: () => void) => () => {
    fn();
    onNavigate?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3.5 py-3.5">
        <button className="font-bold tracking-wide" onClick={go(showHome)}>
          agent-os
        </button>
        <span
          title={connected ? 'connected' : 'disconnected'}
          className={cn(
            'h-[9px] w-[9px] shrink-0 rounded-full bg-muted',
            connected && 'bg-green shadow-[0_0_8px_var(--green)]',
          )}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Sessions */}
        <Section title="Sessions" defaultOpen={false}>
          <SessionList onSelect={onNavigate} />
        </Section>

        {/* Virtual company */}
        <Section title="Virtual company">
          <div className="flex flex-col gap-0.5 px-2">
            {roles.map((role: Role) => (
              <div
                key={role.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--panel-2)]"
              >
                <button
                  onClick={go(() => openRole(role))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-base">{role.emoji ?? '🤖'}</span>
                  <span className="truncate text-[13px] font-semibold text-foreground">{role.name}</span>
                  {role.actionMode === 'advise' && <Badge className="shrink-0">advisory</Badge>}
                  {activeSet.has(role.id) && (
                    <span
                      title="執行中"
                      className="ml-auto h-2 w-2 shrink-0 animate-pulse rounded-full bg-green shadow-[0_0_8px_var(--green)]"
                    />
                  )}
                </button>
                <button
                  onClick={go(() => showSettings(role.id))}
                  title="設定"
                  aria-label={`Settings for ${role.name}`}
                  className="shrink-0 rounded px-1 text-xs text-muted opacity-0 hover:text-accent group-hover:opacity-100"
                >
                  ⚙
                </button>
              </div>
            ))}
            {roles.length === 0 && (
              <p className="px-2 py-1 text-[12px] text-muted">
                No roles. Add them in <code>roles/roles.json</code>.
              </p>
            )}
          </div>

          {/* Workflows (deferred) */}
          <div className="mt-2 px-2">
            <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-muted">Workflows · soon</p>
            <div className="flex flex-col gap-0.5">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted opacity-60"
                >
                  <span className="text-base">{wf.emoji}</span>
                  <span className="truncate">{wf.name}</span>
                  <span className="ml-auto rounded-full border border-amber px-1 text-[9px] uppercase tracking-wide text-amber">
                    soon
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Projects (deferred) */}
          <p className="mt-2 cursor-default px-4 py-1 text-[12px] text-muted opacity-60">📁 Projects · soon</p>
        </Section>

        {/* GEO 診斷 — a deliverable job (input a company → a "how AI sees you"
            report), deliberately NOT a chat role in the roster above. */}
        <Section title="GEO 診斷">
          <div className="px-2">
            <button
              onClick={go(showGeo)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--panel-2)]"
            >
              <span className="text-base">🔎</span>
              <span className="truncate font-semibold text-foreground">AI 眼中的你</span>
              <span className="ml-auto shrink-0 rounded-full border border-accent px-1.5 text-[9px] uppercase tracking-wide text-accent">
                job
              </span>
            </button>
          </div>
        </Section>

        {/* Room channels — one entry per room, like the session list. */}
        <Section title="Room channels" defaultOpen={false}>
          <div className="flex flex-col gap-0.5 px-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={go(() => showRooms(room.id))}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--panel-2)]',
                  view === 'rooms' && activeRoomId === room.id && 'bg-[var(--panel-2)]',
                )}
              >
                <span className="text-base">🧩</span>
                <span className="truncate font-semibold text-foreground">{room.name}</span>
                {(roomRound[room.id]?.length ?? 0) > 0 && (
                  <span className="ml-auto h-2 w-2 shrink-0 animate-pulse rounded-full bg-green" />
                )}
              </button>
            ))}
            {rooms.length === 0 && <p className="m-0 px-2 py-1.5 text-[12px] text-muted">還沒有會議室</p>}
            <button
              onClick={go(() => {
                const name = window.prompt('新會議室名稱？', '新會議室');
                if (name !== null) void createRoom(name);
              })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted hover:bg-[var(--panel-2)] hover:text-foreground"
            >
              <span className="text-base">＋</span>
              <span>新會議室</span>
            </button>
          </div>
        </Section>

        {/* Budget & spend */}
        <Section title="Budget &amp; spend" defaultOpen={false}>
          <BudgetPanel />
        </Section>

        {/* Monitor */}
        <Section title="Monitor" defaultOpen={false}>
          <div className="px-2">
            <button
              onClick={go(showMonitor)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--panel-2)]"
            >
              <span className="text-base">🔎</span>
              <span className="truncate font-semibold text-foreground">threads_trend</span>
              <span
                title="今日呼叫次數"
                className="ml-auto shrink-0 rounded-full border border-border px-1.5 text-[11px] tabular-nums text-muted"
              >
                {monitorToday} 今日
              </span>
            </button>
          </div>
        </Section>

        {/* Settings */}
        <Section title="Settings" defaultOpen={false}>
          <button
            onClick={go(() => showSettings())}
            className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md border border-border bg-[var(--panel-2)] px-3 py-2 text-[13px] font-semibold text-accent hover:border-accent"
          >
            ⚙ 角色權限與設定
          </button>
        </Section>
      </div>
    </div>
  );
}
