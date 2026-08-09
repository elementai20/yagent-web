'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

/**
 * Fetches a session's saved memory. Lifted into a hook so the panel can render
 * in both the desktop column and the mobile drawer off one fetch. Reloads when
 * sessionKey changes or `reloadKey` bumps (the agent may have called save_memory).
 */
export function useMemory(sessionKey: string | null, reloadKey: number) {
  const [memory, setMemory] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sessionKey) {
      setMemory('');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(sessionKey)}/memory`));
      const data = (await res.json()) as { memory: string };
      setMemory(data.memory ?? '');
    } catch {
      setMemory('');
    } finally {
      setLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  return { memory, loading, reload: load };
}

interface MemoryPanelProps {
  memory: string;
  loading: boolean;
  reload: () => void;
  canRefresh: boolean;
  /** Mobile drawer mode shows a close button and calls onClose. */
  showClose?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function MemoryPanel({
  memory,
  loading,
  reload,
  canRefresh,
  showClose,
  onClose,
  className = '',
}: MemoryPanelProps) {
  return (
    <div className={`flex min-h-0 flex-col bg-panel ${className}`}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs uppercase tracking-wide text-muted">Memory</span>
        <span className="flex items-center gap-2">
          <button
            className="rounded-sm border border-border px-2 py-0.5 text-muted disabled:opacity-50"
            onClick={reload}
            disabled={!canRefresh}
          >
            ↻
          </button>
          {showClose && (
            <button
              className="rounded-sm border border-border px-2 py-0.5 text-muted"
              aria-label="Close"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </span>
      </header>
      <div className="overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-[13px] text-muted">loading…</p>
        ) : !memory.trim() ? (
          <p className="text-[13px] text-muted">No memory saved for this session.</p>
        ) : (
          <pre className="m-0 whitespace-pre-wrap break-words text-xs leading-relaxed">{memory}</pre>
        )}
      </div>
    </div>
  );
}
