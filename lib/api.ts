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

/**
 * Origin of the game world (the WorkAdventure stack), which is a *separate*
 * deployment from the backend — hence its own variable rather than a path off
 * BASE. Locally it is the compose stack in `star-map-y/game` on :8081.
 * Inlined at build time like every NEXT_PUBLIC_*.
 */
export const GAME_URL = (process.env.NEXT_PUBLIC_GAME_URL ?? 'http://localhost:8081').replace(/\/+$/, '');
