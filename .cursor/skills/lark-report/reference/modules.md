# モジュール実装パターン

## fetchTasks.js

```javascript
import { google } from 'googleapis';
// OAuth2 - アクセストークンをリフレッシュトークンから自動取得
const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
// 今日の期限タスクのみ取得
tasks.tasks.list({ dueMin: startOfDay, dueMax: endOfDay, showCompleted: true, showHidden: true })
```

戻り値の型: `{ completed: [], incomplete: [], total: number, completedCount: number, progressRate: number }`

## screenshot.js

```javascript
import { chromium } from '@playwright/test';
// URL 経由ではなく HTML 文字列を直接レンダリング
await page.setViewportSize({ width: 800, height: 1200 });
await page.setContent(html, { waitUntil: 'networkidle' }); // Tailwind CDN 完全読み込みを待つ
const screenshot = await page.screenshot({ type: 'png', fullPage: true });
```

- `page.goto()` は使わない（外部 URL 不要）
- `waitUntil: 'networkidle'` で Tailwind CDN の JS 実行完了を保証

## sendSlack.js（3ステップ必須）

```javascript
// Step 1: アップロード URL を取得
POST https://slack.com/api/files.getUploadURLExternal
  body: { filename, length: imageBuffer.length }
  → { upload_url, file_id }

// Step 2: PNG をアップロード
PUT upload_url
  headers: { 'Content-Type': 'image/png' }
  body: imageBuffer

// Step 3: チャンネルに投稿
POST https://slack.com/api/files.completeUploadExternal
  body: { files: [{ id: file_id }], channel_id, initial_comment: message }
```

- Incoming Webhook は PNG 添付不可のため使わない
- Bot Token に `files:write` + `chat:write` スコープが必要

## generateHTML.js（デザイン規約）

```css
/* 共通 */
body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; }

/* 朝レポート */
bg-gradient-to-r from-blue-500 to-indigo-600   /* ヘッダー */
bg-gradient-to-br from-blue-50 to-indigo-100    /* 背景 */

/* 夜レポート */
bg-gradient-to-r from-indigo-700 to-purple-700  /* ヘッダー */
bg-gradient-to-br from-indigo-900 to-purple-900 /* 背景 */
```

- 固定幅 800px（PNG のレイアウト崩れを防ぐ）
- Tailwind CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- モックアップ参照: `mock/morning-mockup.html` / `mock/evening-mockup.html`

## 単体実行ブロック（全モジュール共通）

```javascript
if (process.argv[1].endsWith('xxx.js')) {
  // テストデータで関数を呼び出してコンソール出力
  yourFunction(testData).then(result => {
    console.log('結果:', JSON.stringify(result, null, 2));
  }).catch(console.error);
}
```
