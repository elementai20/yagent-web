'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from './store';
import { apiUrl, wsUrl } from './api';
import type { AgentEvent } from './types';

/**
 * Opens the WebSocket to the backend, feeds incoming AgentEvents into the
 * store, and exposes a `send` for chatting from the browser. Auto-reconnects.
 */
export function useAgentSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // zustand actions are stable references, so this effect runs once.
  const apply = useAgentStore((s) => s.apply);
  const setConnected = useAgentStore((s) => s.setConnected);
  const seedSessions = useAgentStore((s) => s.seedSessions);

  useEffect(() => {
    let closed = false;

    function connect() {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      // Re-seed on every (re)connect, not just on mount: the backend may not have been
      // listening when this component mounted (tsx watch takes a moment to boot, and
      // restarts on every save). The socket reconnects on its own, so without this the
      // header goes green while the session list stays permanently empty.
      ws.onopen = () => {
        setConnected(true);
        void seed();
      };
      ws.onmessage = (e) => {
        try {
          apply(JSON.parse(e.data) as AgentEvent);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!closed) reconnectRef.current = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
    }

    async function seed() {
      try {
        const res = await fetch(apiUrl('/api/sessions'));
        const data = (await res.json()) as { sessions: string[] };
        seedSessions(data.sessions);
      } catch {
        /* backend not up yet — ws.onopen retries this once it is */
      }
    }

    void seed();
    connect();

    return () => {
      closed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [apply, setConnected, seedSessions]);

  const send = useCallback(
    (sessionKey: string, text: string, roleId?: string, actionMode?: 'act' | 'advise') => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'send', sessionKey, text, roleId, actionMode }));
      }
    },
    [],
  );

  /**
   * Ask the backend to stop this session's running turn. Cancellation is cooperative —
   * the loop stops at its next safe point (after the in-flight tool returns), so the turn
   * ends a moment later with an "aborted" reply rather than vanishing.
   */
  const abort = useCallback((sessionKey: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'abort', sessionKey }));
    }
  }, []);

  return { send, abort };
}
