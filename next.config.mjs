/** @type {import('next').NextConfig} */
// Static export: the whole app is client-only (WebSocket, Web Speech, store view
// state — no SSR data needs). `output: 'export'` emits static files to ./out,
// which the build script renames to ./dist so the backend (src/channels/web.ts)
// and the Zeabur static deploy keep serving web/dist unchanged.
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // This app lives in a subdir of the yagent repo (which has its own lockfile);
  // pin the tracing root to silence Next's multi-lockfile workspace warning.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
