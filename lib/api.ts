// Where the backend lives. Empty → relative paths (monolith: backend serves
// web/dist same-origin). In a split deploy set NEXT_PUBLIC_API_BASE to the
// backend's public origin at build time; Next inlines NEXT_PUBLIC_* into the
// bundle. In dev, .env.development points it at http://localhost:3001.
const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

/** Absolute URL for a REST path, honoring NEXT_PUBLIC_API_BASE (or same-origin). */
export const apiUrl = (path: string): string => `${BASE}${path}`;

/** WebSocket URL for /ws, derived from the same base (http→ws, https→wss). */
export const wsUrl = (): string => {
  const origin = BASE || (typeof location !== 'undefined' ? location.origin : '');
  return origin.replace(/^http/, 'ws') + '/ws';
};
