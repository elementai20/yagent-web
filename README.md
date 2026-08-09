# yagent-web

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> [`yagent`](../) 的網頁前端 —— 把 agent 的思考過程**即時畫出來**。
> COSCUP 分享《AI Agent 探索：多角色任務處理 Agent》示範專案的一部分。

---

## 這個前端在解什麼問題

一般的聊天 UI 只給你「問題 → 答案」。但 agent 中間跑了 8 圈、呼叫了 5 個工具、
派工給另外兩個角色 —— **那些過程才是你想看的**，尤其在 debug 或講解的時候。

所以這個 UI 的核心不是聊天框，是**把後端事件流還原成一棵可展開的工作流樹**：

```
turn:start
 └ 第 1 圈  llm:response ── tool:call ─ tool:result
 └ 第 2 圈  llm:response ── delegate:start … delegate:end
 └ 第 3 圈  llm:response（最終回覆）
turn:end                                   cost:update ← 這一輪花了多少
```

後端每做一件事就往 WebSocket 推一個事件，前端把它 reduce 成畫面。

---

## 跑起來

```bash
npm install
npm run dev        # http://localhost:3000
```

需要後端在 `NEXT_PUBLIC_API_BASE` 指的位置跑著（開發預設 `http://localhost:3001`）：

```bash
cd .. && npm run dev:web      # 只跑後端
cd .. && npm run dev:all      # 前後端一起（推薦）
```

> ⚠️ **`.env.production` 指的是線上後端。** 別把 production build 拿來當開發用 ——
> 你會對著線上環境打字，那是真的會跑、真的花錢。開發一律用 `npm run dev`。

```bash
npm run build      # next build（靜態匯出）→ dist/，由後端在 prod 直接服務
```

---

## 架構

**Next.js 15（App Router）+ shadcn/ui + Zustand**，`output: 'export'` ——
**整個 app 是純 client 的**，沒有 server component、沒有 API route，
因為狀態全部來自 WebSocket。

| 檔案 | 職責 |
|---|---|
| `lib/store.ts` | Zustand + immer。**`apply()` 是核心** —— 把事件流 reduce 成每個 session 的視圖模型（turns → iterations → tool calls） |
| `lib/useAgentSocket.ts` | WebSocket 連線 + 自動重連 + `abort()` |
| `lib/useSpeech.ts` | Web Speech API，失敗時退回後端 `/api/transcribe` |
| `lib/types.ts` | **協定鏡像** —— 後端事件與 REST 的型別 |
| `app/page.tsx` | 唯一入口，用 `store.view` 切換主畫面（沒有 router） |
| `components/Sidebar.tsx` | 常駐左側導覽（桌機固定欄 / 手機抽屜） |

> `lib/types.ts` 與 `lib/store.ts` 必須跟後端的 `src/events.ts` 保持同步。
> 改後端事件就要改這兩個檔，否則畫面會靜靜地少東西。

### 主要畫面

- **Sessions** — 對話列表，點進去看完整工作流樹，可切 `act`/`advise` 模式、可中止
- **Virtual company** — 16 個角色，點名字開對話，⚙ 改設定（模型 / harness / 工具白名單）
- **Room channels** — 多間會議室，把角色拖進去一起開會
- **Budget & spend** — 總花費、各 key 用量、預算條
- **Monitor** — 外部呼叫記錄
- **AI 眼中的你** — GEO 診斷報告

---

## 環境變數

| 變數 | 說明 |
|---|---|
| `NEXT_PUBLIC_API_BASE` | 後端來源。**build 時 inline**，不是執行期讀取 |

`.env.development` → `http://localhost:3001`，`.env.production` → 線上後端。

---

## License

[Apache License 2.0](LICENSE)
