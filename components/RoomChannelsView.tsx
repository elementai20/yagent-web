'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgentStore } from '@/lib/store';
import type { Role, RoomInfo, RoomMsg } from '@/lib/types';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';

interface RoomChannelsViewProps {
  send: (sessionKey: string, text: string) => void;
}

/**
 * Room channels: drag virtual-company roles into a meeting channel, then chat —
 * a moderator picks the relevant members and each speaks in turn (full tool
 * access). Rooms are selected from the sidebar, like sessions; this pane renders
 * whichever one is active.
 */
export default function RoomChannelsView({ send }: RoomChannelsViewProps) {
  const roles = useAgentStore((s) => s.roles);
  const rooms = useAgentStore((s) => s.rooms);
  const activeRoomId = useAgentStore((s) => s.activeRoomId);
  const roomRound = useAgentStore((s) => s.roomRound);
  const addToRoom = useAgentStore((s) => s.addToRoom);
  const removeFromRoom = useAgentStore((s) => s.removeFromRoom);
  const createRoom = useAgentStore((s) => s.createRoom);
  const deleteRoom = useAgentStore((s) => s.deleteRoom);

  // Falls back to the first room while /api/rooms is still loading and nothing
  // has been selected yet.
  const room: RoomInfo | undefined = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const round = room ? roomRound[room.id] : null;

  const members = useMemo(
    () => (room ? room.participants.map((id) => roles.find((r) => r.id === id)).filter(Boolean) as Role[] : []),
    [room, roles],
  );
  const memberSet = useMemo(() => new Set(room?.participants ?? []), [room]);

  // Drag state so the drop zones can light up.
  const [dragging, setDragging] = useState<string | null>(null);
  const [overChannel, setOverChannel] = useState(false);
  const [overBench, setOverBench] = useState(false);

  // Auto-scroll the transcript.
  const bottomRef = useRef<HTMLDivElement>(null);
  const transcriptLen = room?.transcript.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptLen, round]);

  const roleOf = (id: string) => roles.find((r) => r.id === id);

  function speakerLabel(m: RoomMsg): { emoji: string; name: string } {
    if (m.speaker === 'user') return { emoji: '🧑', name: '你' };
    if (m.speaker === 'system') return { emoji: 'ℹ️', name: '系統' };
    const r = roleOf(m.speaker);
    return { emoji: r?.emoji ?? '🤖', name: m.speakerName ?? r?.name ?? m.speaker };
  }

  // No rooms is now a real state (the last one can be deleted), not just "loading".
  if (!room) {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center text-muted">
        <div className="flex flex-col items-center gap-3">
          <p className="m-0 text-[13px]">還沒有會議室 —— 開一間，把角色拖進去就能一起討論。</p>
          <button
            onClick={() => {
              const name = window.prompt('新會議室名稱？', '新會議室');
              if (name !== null) void createRoom(name);
            }}
            className="rounded-md border border-accent px-3 py-1.5 text-[13px] text-accent hover:bg-[rgba(110,168,254,0.08)]"
          >
            ＋ 開一間會議室
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-panel px-[22px] py-3 max-md:px-3.5">
        <span className="text-sm font-bold">🧩 {room.name}</span>
        <span className="text-xs text-muted max-md:hidden">把角色拖進 channel，一起討論</span>
        <button
          onClick={() => {
            // Deleting takes the members' private sub-sessions with it, so say so.
            if (window.confirm(`刪除會議室「${room.name}」？\n會議記錄與成員在這間房的對話記憶都會一起刪掉。`)) {
              void deleteRoom(room.id);
            }
          }}
          className="ml-auto shrink-0 rounded-sm border border-border px-2 py-1 text-[11px] text-muted hover:border-danger hover:text-danger"
        >
          刪除會議室
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-[22px] max-md:p-3.5">
        {/* Roles bench — drag a block into the channel below (drop here to remove). */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setOverBench(true);
          }}
          onDragLeave={() => setOverBench(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOverBench(false);
            const id = e.dataTransfer.getData('text/role-id');
            if (id && memberSet.has(id)) void removeFromRoom(room.id, id);
          }}
          className={cn(
            'rounded-lg border border-border p-3 transition',
            overBench && dragging && memberSet.has(dragging) && 'border-danger bg-[rgba(229,72,77,0.06)]',
          )}
        >
          <h3 className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Virtual company（拖進下方 channel 加入會議）
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const inRoom = memberSet.has(role.id);
              return (
                <div
                  key={role.id}
                  draggable={!inRoom}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/role-id', role.id);
                    setDragging(role.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => {
                    // Click fallback (mobile / no-DnD): toggle membership.
                    if (inRoom) void removeFromRoom(room.id, role.id);
                    else void addToRoom(room.id, role.id);
                  }}
                  title={inRoom ? '已在會議室（點擊移除）' : '拖進 channel 或點擊加入'}
                  className={cn(
                    'flex cursor-grab select-none items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1.5 text-[13px]',
                    inRoom ? 'cursor-pointer opacity-40' : 'hover:border-accent',
                  )}
                >
                  <span>{role.emoji ?? '🤖'}</span>
                  <span className="font-semibold">{role.name}</span>
                </div>
              );
            })}
            {roles.length === 0 && <span className="text-[13px] text-muted">No roles loaded.</span>}
          </div>
        </section>

        {/* The channel — drop zone + members + transcript. */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setOverChannel(true);
          }}
          onDragLeave={() => setOverChannel(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOverChannel(false);
            const id = e.dataTransfer.getData('text/role-id');
            if (id && !memberSet.has(id)) void addToRoom(room.id, id);
          }}
          className={cn(
            'flex min-h-0 flex-1 flex-col rounded-lg border border-border transition',
            overChannel && dragging && !memberSet.has(dragging) && 'border-accent bg-[rgba(110,168,254,0.05)]',
          )}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <span className="text-sm font-bold"># {room.name}</span>
            {members.map((r) => (
              <span
                key={r.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/role-id', r.id);
                  setDragging(r.id);
                }}
                onDragEnd={() => setDragging(null)}
                className="flex cursor-grab select-none items-center gap-1 rounded-full border border-border bg-[var(--panel-2)] px-2 py-0.5 text-[12px]"
              >
                <span>{r.emoji ?? '🤖'}</span>
                <span>{r.name}</span>
                <button
                  aria-label={`Remove ${r.name}`}
                  onClick={() => void removeFromRoom(room.id, r.id)}
                  className="ml-0.5 text-muted hover:text-danger"
                >
                  ✕
                </button>
              </span>
            ))}
            {members.length === 0 && (
              <span className="text-[12px] text-muted">（還沒有成員 — 把上面的角色拖進來）</span>
            )}
          </div>

          {/* Transcript */}
          <div className="flex min-h-[180px] flex-1 flex-col gap-3 overflow-y-auto p-3.5">
            {room.transcript.map((m, i) => {
              const who = speakerLabel(m);
              const isUser = m.speaker === 'user';
              return (
                <div key={`${m.ts}-${i}`} className={cn('flex flex-col gap-1', isUser && 'items-end')}>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted">
                    <span className="text-sm">{who.emoji}</span>
                    {who.name}
                  </span>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-lg border border-border px-3 py-2 text-[13px] leading-relaxed',
                      isUser ? 'bg-[rgba(110,168,254,0.1)]' : 'bg-panel',
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {round && round.length > 0 && (
              <p className="m-0 flex items-center gap-2 text-[12px] text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green" />
                💬 {round.map((id) => roleOf(id)?.name ?? id).join('、')} 發言中…
              </p>
            )}
            {room.transcript.length === 0 && !round && (
              <p className="m-0 text-[13px] text-muted">丟一個主題進來，相關的成員會主動回應。</p>
            )}
            <div ref={bottomRef} />
          </div>

          <ChatInput sessionKey={`room:${room.id}`} onSend={(key, text) => send(key, text)} />
        </section>
      </div>
    </div>
  );
}
