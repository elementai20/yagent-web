import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { apiUrl } from './api';
import type {
  AgentEvent,
  BudgetAlertView,
  DelegateStep,
  DispatchStep,
  GeoReport,
  Iteration,
  MonitorSnapshot,
  Role,
  RolePatch,
  RoomInfo,
  SessionState,
  ToolInfo,
  Turn,
  UsageSnapshot,
} from './types';

type View = 'welcome' | 'session' | 'settings' | 'role' | 'monitor' | 'rooms' | 'geo' | 'world';

// Minimal shape of the persisted OpenAI message array (system prompt already
// stripped server-side). Kept loose — we only read the fields we render.
interface StoredMessage {
  role: string;
  content?: string | null;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

function emptySession(sessionKey: string, channel: string, roleId?: string): SessionState {
  return { sessionKey, channel, roleId, turns: [], lastActivity: Date.now() };
}

function newTurn(userText: string, startedAt: number, running: boolean): Turn {
  return { userText, iterations: [], dispatches: [], delegates: [], finalText: undefined, running, startedAt };
}

function ensureIteration(turn: Turn, iteration: number): Iteration {
  let it = turn.iterations.find((i) => i.iteration === iteration);
  if (!it) {
    it = { iteration, tools: [] };
    turn.iterations.push(it);
  }
  return it;
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Reconstruct the Turn[] view-model from a session's persisted message
 * history (the same array agent.ts saves via saveSession). Mirrors apply()
 * below, but driven by stored messages rather than the live event stream.
 */
function messagesToTurns(messages: StoredMessage[]): Turn[] {
  const turns: Turn[] = [];
  const pendingTools = new Map<string, Iteration['tools'][number]>();
  let iteration = 0;

  for (const msg of messages) {
    switch (msg.role) {
      case 'user': {
        turns.push(newTurn(String(msg.content ?? ''), 0, false));
        iteration = 0;
        break;
      }
      case 'assistant': {
        const turn = turns[turns.length - 1];
        if (!turn) break;
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          iteration += 1;
          const it = ensureIteration(turn, iteration);
          if (msg.content) it.content = msg.content;
          for (const tc of msg.tool_calls) {
            const tool = { name: tc.function.name, args: safeParseArgs(tc.function.arguments) };
            it.tools.push(tool);
            pendingTools.set(tc.id, tool);
          }
        } else {
          turn.finalText = msg.content ?? '';
        }
        break;
      }
      case 'tool': {
        if (msg.tool_call_id) {
          const tool = pendingTools.get(msg.tool_call_id);
          if (tool) tool.result = String(msg.content ?? '');
        }
        break;
      }
    }
  }

  return turns;
}

/** Find a dispatch step by task id within a session (latest turn first). */
function findDispatchIn(s: SessionState, taskId: string): DispatchStep | undefined {
  for (let i = s.turns.length - 1; i >= 0; i--) {
    const d = s.turns[i].dispatches.find((x) => x.taskId === taskId);
    if (d) return d;
  }
  return undefined;
}

/** Find a delegation step by task id within a session (latest turn first). */
function findDelegateIn(s: SessionState, taskId: string): DelegateStep | undefined {
  for (let i = s.turns.length - 1; i >= 0; i--) {
    const d = s.turns[i].delegates.find((x) => x.taskId === taskId);
    if (d) return d;
  }
  return undefined;
}

interface AgentStore {
  // --- state ---
  sessions: Record<string, SessionState>;
  selected: string | null;
  connected: boolean;
  /** Sessions whose persisted history has been fetched (avoid refetch/clobber). */
  historyLoaded: Record<string, boolean>;
  view: View;
  roles: Role[];
  usage: UsageSnapshot | null;
  monitor: MonitorSnapshot | null;
  alerts: BudgetAlertView[];
  // --- GEO diagnosis (a deliverable job, not a chat role) ---
  geoReports: GeoReport[];
  geoReport: GeoReport | null;
  geoRunning: boolean;
  geoError: string | null;
  // --- room channels ---
  rooms: RoomInfo[];
  /** Room shown in the rooms view (null while none exist / still loading). */
  activeRoomId: string | null;
  /** Speakers of the in-flight meeting round per room (null/absent = idle). */
  roomRound: Record<string, string[] | null>;
  // --- settings (Task 3) ---
  tools: ToolInfo[];
  agents: string[];
  threadsSources: string[];
  settingsRoleId: string | null;
  /** Role whose "hub" (work history) is shown when view === 'role'. */
  roleHubId: string | null;

