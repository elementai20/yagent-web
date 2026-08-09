'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAgentStore } from '@/lib/store';
import type { Role, RolePatch, ToolInfo } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Settings() {
  const roles = useAgentStore((s) => s.roles);
  const tools = useAgentStore((s) => s.tools);
  const agents = useAgentStore((s) => s.agents);
  const threadsSources = useAgentStore((s) => s.threadsSources);
  const settingsRoleId = useAgentStore((s) => s.settingsRoleId);
  const showSettings = useAgentStore((s) => s.showSettings);
  const loadRoles = useAgentStore((s) => s.loadRoles);
  const loadTools = useAgentStore((s) => s.loadTools);
  const loadAgents = useAgentStore((s) => s.loadAgents);
  const loadThreadsSources = useAgentStore((s) => s.loadThreadsSources);

  useEffect(() => {
    void loadRoles();
    void loadTools();
    void loadAgents();
    void loadThreadsSources();
  }, [loadRoles, loadTools, loadAgents, loadThreadsSources]);

  const shown = settingsRoleId ? roles.filter((r) => r.id === settingsRoleId) : roles;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-panel px-[22px] py-3.5">
        <span className="text-lg font-bold tracking-wide">Settings</span>
        {settingsRoleId && (
          <button className="ml-2 text-xs text-muted hover:text-accent" onClick={() => showSettings()}>
            (顯示全部角色)
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-[22px]">
        <p className="text-[13px] text-muted">
          每個角色的權限與綁定。儲存會寫回 <code>roles/roles.json</code>。動作模式也可在聊天室即時切換。
        </p>
        {shown.map((role) => (
          <RoleSettingsCard key={role.id} role={role} tools={tools} agents={agents} threadsSources={threadsSources} />
        ))}
        {roles.length === 0 && <p className="text-[13px] text-muted">No roles loaded.</p>}
      </div>
    </div>
  );
}

function RoleSettingsCard({
  role,
  tools,
  agents,
  threadsSources,
}: {
  role: Role;
  tools: ToolInfo[];
  agents: string[];
  threadsSources: string[];
}) {
  const saveRole = useAgentStore((s) => s.saveRole);

  const allToolNames = useMemo(() => tools.map((t) => t.name), [tools]);
  const [model, setModel] = useState(role.model ?? '');
  const [codingAgent, setCodingAgent] = useState(role.codingAgent ?? '');
  const [threadsSource, setThreadsSource] = useState(role.threadsSource ?? '');
  const [actionMode, setActionMode] = useState<'act' | 'advise'>(role.actionMode ?? 'act');
  // Selected = allowed tools. Empty role.tools (= all) → everything checked.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.tools && role.tools.length ? role.tools : allToolNames),
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  // Default the tool selection to "all" once the tool list arrives (if unrestricted).
  useEffect(() => {
    if (!(role.tools && role.tools.length) && allToolNames.length) setSelected(new Set(allToolNames));
  }, [allToolNames, role.tools]);

  function toggleTool(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function save() {
    setStatus('saving');
    setError('');
    // All tools checked → no restriction (undefined). Otherwise the checked subset.
    const restricted = selected.size !== allToolNames.length;
    const patch: RolePatch = {
      model: model.trim() || undefined,
      codingAgent: codingAgent || undefined,
      threadsSource: threadsSource || undefined,
      actionMode,
      tools: restricted ? [...selected] : undefined,
    };
    try {
      await saveRole(role.id, patch);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1800);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const restrictedCount = selected.size === allToolNames.length ? 0 : selected.size;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{role.emoji ?? '🤖'}</span>
        <span className="text-[15px] font-bold">{role.name}</span>
        {role.title && <span className="text-xs text-accent">{role.title}</span>}
        <code className="ml-auto text-[11px] text-muted">{role.id}</code>
      </div>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {/* Model */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Model</span>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="(預設) gpt-4o-mini / openrouter id…"
          />
        </label>

        {/* Coding harness */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Coding harness</span>
          <select
            value={codingAgent}
            onChange={(e) => setCodingAgent(e.target.value)}
            className="h-10 rounded-md border border-border bg-[var(--bg)] px-3 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">(預設)</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {/* Threads data source — only relevant when this role can use threads_trend. */}
        {selected.has('threads_trend') && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Threads 資料來源</span>
            <select
              value={threadsSource}
              onChange={(e) => setThreadsSource(e.target.value)}
              className="h-10 rounded-md border border-border bg-[var(--bg)] px-3 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">(預設)</option>
              {threadsSources.map((s) => (
                <option key={s} value={s}>
                  {s === 'ensembledata' ? 'ensembledata（計量 API）' : s === 'browser' ? 'browser（免費爬蟲）' : s}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-muted">API 額度用完會自動 fallback 到 browser。</span>
          </label>
        )}
      </div>

      {/* Action mode */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">預設動作模式</span>
        <div className="flex gap-2">
          {(['act', 'advise'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActionMode(m)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm',
                actionMode === m
                  ? 'border-accent bg-[rgba(110,168,254,0.12)] text-accent'
                  : 'border-border text-muted hover:border-accent',
              )}
            >
              {m === 'act' ? '🟢 有動作 (act)' : '🔵 唯諮詢 (advise)'}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted">
          唯諮詢＝只能讀檔/查知識/載技能，不能寫檔、shell、瀏覽或委派 coding。
        </span>
      </div>

      {/* Tools allowlist */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">
          工具白名單 {restrictedCount > 0 ? `（限 ${restrictedCount} 個）` : '（全部可用）'}
        </span>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          {tools.map((t) => (
            <label key={t.name} className="flex items-center gap-2 text-[13px]" title={t.description}>
              <input type="checkbox" checked={selected.has(t.name)} onChange={() => toggleTool(t.name)} />
              <span className="font-mono text-tool">{t.name}</span>
            </label>
          ))}
          {tools.length === 0 && <span className="text-[13px] text-muted">No tools loaded.</span>}
        </div>
        <span className="text-[11px] text-muted">全部勾選＝不限制；取消勾選即變成白名單。</span>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? '儲存中…' : '儲存'}
        </Button>
        {status === 'saved' && <span className="text-[13px] text-green">已儲存 ✓</span>}
        {status === 'error' && <span className="text-[13px] text-danger">儲存失敗：{error}</span>}
      </div>
    </Card>
  );
}
