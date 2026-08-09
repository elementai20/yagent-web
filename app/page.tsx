'use client';

import { useEffect, useState } from 'react';
import { useAgentStore } from '@/lib/store';
import { useAgentSocket } from '@/lib/useAgentSocket';
import Sidebar from '@/components/Sidebar';
import Settings from '@/components/Settings';
import SessionView from '@/components/SessionView';
import RoleView from '@/components/RoleView';
import MonitorView from '@/components/MonitorView';
import GeoView from '@/components/GeoView';
import RoomChannelsView from '@/components/RoomChannelsView';
import WorldView from '@/components/WorldView';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function Page() {
  const view = useAgentStore((s) => s.view);
  const connected = useAgentStore((s) => s.connected);
  const loadRoles = useAgentStore((s) => s.loadRoles);
  const loadUsage = useAgentStore((s) => s.loadUsage);

  const { send, abort } = useAgentSocket();

  useEffect(() => {
    void loadRoles();
    void loadUsage();
  }, [loadRoles, loadUsage]);

  // Mobile: the sidebar is an off-canvas drawer (hidden on desktop via CSS).
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const Dot = (
    <span
      title={connected ? 'connected' : 'disconnected'}
      className={cn(
        'h-[9px] w-[9px] shrink-0 rounded-full bg-muted',
        connected && 'bg-green shadow-[0_0_8px_var(--green)]',
      )}
    />
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile-only top bar with the drawer toggle */}
      <header className="flex items-center gap-3 border-b border-border bg-panel px-3.5 py-2.5 md:hidden">
        <button
          aria-label="Open navigation"
          className="rounded-md border border-border px-2.5 py-1 text-base leading-none text-foreground"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span className="font-bold tracking-wide">agent-os</span>
        {Dot}
      </header>

      {/* Desktop: static sidebar column */}
      <aside className="hidden min-h-0 w-[260px] flex-col border-r border-border bg-panel md:flex">
        <Sidebar connected={connected} />
      </aside>

      {/* Mobile: off-canvas drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="flex w-[82%] max-w-[300px] flex-col bg-panel p-0 md:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar connected={connected} onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex min-h-0 min-w-0 flex-1">
        {view === 'settings' ? (
          <Settings />
        ) : view === 'world' ? (
          <WorldView />
        ) : view === 'monitor' ? (
          <MonitorView />
        ) : view === 'geo' ? (
          <GeoView />
        ) : view === 'rooms' ? (
          <RoomChannelsView send={send} />
        ) : view === 'role' ? (
          <RoleView />
        ) : view === 'session' ? (
          <SessionView send={send} abort={abort} />
        ) : (
          <div className="grid flex-1 place-items-center px-6 text-center text-muted">
            <div>
              <h2 className="mb-1.5 text-foreground">Welcome to agent-os</h2>
              <p>Pick a member or session from the sidebar to begin.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
