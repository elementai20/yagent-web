'use client';

import { useEffect, useState } from 'react';
import { useAgentStore } from '@/lib/store';
import type { GeoEngineResult, GeoReport, GeoVerdict } from '@/lib/types';
import { cn } from '@/lib/utils';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const modeLabel = (m: 'closed' | 'open') => (m === 'open' ? '即時檢索' : '訓練記憶');

const ACC: Record<GeoVerdict['accuracy'], { label: string; cls: string }> = {
  correct: { label: '✅ 正確', cls: 'text-green' },
  partial: { label: '🟡 部分', cls: 'text-amber' },
  wrong: { label: '❌ 錯誤', cls: 'text-danger' },
  na: { label: '—', cls: 'text-muted' },
};

/** A single big stat (提及率 / 正確率). */
function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-panel px-4 py-3">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-[11px] text-muted">{hint}</span>
    </div>
  );
}

/** One engine's verdict cell in a question's table row. */
function EngineRow({ e }: { e: GeoEngineResult }) {
  const acc = ACC[e.verdict.accuracy];
  return (
    <div className="grid grid-cols-[minmax(120px,1.2fr)_64px_64px_minmax(80px,1fr)_minmax(140px,2fr)] items-start gap-2 border-b border-border px-3 py-2 text-[12px] last:border-b-0">
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{e.engineLabel}</span>
        <span className="text-[10px] text-muted">{modeLabel(e.mode)}</span>
      </div>
      <span className={cn('font-semibold', e.error ? 'text-danger' : e.verdict.mentioned ? 'text-green' : 'text-muted')}>
        {e.error ? '⚠️ 失敗' : e.verdict.mentioned ? '有' : '無'}
      </span>
      <span className={cn('font-semibold', acc.cls)}>{acc.label}</span>
      <span className="break-words text-muted">{e.verdict.competitors.join('、') || '—'}</span>
      <span className="break-words text-muted">{e.error ? `錯誤:${e.error}` : e.verdict.note || '—'}</span>
    </div>
  );
}

/** The rendered report body. */
function ReportBody({ report }: { report: GeoReport }) {
  const { summary, input, engines, results } = report;
  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Summary */}
      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="提及率" value={pct(summary.mentionRate)} hint="AI 有沒有把你端出來" />
          <Stat label="正確率" value={pct(summary.accuracyRate)} hint="被提到時講得對不對" />
          <Stat label="題數 × 引擎" value={`${results.length}×${engines.length}`} hint="固定題組批次測" />
          <Stat label="成本" value={`$${report.costUSD.toFixed(3)}`} hint={new Date(report.ts).toLocaleDateString('zh-TW')} />
        </div>

        {summary.oneLineAction && (
          <div className="flex items-baseline gap-2.5 rounded-lg border border-[rgba(110,168,254,0.3)] bg-[rgba(110,168,254,0.08)] px-3.5 py-3">
            <span className="shrink-0 text-[11px] uppercase tracking-wide text-accent">行動建議</span>
            <span className="whitespace-pre-wrap break-words text-[14px] text-foreground">{summary.oneLineAction}</span>
          </div>
        )}

        {summary.topCompetitors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted">最常被端出的競品:</span>
            {summary.topCompetitors.map((c) => (
              <span key={c.name} className="rounded border border-border px-1.5 py-0.5 text-foreground">
                {c.name} <span className="tabular-nums text-muted">×{c.count}</span>
              </span>
            ))}
          </div>
        )}

        {summary.gaps.length > 0 && (
          <div className="rounded-lg border border-border bg-panel px-4 py-3">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">認知缺口</p>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] text-foreground">
              {summary.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Per-question breakdown */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-semibold text-foreground">逐題結果 · {input.company}</h3>
        {results.map((qr) => (
          <div key={qr.question.id} className="overflow-hidden rounded-lg border border-border bg-panel">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="rounded border border-border px-1 text-[10px] uppercase tracking-wide text-muted">
                {qr.question.kind === 'entity' ? '實體題' : '產業題'}
              </span>
              <span className="text-[13px] text-foreground">{qr.question.text}</span>
            </div>
            <div className="grid grid-cols-[minmax(120px,1.2fr)_64px_64px_minmax(80px,1fr)_minmax(140px,2fr)] gap-2 border-b border-border bg-[var(--bg)] px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted">
              <span>引擎</span>
              <span>提及</span>
              <span>正確性</span>
              <span>競品</span>
              <span>判讀</span>
            </div>
            {qr.engines.map((e) => (
              <EngineRow key={e.engineId} e={e} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * GEO diagnosis pane — a deliverable job (input a company → get a "how AI sees
 * you" report), NOT a chat role. Runs the fixed vertical question set against
 * several AI engines via the backend and renders the report inline.
 */
export default function GeoView() {
  const report = useAgentStore((s) => s.geoReport);
  const reports = useAgentStore((s) => s.geoReports);
  const running = useAgentStore((s) => s.geoRunning);
  const error = useAgentStore((s) => s.geoError);
  const loadGeoReports = useAgentStore((s) => s.loadGeoReports);
  const runGeo = useAgentStore((s) => s.runGeo);
  const openGeoReport = useAgentStore((s) => s.openGeoReport);

  const [company, setCompany] = useState('ElementAI');

  useEffect(() => {
    void loadGeoReports();
  }, [loadGeoReports]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-foreground">🔎 GEO 診斷 · AI 眼中的你</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            主流 AI 現在怎麼講一家公司、講不講、講對嗎。固定題組批次測(裝修/系統櫃/安裝業 × 台灣華語圈)。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <select
              value={report?.id ?? ''}
              onChange={(ev) => openGeoReport(ev.target.value)}
              className="rounded-md border border-border bg-panel px-2 py-1.5 text-[13px] text-foreground"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.input.company} · {new Date(r.ts).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </option>
              ))}
            </select>
          )}
          <input
            value={company}
            onChange={(ev) => setCompany(ev.target.value)}
            disabled={running}
            placeholder="公司名"
            className="w-32 rounded-md border border-border bg-panel px-2.5 py-1.5 text-[13px] text-foreground disabled:opacity-50"
          />
          <button
            onClick={() => void runGeo({ company: company.trim() || 'ElementAI' })}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-[13px] text-accent hover:bg-[rgba(110,168,254,0.08)] disabled:opacity-50"
          >
            {running && <span className="h-[11px] w-[11px] animate-spin rounded-full border-2 border-accent border-t-transparent" />}
            {running ? '診斷中…' : '跑診斷'}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="m-5 rounded-lg border border-[rgba(229,72,77,0.4)] bg-[rgba(229,72,77,0.06)] px-4 py-3 text-[13px] text-danger">
            {error}
          </div>
        )}
        {running && (
          <div className="grid place-items-center px-6 py-16 text-center text-muted">
            <p>
              正在問各家 AI(固定題組 × {report?.engines.length ?? 3} 個引擎)…
              <br />
              批次測約數十秒,跑完會產出一份「AI 眼中的你」診斷報告。
            </p>
          </div>
        )}
        {!running && report && <ReportBody report={report} />}
        {!running && !report && !error && (
          <div className="grid place-items-center px-6 py-16 text-center text-muted">
            <p>
              還沒有診斷報告。
              <br />
              輸入公司名(預設 ElementAI)按「跑診斷」,就會實測主流 AI 現在怎麼講這家公司。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
