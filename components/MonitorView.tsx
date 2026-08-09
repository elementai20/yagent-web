'use client';

import { useEffect } from 'react';
import { useAgentStore } from '@/lib/store';
import type { ThreadsLogEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** One row of the threads_trend call log. */
function LogRow({ e }: { e: ThreadsLogEntry }) {
  const quota = e.httpStatus === 495 || /maximum requests limit/i.test(e.error ?? '');
  return (
    <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="tabular-nums text-muted">{fmtTime(e.ts)}</span>
        <span className="font-semibold text-foreground">「{e.keyword}」</span>
        <span className="rounded border border-border px-1 text-[10px] uppercase tracking-wide text-muted">{e.sort}</span>
        {e.source && (
          <span className="rounded border border-border px-1 text-[10px] tracking-wide text-accent">
            {e.source === 'browser' ? '🌐 browser' : e.source === 'ensembledata' ? '⚡ api' : e.source}
          </span>
        )}
        <span
          className={cn(
            'rounded border px-1.5 text-[11px] font-semibold',
            e.ok ? 'border-green text-green' : quota ? 'border-amber text-amber' : 'border-danger text-danger',
          )}
        >
          {e.ok ? `OK · ${e.resultCount} 篇` : quota ? '配額用完' : `HTTP ${e.httpStatus || 'ERR'}`}
        </span>
        {e.units != null && <span className="tabular-nums text-muted">{e.units} units</span>}
      </div>
      {e.ok && e.preview && <p className="truncate text-[12px] text-muted">{e.preview}</p>}
      {!e.ok && e.error && <p className="break-words text-[12px] text-danger">{e.error}</p>}
    </div>
  );
}

/**
 * Monitor pane: the threads_trend call log (what we sent → what came back). Reads
 * /api/monitor/threads so the *real* usage is visible instead of the model's guess.
 */
export default function MonitorView() {
  const monitor = useAgentStore((s) => s.monitor);
  const loadMonitor = useAgentStore((s) => s.loadMonitor);

  useEffect(() => {
    void loadMonitor();
  }, [loadMonitor]);

  const entries = monitor?.entries ?? [];
  const today = monitor?.todayCount ?? 0;
  const okToday = entries.filter((e) => e.ok && new Date(e.ts).toDateString() === new Date().toDateString()).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-foreground">🖥️ Monitor · threads_trend</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            今日呼叫 <strong className="text-foreground">{today}</strong> 次（成功 {okToday}）· 免費額度以 units 計、每日重置
          </p>
        </div>
        <button
          onClick={() => void loadMonitor()}
          className="rounded-md border border-border px-3 py-1.5 text-[13px] text-accent hover:border-accent"
        >
          ↻ 重新整理
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="grid flex-1 place-items-center px-6 py-16 text-center text-muted">
            <p>
              還沒有 threads_trend 呼叫紀錄。
              <br />
              到趨勢分析師那邊搜個關鍵字，這裡就會出現每次打出去 / 回來的結果。
            </p>
          </div>
        ) : (
          entries.map((e, i) => <LogRow key={`${e.ts}-${i}`} e={e} />)
        )}
      </div>
    </div>
  );
}