  // --- actions ---
  setConnected(v: boolean): void;
  showHome(): void;
  showSettings(roleId?: string): void;
  /** Open the Monitor view (threads_trend call log). */
  showMonitor(): void;
  loadMonitor(): Promise<void>;
  /** Open the GEO diagnosis deliverable view. */
  showGeo(): void;
  loadGeoReports(): Promise<void>;
  /** Run a diagnosis (blocks on the backend batch); stores the finished report. */
  runGeo(input: { company: string; vertical?: string; market?: string; aliases?: string[] }): Promise<void>;
  /** Open a past report from the history list. */
  openGeoReport(id: string): void;
  /** Open the game world (WorkAdventure, embedded in an iframe). */
  showWorld(): void;
  /** Open the Room channels view (multi-role meeting rooms), optionally on one room. */
  showRooms(roomId?: string): void;
  loadRooms(): Promise<void>;
  createRoom(name: string): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  addToRoom(roomId: string, roleId: string): Promise<void>;
  removeFromRoom(roomId: string, roleId: string): Promise<void>;
  select(sessionKey: string): void;
  /** Open a role's hub: its work history (own chats + delegated sub-sessions). */
  openRole(role: Role): void;
  /** Start a fresh chat bound to a role (the "＋ 新對話" action). */
  newRoleChat(role: Role): void;
  loadRoles(): Promise<void>;
  loadUsage(): Promise<void>;
  loadTools(): Promise<void>;
  loadAgents(): Promise<void>;
  loadThreadsSources(): Promise<void>;
  saveRole(id: string, patch: RolePatch): Promise<void>;
  seedSessions(keys: string[]): void;
  loadHistory(sessionKey: string): Promise<void>;
  apply(ev: AgentEvent): void;
}

export const useAgentStore = create<AgentStore>()(
  immer((set, get) => ({
    sessions: {},
    selected: null,
    connected: false,
    historyLoaded: {},
    view: 'welcome',
    roles: [],
    usage: null,
    monitor: null,
    alerts: [],
    geoReports: [],
    geoReport: null,
    geoRunning: false,
    geoError: null,
    rooms: [],
    activeRoomId: null,
    roomRound: {},
    tools: [],
    agents: [],
    threadsSources: [],
    settingsRoleId: null,
    roleHubId: null,

    setConnected(v) {
      set((s) => {
        s.connected = v;
      });
    },

    // --- navigation ---
    showHome() {
      set((s) => {
        s.view = 'welcome';
        s.selected = null;
      });
      void get().loadUsage();
    },

    /** Open the Monitor view and (re)fetch the threads_trend log. */
    showMonitor() {
      set((s) => {
        s.view = 'monitor';
        s.selected = null;
      });
      void get().loadMonitor();
    },

    async loadMonitor() {
      try {
        const res = await fetch(apiUrl('/api/monitor/threads'));
        const data = (await res.json()) as MonitorSnapshot;
        set((s) => {
          s.monitor = data;
        });
      } catch {
        /* backend not up yet */
      }
    },

    /**
     * Open the game world. Nothing to fetch — the world is a separate origin
     * (the WorkAdventure stack) that we only embed; WorldView probes whether
     * it is actually up.
     */
    showWorld() {
      set((s) => {
        s.view = 'world';
        s.selected = null;
      });
    },

    /** Open the GEO diagnosis view and (re)fetch past reports. */
    showGeo() {
      set((s) => {
        s.view = 'geo';
        s.selected = null;
      });
      void get().loadGeoReports();
    },

    async loadGeoReports() {
      try {
        const res = await fetch(apiUrl('/api/geo'));
        const data = (await res.json()) as { reports: GeoReport[] };
        set((s) => {
          s.geoReports = data.reports ?? [];
          // Default the open report to the newest, if none is selected yet.
          if (!s.geoReport && s.geoReports.length) s.geoReport = s.geoReports[0];
        });
      } catch {
        /* backend not up yet */
      }
    },

    async runGeo(input) {
      set((s) => {
        s.geoRunning = true;
        s.geoError = null;
      });
      try {
        const res = await fetch(apiUrl('/api/geo'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = (await res.json()) as { report?: GeoReport; error?: string };
        set((s) => {
          if (data.report) {
            s.geoReport = data.report;
            s.geoReports = [data.report, ...s.geoReports.filter((r) => r.id !== data.report!.id)];
          } else {
            s.geoError = data.error ?? 'GEO 診斷失敗';
          }
        });
      } catch (err) {
        set((s) => {
          s.geoError = err instanceof Error ? err.message : String(err);
        });
      } finally {
        set((s) => {
          s.geoRunning = false;
        });
      }
    },

    openGeoReport(id) {
      set((s) => {
        const r = s.geoReports.find((x) => x.id === id);
        if (r) s.geoReport = r;
      });
    },

    /** Open the Room channels view, optionally on a specific room. */
    showRooms(roomId) {
      set((s) => {
        s.view = 'rooms';
        s.selected = null;
        if (roomId) s.activeRoomId = roomId;
      });
      void get().loadRooms();
      void get().loadRoles();
    },

    async loadRooms() {
      try {
        const res = await fetch(apiUrl('/api/rooms'));
        const data = (await res.json()) as { rooms: RoomInfo[] };
        set((s) => {
          s.rooms = data.rooms ?? [];
          // Keep the selection pointing at a room that still exists — it may have
          // been deleted from another tab between loads.
          if (!s.rooms.some((r) => r.id === s.activeRoomId)) {
            s.activeRoomId = s.rooms[0]?.id ?? null;
          }
        });
      } catch {
        /* backend not up yet */
      }
    },

    /** Create a room and open it. */
    async createRoom(name) {
      const res = await fetch(apiUrl('/api/rooms'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { room?: RoomInfo };
      if (!data.room) return;
      set((s) => {
        s.rooms.push(data.room!);
        s.activeRoomId = data.room!.id;
        s.view = 'rooms';
      });
    },

    /**
     * Delete a room. The backend also drops the members' private sub-sessions, so
     * refresh the session list rather than leaving stale keys in the sidebar.
     */
    async deleteRoom(roomId) {
      const res = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(roomId)}`), { method: 'DELETE' });
      if (!res.ok) return;
      set((s) => {
        s.rooms = s.rooms.filter((r) => r.id !== roomId);
        if (s.activeRoomId === roomId) s.activeRoomId = s.rooms[0]?.id ?? null;
        delete s.roomRound[roomId];
      });
    },

    /** Add a role to a room's participants (drag in / click). */
    async addToRoom(roomId, roleId) {
      const res = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(roomId)}/participants`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ add: roleId }),
      });
      const data = (await res.json()) as { room: RoomInfo };
      set((s) => {
        const i = s.rooms.findIndex((r) => r.id === roomId);
        if (i >= 0 && data.room) s.rooms[i] = data.room;
      });
    },

    /** Remove a role from a room (drag out / ✕). */
    async removeFromRoom(roomId, roleId) {
      const res = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(roomId)}/participants`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ remove: roleId }),
      });
      const data = (await res.json()) as { room: RoomInfo };
      set((s) => {
        const i = s.rooms.findIndex((r) => r.id === roomId);
        if (i >= 0 && data.room) s.rooms[i] = data.room;
      });
    },

    /** Open the settings view, optionally focused on one role. */
    showSettings(roleId) {
      set((s) => {
        s.view = 'settings';
        s.settingsRoleId = roleId ?? null;
      });
      void get().loadRoles();
      void get().loadTools();
      void get().loadAgents();
      void get().loadThreadsSources();
    },

    select(sessionKey) {
      set((s) => {
        s.selected = sessionKey;
        s.view = 'session';
        if (!s.sessions[sessionKey]) s.sessions[sessionKey] = emptySession(sessionKey, 'unknown');
      });
    },

    /** Open a role's hub view (its work history), not a blank chat. */
    openRole(role) {
      set((s) => {
        s.view = 'role';
        s.roleHubId = role.id;
      });
    },

    /** Start a fresh chat session bound to a role. */
    newRoleChat(role) {
      const sessionKey = `web-${role.id}-${Math.random().toString(36).slice(2, 8)}`;
      set((s) => {
        s.sessions[sessionKey] = emptySession(sessionKey, 'web', role.id);
        s.historyLoaded[sessionKey] = true; // brand new — nothing to fetch
        s.selected = sessionKey;
        s.view = 'session';
      });
    },

    // --- data loading ---
    async loadRoles() {
      try {
        const res = await fetch(apiUrl('/api/roles'));
        const data = (await res.json()) as { roles: Role[] };
        set((s) => {
          s.roles = data.roles ?? [];
        });
      } catch {
        /* backend not up yet */
      }
    },

    async loadUsage() {
      try {
        const res = await fetch(apiUrl('/api/usage'));
        const data = (await res.json()) as UsageSnapshot;
        set((s) => {
          s.usage = data;
        });
      } catch {
        /* backend not up yet */
      }
    },

    async loadTools() {
      try {
        const res = await fetch(apiUrl('/api/tools'));
        const data = (await res.json()) as { tools: ToolInfo[] };
        set((s) => {
          s.tools = data.tools ?? [];
        });
      } catch {
        /* backend not up yet */
      }
    },

    async loadAgents() {
      try {
        const res = await fetch(apiUrl('/api/agents'));
        const data = (await res.json()) as { agents: string[] };
        set((s) => {
          s.agents = data.agents ?? [];
        });
      } catch {
        /* backend not up yet */
      }
    },

    async loadThreadsSources() {
      try {
        const res = await fetch(apiUrl('/api/threads-sources'));
        const data = (await res.json()) as { sources: string[] };
        set((s) => {
          s.threadsSources = data.sources ?? [];
        });
      } catch {
        /* backend not up yet */
      }
    },

    /** Persist a role config edit and update the local copy. */
    async saveRole(id, patch) {
      const res = await fetch(apiUrl(`/api/roles/${encodeURIComponent(id)}`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { role: Role };
      set((s) => {
        const i = s.roles.findIndex((r) => r.id === id);
        if (i >= 0) s.roles[i] = data.role;
      });
    },

    /** Seed the session list from REST so pre-existing sessions show up on load. */
    seedSessions(keys) {
      set((s) => {
        for (const key of keys) {
          if (!s.sessions[key]) s.sessions[key] = emptySession(key, 'unknown');
        }
      });
    },

    /** Rehydrate a session's chat history from persisted disk state. */
    async loadHistory(sessionKey) {
      const state = get();
      if (state.historyLoaded[sessionKey]) return;
      const existing = state.sessions[sessionKey];
      if (existing && existing.turns.length > 0) {
        set((s) => {
          s.historyLoaded[sessionKey] = true;
        });
        return;
      }
      set((s) => {
        s.historyLoaded[sessionKey] = true;
      });
      try {
        const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(sessionKey)}`));
        const data = (await res.json()) as { messages: StoredMessage[] };
        const turns = messagesToTurns(data.messages ?? []);
        set((s) => {
          const sess = (s.sessions[sessionKey] ??= emptySession(sessionKey, 'unknown'));
          if (sess.turns.length === 0) sess.turns = turns;
        });
      } catch {
        /* leave empty — live events will still populate the session */
      }
    },

    /** Reduce one live event into the per-session view model. */
    apply(ev) {
      set((s) => {
        // Room events update room state, not the session view model (their
        // sessionKey `room:<id>` must not become a phantom session entry).
        if (ev.type === 'room:message' || ev.type === 'room:round:start' || ev.type === 'room:round:end') {
          const room = s.rooms.find((r) => r.id === ev.roomId);
          switch (ev.type) {
            case 'room:message': {
              if (room && !room.transcript.some((m) => m.ts === ev.ts && m.speaker === ev.speaker)) {
                room.transcript.push({ speaker: ev.speaker, speakerName: ev.speakerName, text: ev.text, ts: ev.ts });
              }
              break;
            }
            case 'room:round:start': {
              s.roomRound[ev.roomId] = ev.speakers;
              break;
            }
            case 'room:round:end': {
              s.roomRound[ev.roomId] = null;
              break;
            }
          }
          return;
        }

        const sess = (s.sessions[ev.sessionKey] ??= emptySession(ev.sessionKey, ev.channel));
        sess.channel = ev.channel;
        sess.lastActivity = ev.ts;
        if (ev.roleId) sess.roleId = ev.roleId;

        switch (ev.type) {
          case 'turn:start': {
            sess.turns.push(newTurn(ev.text, ev.ts, true));
            break;
          }
          case 'llm:response': {
            const turn = sess.turns[sess.turns.length - 1];
            if (!turn) break;
            const it = ensureIteration(turn, ev.iteration);
            if (ev.content) it.content = ev.content;
            for (const tc of ev.toolCalls ?? []) {
              if (!it.tools.some((t) => t.name === tc.name && !t.result)) {
                it.tools.push({ name: tc.name, args: tc.args });
              }
            }
            break;
          }
          case 'tool:call': {
            const turn = sess.turns[sess.turns.length - 1];
            if (!turn) break;
            const it = ensureIteration(turn, ev.iteration);
            if (!it.tools.some((t) => t.name === ev.name && !t.result)) {
              it.tools.push({ name: ev.name, args: ev.args });
            }
            break;
          }
          case 'tool:result': {
            const turn = sess.turns[sess.turns.length - 1];
            if (!turn) break;
            const it = ensureIteration(turn, ev.iteration);
            const pending = [...it.tools].reverse().find((t) => t.name === ev.name && t.result === undefined);
            if (pending) pending.result = ev.result;
            else it.tools.push({ name: ev.name, args: {}, result: ev.result });
            break;
          }
          case 'dispatch:start': {
            const turn = sess.turns[sess.turns.length - 1];
            if (!turn) break;
            const step: DispatchStep = {
              taskId: ev.taskId,
              agent: ev.agent,
              task: ev.task,
              cwd: ev.cwd,
              lines: [],
              running: true,
            };
            turn.dispatches.push(step);
            break;
          }
          case 'dispatch:event': {
            const step = findDispatchIn(sess, ev.taskId);
            if (step) {
              const prefix =
                ev.kind === 'tool' ? '🔧 ' : ev.kind === 'error' ? '⚠️ ' : ev.kind === 'status' ? '· ' : '';
              step.lines.push(prefix + ev.text);
              if (step.lines.length > 300) step.lines.splice(0, step.lines.length - 300);
            }
            break;
          }
          case 'dispatch:end': {
            const step = findDispatchIn(sess, ev.taskId);
            if (step) {
              step.summary = ev.summary;
              step.costUSD = ev.costUSD;
              step.isError = ev.isError;
              step.running = false;
            }
            break;
          }
          case 'delegate:start': {
            const turn = sess.turns[sess.turns.length - 1];
            if (!turn) break;
            const step: DelegateStep = {
              taskId: ev.taskId,
              toRoleId: ev.toRoleId,
              toRoleName: ev.toRoleName,
              task: ev.task,
              // Mirror the backend's derived sub-session key (delegateRole.ts).
              subSessionKey: `${ev.sessionKey}::${ev.toRoleId}`,
              lines: [],
              running: true,
            };
            turn.delegates.push(step);
            break;
          }
          case 'delegate:event': {
            const step = findDelegateIn(sess, ev.taskId);
            if (step) {
              step.lines.push(ev.text);
              if (step.lines.length > 300) step.lines.splice(0, step.lines.length - 300);
            }
            break;
          }
          case 'delegate:end': {
            const step = findDelegateIn(sess, ev.taskId);
            if (step) {
              step.result = ev.result;
              step.isError = ev.isError;
              step.running = false;
            }
            break;
          }
          case 'turn:end': {
            const turn = sess.turns[sess.turns.length - 1];
            if (turn) {
              turn.finalText = ev.finalText;
              turn.running = false;
            }
            break;
          }
          case 'cost:update': {
            bumpUsage(s, ev.entry.costUSD, ev.entry.provider, ev.entry.keyId, ev.entry.roleId);
            break;
          }
          case 'budget:alert': {
            s.alerts = [
              { budgetId: ev.budgetId, scope: ev.scope, match: ev.match, usedUSD: ev.usedUSD, limitUSD: ev.limitUSD, ts: ev.ts },
              ...s.alerts.filter((a) => a.budgetId !== ev.budgetId),
            ].slice(0, 5);
            break;
          }
        }

        // Auto-select the first session that shows activity (but don't yank the
        // user off the welcome/home view).
        if (!s.selected) s.selected = ev.sessionKey;
      });
    },
  })),
);

