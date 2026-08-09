'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_URL } from '@/lib/api';

type Health = 'probing' | 'up' | 'down';

/**
 * The game world (WorkAdventure), embedded.
 *
 * It is a *different origin* from this app (its own compose stack on :8081),
 * so we can only frame it — we cannot read into it. Two consequences drive
 * this component:
 *
 *   1. A cross-origin iframe fires `onLoad` even when the server never
 *      answered, so `onLoad` cannot tell us "the world is up". We probe with
 *      a `no-cors` fetch instead: it resolves opaque on success and rejects on
 *      a connection failure, which is exactly the signal we need to tell the
 *      user "the stack isn't running" instead of showing a blank rectangle.
 *   2. The game needs camera/mic for meetings, and a cross-origin frame only
 *      gets them if the embedder hands them over via `allow`.
 */
export default function WorldView() {
  const [health, setHealth] = useState<Health>('probing');
  // Bumping this remounts the iframe — the only way to reload a cross-origin
  // frame, since we cannot touch its contentWindow.location.
  const [nonce, setNonce] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  const probe = useCallback(async () => {
    setHealth('probing');
    try {
      await fetch(GAME_URL, { mode: 'no-cors', cache: 'no-store' });
      setHealth('up');
    } catch {
      setHealth('down');
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  const reload = () => {
    setNonce((n) => n + 1);
    void probe();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="text-base">🗺️</span>
        <h2 className="m-0 text-[14px] font-semibold text-foreground">世界</h2>
        <span
          className={
            'rounded border px-1.5 text-[11px] font-semibold ' +
            (health === 'up'
              ? 'border-green text-green'
              : health === 'down'
                ? 'border-danger text-danger'
                : 'border-border text-muted')
          }
        >
          {health === 'up' ? '執行中' : health === 'down' ? '沒有回應' : '檢查中…'}
        </span>
        <code className="truncate text-[11px] text-muted">{GAME_URL}</code>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={reload}
            className="rounded-md border border-border px-2 py-1 text-[12px] text-muted hover:bg-[var(--panel-2)] hover:text-foreground"
          >
            重新載入
          </button>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-2 py-1 text-[12px] text-muted no-underline hover:bg-[var(--panel-2)] hover:text-foreground"
          >
            新分頁開啟 ↗
          </a>
        </div>
      </header>

      {health === 'down' ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-lg">
            <p className="m-0 text-[14px] font-semibold text-foreground">世界還沒起來</p>
            <p className="mt-1 text-[13px] text-muted">
              {GAME_URL} 沒有回應。WorkAdventure 那套容器是獨立跑的，要先啟動：
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-[var(--panel-2)] p-3 text-[12px]">
              <code>cd star-map-y/game &amp;&amp; docker compose up -d</code>
            </pre>
            <button
              onClick={reload}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-[12px] text-foreground hover:bg-[var(--panel-2)]"
            >
              再檢查一次
            </button>
          </div>
        </div>
      ) : (
        <iframe
          key={nonce}
          ref={frame}
          src={GAME_URL}
          title="star-map-y world"
          className="min-h-0 flex-1 border-0 bg-black"
          // Cross-origin frames get no device access unless the embedder grants it.
          allow="camera; microphone; display-capture; autoplay; fullscreen; clipboard-write"
suppressHydrationWarning
        />
      )}
    </div>
  );
}
