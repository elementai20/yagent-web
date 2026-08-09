// Mirror of the backend AgentEvent union (src/events.ts). Kept in sync by hand —
// this is a small teaching demo, so we don't share a package.
export interface BaseEvent {
  sessionKey: string;
  channel: string;
  /** Active virtual-company role id for the turn, if any. */
  roleId?: string;
  ts: number;
}

export type ToolCall = { name: string; args: Record<string, unknown> };

export type AgentEvent =
  | (BaseEvent & { type: 'turn:start'; text: string })
  | (BaseEvent & { type: 'llm:response'; iteration: number; content?: string; toolCalls?: ToolCall[] })
  | (BaseEvent & { type: 'tool:call'; iteration: number; name: string; args: Record<string, unknown> })
  | (BaseEvent & { type: 'tool:result'; iteration: number; name: string; result: string })
  | (BaseEvent & { type: 'turn:end'; finalText: string; iterations: number })
  | (BaseEvent & { type: 'dispatch:start'; taskId: string; agent: string; task: string; cwd: string })
  | (BaseEvent & { type: 'dispatch:event'; taskId: string; kind: string; text: string })
  | (BaseEvent & {
      type: 'dispatch:end';
      taskId: string;
      summary: string;
      costUSD?: number;
      isError: boolean;
      exitCode: number;
    })
  | (BaseEvent & { type: 'delegate:start'; taskId: string; toRoleId: string; toRoleName: string; task: string })
  | (BaseEvent & { type: 'delegate:event'; taskId: string; kind: string; text: string })
  | (BaseEvent & { type: 'delegate:end'; taskId: string; toRoleId: string; result: string; isError: boolean })
  | (BaseEvent & { type: 'room:message'; roomId: string; speaker: string; speakerName?: string; text: string })
  | (BaseEvent & { type: 'room:round:start'; roomId: string; speakers: string[] })
  | (BaseEvent & { type: 'room:round:end'; roomId: string; speakers: string[] })
  | (BaseEvent & { type: 'cost:update'; entry: UsageEntry })
  | (BaseEvent & {
      type: 'budget:alert';
      budgetId: string;
      scope: string;
      match?: string;
      usedUSD: number;
      limitUSD: number;
    });

// --- Config / billing shapes (mirror backend) ---

export interface Role {
  id: string;
  name: string;
  title?: string;
  emoji?: string;
  description: string;
  model?: string;
  codingAgent?: string;
  /** Threads data backend for threads_trend: 'ensembledata' | 'browser'. */
  threadsSource?: string;
  skill?: string;
  /** Tool allowlist (names); undefined/empty = all tools. */
  tools?: string[];
  /** Skill dirs this role owns; undefined/empty = all skills. */
  skills?: string[];
  /** Knowledge doc paths (relative to knowledge/) bound to this role. */
  knowledge?: string[];
  /** Default action mode: 'act' (can use mutating tools) or 'advise' (read-only). */
  actionMode?: 'act' | 'advise';
}

export interface ToolInfo {
  name: string;
  description: string;
}

/** Patch sent to POST /api/roles/:id — only configurable fields. */
export interface RolePatch {
  model?: string;
  codingAgent?: string;
  threadsSource?: string;
  tools?: string[];
  skills?: string[];
  knowledge?: string[];
  actionMode?: 'act' | 'advise';
}

export interface UsageEntry {
  ts: number;
  sessionKey: string;
  roleId?: string;
  source: 'llm' | 'coding-agent';
  provider: string;
  keyId: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUSD: number;
}

export interface KeyAccount {
  id: string;
  provider: string;
  label: string;
  env?: string;
}

export interface Budget {
  id: string;
  scope: string;
  match?: string;
  limitUSD: number;
  periodDays: number;
}

export interface BudgetStatus {
  budget: Budget;
  usedUSD: number;
  limitUSD: number;
  exceeded: boolean;
}

export interface UsageSnapshot {
  summary: {
    totalUSD: number;
    byProvider: Record<string, number>;
    byKey: Record<string, number>;
    byRole: Record<string, number>;
    count: number;
  };
  recent: UsageEntry[];
  keys: KeyAccount[];
  budgets: BudgetStatus[];
}

// --- Monitor (threads_trend call log) — mirrors src/monitor/threadsLog.ts ---

export interface ThreadsLogEntry {
  ts: number;
  keyword: string;
  sort: 'top' | 'recent';
  source?: string;
  ok: boolean;
  httpStatus: number;
  resultCount: number;
  units?: number;
  error?: string;
  preview?: string;
}

export interface MonitorSnapshot {
  entries: ThreadsLogEntry[];
  todayCount: number;
}

// --- GEO diagnosis (mirror src/geo/types.ts) ---

export interface GeoEngine {
  id: string;
  label: string;
  mode: 'closed' | 'open';
  model: string;
}

export interface GeoVerdict {
  mentioned: boolean;
  accuracy: 'correct' | 'partial' | 'wrong' | 'na';
  competitors: string[];
  citedSources?: string[];
  note: string;
}

export interface GeoEngineResult {
  engineId: string;
  engineLabel: string;
  mode: 'closed' | 'open';
  model: string;
  rawAnswer: string;
  verdict: GeoVerdict;
  error?: string;
}

export interface GeoQuestionResult {
  question: { id: string; kind: 'discovery' | 'entity'; text: string };
  engines: GeoEngineResult[];
}

export interface GeoSummary {
  mentionRate: number;
  accuracyRate: number;
  topCompetitors: { name: string; count: number }[];
  gaps: string[];
  oneLineAction: string;
}

export interface GeoReport {
  id: string;
  ts: number;
  input: { company: string; aliases: string[]; vertical: string; market: string; groundTruth: string };
  engines: GeoEngine[];
  results: GeoQuestionResult[];
  summary: GeoSummary;
  costUSD: number;
}

// --- Room channels (mirror src/rooms/types.ts) ---

/** One utterance in a room. `speaker` is 'user' | 'system' | a role id. */
export interface RoomMsg {
  speaker: string;
  /** Display name for role speakers (present on live events). */
  speakerName?: string;
  text: string;
  ts: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  participants: string[];
  transcript: RoomMsg[];
  /** Absent on rooms created before multi-room landed; treated as oldest. */
  createdAt?: number;
}

// --- Derived view model the store builds from the event stream ---

export interface ToolStep {
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

export interface Iteration {
  iteration: number;
  content?: string;
  tools: ToolStep[];
}

/** A delegated coding-agent run, rendered as a live sub-panel in a turn. */
export interface DispatchStep {
  taskId: string;
  agent: string;
  task: string;
  cwd?: string;
  lines: string[];
  summary?: string;
  costUSD?: number;
  isError?: boolean;
  running: boolean;
}

/** A subtask handed to another role, rendered as a live sub-panel in a turn. */
export interface DelegateStep {
  taskId: string;
  toRoleId: string;
  toRoleName: string;
  task: string;
  /** The delegate's own session key (`<caller>::<role>`) — click-through target. */
  subSessionKey: string;
  lines: string[];
  result?: string;
  isError?: boolean;
  running: boolean;
}

export interface Turn {
  userText: string;
  iterations: Iteration[];
  dispatches: DispatchStep[];
  delegates: DelegateStep[];
  finalText?: string;
  running: boolean;
  startedAt: number;
}

export interface SessionState {
  sessionKey: string;
  channel: string;
  roleId?: string;
  turns: Turn[];
  lastActivity: number;
}

export interface BudgetAlertView {
  budgetId: string;
  scope: string;
  match?: string;
  usedUSD: number;
  limitUSD: number;
  ts: number;
}