/** Live-update the spend snapshot so the dashboard moves without a refetch. */
function bumpUsage(
  s: { usage: UsageSnapshot | null },
  costUSD: number,
  provider: string,
  keyId: string,
  roleId?: string,
) {
  if (!s.usage) return;
  const sum = s.usage.summary;
  sum.totalUSD += costUSD;
  sum.count += 1;
  sum.byProvider[provider] = (sum.byProvider[provider] ?? 0) + costUSD;
  sum.byKey[keyId] = (sum.byKey[keyId] ?? 0) + costUSD;
  const r = roleId ?? 'unknown';
  sum.byRole[r] = (sum.byRole[r] ?? 0) + costUSD;
  for (const b of s.usage.budgets) {
    const gov =
      b.budget.scope === 'global' ||
      (b.budget.scope === 'provider' && b.budget.match === provider) ||
      (b.budget.scope === 'key' && b.budget.match === keyId) ||
      (b.budget.scope === 'role' && b.budget.match === roleId);
    if (gov) {
      b.usedUSD += costUSD;
      b.exceeded = b.usedUSD >= b.limitUSD;
    }
  }
}

// --- selector helpers (Pinia getters → plain selectors) ---

export const selectSessionList = (s: AgentStore): SessionState[] =>
  Object.values(s.sessions).sort((a, b) => b.lastActivity - a.lastActivity);

