'use client';

import { useMemo } from 'react';
import { useAgentStore, roleById, roleForSession } from '@/lib/store';

/**
 * A role's "hub": its work history (own chats + delegated sub-sessions), so
 * clicking a member in the sidebar shows what it has done rather than a blank
 * chat. "＋ 新對話" starts a fresh session bound to the role.
 */
export default function RoleView() {
  const roleHubId = useAgentStore((s) => s.roleHubId);
  const roles = useAgentStore((s) => s.roles);
  const sessions = useAgentStore((s) => s.sessions);
  const select = useAgentStore((s) => s.select);
  const newRoleChat = useAgentStore((s) => s.newRoleChat);

  const role = roleById(roles, roleHubId ?? undefined);

  const roleSessions = useMemo(
    () =>
      Object.values(sessions)
        .filter((s) => roleForSession(s.sessionKey, s.roleId) === roleHubId)
        .sort((a, b) => b.lastActivity - a.lastActivity),
    [sessions, roleHubId],
  );

  if (!role) return null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-2xl">{role.emoji ?? '🤖'}</span>
        <div className="min-w-0">
          <h2 className="truncate text-foreground">{role.name}</h2>
          {role.title && <p className="truncate text-[13px] text-muted">{role.title}</p>}
        </div>
        <button
          onClick={() => newRoleChat(role)}
          className="ml-auto shrink-0 rounded-md border border-border bg-[var(--panel-2)] px-3 py-2 text-[13px] font-semibold text-accent hover:border-accent"
        >
          ＋ 新對話
        </button>
      </div>
      <p className="mb-5 text-[13px] text-muted">{role.description}</p>

      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {role.name} 的工作紀錄（{roleSessions.length}）
      </h3>

      {roleSessions.length === 0 ? (
        <p className="text-[13px] text-muted">
          還沒有紀錄。開一個新對話，或讓其他成員用 <code>delegate_to_role</code> 把工作交給 {role.name}。
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {roleSessions.map((s) => {
            const delegated = s.sessionKey.includes('::') || s.sessionKey.includes('__');
            const last = s.turns[s.turns.length - 1];
            const preview = s.turns[0]?.userText ?? '';
            return (
              <button
                key={s.sessionKey}
                onClick={() => select(s.sessionKey)}
                className="flex flex-col gap-1 rounded-md border border-border px-3 py-2.5 text-left hover:bg-[var(--panel-2)]"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className={delegated ? 'text-accent' : 'text-foreground'}>
                    {delegated ? '↳ 受委派' : '💬 直接對話'}
                  </span>
                  {last?.running && <span className="text-[11px] text-green">● live</span>}
                  <span className="ml-auto text-[11px] text-muted">{s.turns.length} turn(s)</span>
                </span>
                {preview && <span className="truncate text-[12px] text-muted">{preview}</span>}
                <span className="break-all text-[10px] text-muted opacity-60">{s.sessionKey}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