export const selectCurrent = (s: AgentStore): SessionState | null =>
  s.selected ? s.sessions[s.selected] ?? null : null;

export const roleById = (roles: Role[], id?: string): Role | undefined =>
  id ? roles.find((r) => r.id === id) : undefined;

/**
 * Best-effort role attribution for a session. Prefers the live `roleId`, else
 * parses the key: delegated sub-sessions are `<parent>::<role>` (live) or
 * `<parent>__<role>` (sanitized, after reload); direct role chats are
 * `web-<role>-<rand>`. So a role's hub finds its work even before live events
 * have tagged the session.
 */
export function roleForSession(sessionKey: string, roleId?: string): string | undefined {
  if (roleId) return roleId;
  const delim = sessionKey.includes('::') ? '::' : sessionKey.includes('__') ? '__' : null;
  if (delim) return sessionKey.slice(sessionKey.lastIndexOf(delim) + delim.length);
  const m = /^web-(.+)-[a-z0-9]{1,8}$/.exec(sessionKey);
  return m ? m[1] : undefined;
}

/**
 * Role ids with a running turn right now (incl. delegated sub-sessions, whose
 * roleId is the delegate). Returned as a sorted, comma-joined *string* so the
 * Zustand selector compares by value — components only re-render when the set
 * of busy roles actually changes, not on every event. Split back to a Set in
 * the component.
 */
export const selectActiveRoleIds = (s: AgentStore): string => {
  const ids = new Set<string>();
  for (const sess of Object.values(s.sessions)) {
    const last = sess.turns[sess.turns.length - 1];
    if (last?.running && sess.roleId) ids.add(sess.roleId);
  }
  return [...ids].sort().join(',');
};
