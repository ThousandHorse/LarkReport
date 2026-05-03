# LarkReport — Claude Code ガイド

Google Tasks のタスクを毎日自動取得し、Tailwind CSS でビジュアルレポート（PNG）を生成して Slack に自動配信するツール。

## アーキテクチャ

```
Google Tasks API
  ↓ fetchTodayTasks()          → { completed, incomplete, total, completedCount, progressRate }
Gemini API（gemini-2.5-flash 優先・503 時は gemini-2.5-flash-lite → gemini-flash-latest にフォールバック）
  ↓ generateMorningComment()   → aiComment（朝）
  ↓ generateEveningComment()   → aiComment（夜）
generateMorningHTML() / generateEveningHTML()   ← Tailwind CSS CDN
  ↓ htmlToPng()                ← Playwright page.setContent()（ローカルレンダリング）
  ↓ sendToSlack()              ← Slack Files Upload API（Bot Token）
Slack チャンネル（PNG 添付）
```

## 技術的決定事項

| 決定 | 採用内容 | 理由 |
|---|---|---|
| HTML→PNG | Playwright `page.setContent()` | 外部サービス不要・CDN 読み込みを `networkidle` で保証 |
| Slack 送信 | Files Upload API（Bot Token） | Incoming Webhook は PNG 添付不可 |
| モジュール形式 | ESM（`"type": "module"`） | `import/export` 構文を使用 |
| レポート幅 | 固定 800px | PNG のレイアウト崩れを防ぐ |

## 環境変数

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GEMINI_API_KEY=AIza...       # Google AI Studio で取得（無料枠あり）
SLACK_BOT_TOKEN=xoxb-...     # スコープ: files:write, chat:write
SLACK_CHANNEL_ID=C...        # チャンネル詳細の最下部で確認
```

GitHub Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GEMINI_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`

---

## 実装ワークフロー

```
Step 1: daily-report-plan.md で PR 仕様確認
Step 2: 実装（完了条件を全て満たす）
Step 3: コードレビュー（下記観点を自己確認）
Step 4: git push origin feature/PR-XX-description → gh pr create --base develop
Step 5: ユーザーのマージを待つ ← 次の PR はマージ確認後に開始
```

- **1PR ずつ進める**（複数 PR を一度に実装しない）
- **PR マージはユーザーが手動**（`gh pr merge` は使わない）
- **develop への直接 push 禁止**（必ず feature ブランチ経由）

---

## Git Flow 運用

```bash
# ブランチ作成
git flow feature start PR-XX-description

# PR 作成前にリモートへ push
git push origin feature/PR-XX-description

# PR 作成（--base develop を必ず指定）
gh pr create --base develop --title "PR-XX: タイトル"

# ユーザーがマージしたら develop を最新化
git checkout develop && git pull origin develop
```

⛔ 禁止事項:
- `git push origin develop`（develop への直接 push）
- `git flow feature finish`（ローカルで勝手にマージ）
- `gh pr merge`（CLI でのマージ操作禁止）

---

## コードレビュー観点

PR 作成前に以下を自己確認すること。

1. **規約違反**: 下記プロジェクト規約に反していないか
   - `"type": "module"` (ESM): `import/export` を使用
   - Playwright は `page.setContent()` でローカルレンダリング（`page.goto()` 禁止）
   - Slack は Files Upload API の3ステップ（Incoming Webhook 禁止）
   - 単体実行ブロック: `if (process.argv[1] && process.argv[1].endsWith('xxx.js')) { ... }`
   - 環境変数は `process.env` から取得（ハードコード禁止）
2. **エラーハンドリング**: API 呼び出しや非同期処理に try/catch があるか
3. **完了条件**: `daily-report-plan.md` の完了条件を全て満たしているか

---

## モジュール実装パターン

### fetchTasks.js

```javascript
import { google } from 'googleapis';
const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
// 今日の期限タスクのみ取得
tasks.tasks.list({ dueMin: startOfDay, dueMax: endOfDay, showCompleted: true, showHidden: true })
```

戻り値: `{ completed: [], incomplete: [], total: number, completedCount: number, progressRate: number }`

### screenshot.js

```javascript
import { chromium } from '@playwright/test';
await page.setViewportSize({ width: 800, height: 1200 });
await page.setContent(html, { waitUntil: 'networkidle' }); // Tailwind CDN 完全読み込みを待つ
const screenshot = await page.screenshot({ type: 'png', fullPage: true });
```

- `page.goto()` は使わない（外部 URL 不要）
- `waitUntil: 'networkidle'` で Tailwind CDN の JS 実行完了を保証

### summarize.js

```javascript
// 503 時フォールバック順: gemini-2.5-flash → gemini-2.5-flash-lite → gemini-flash-latest
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
for (let i = 0; i < FALLBACK_MODELS.length; i++) {
  try {
    const model = genAI.getGenerativeModel({ model: FALLBACK_MODELS[i] });
    return (await model.generateContent(prompt)).response.text();
  } catch (err) {
    const is503 = err.status === 503 || err.message?.includes('503');
    if (is503 && i < FALLBACK_MODELS.length - 1) continue;
    throw new Error(`生成に失敗しました: ${err.message}`, { cause: err });
  }
}
```

### sendSlack.js（3ステップ必須）

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

### generateHTML.js（デザイン規約）

```css
/* 共通 */
body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; }

/* 朝: ヘッダー bg-gradient-to-r from-blue-500 to-indigo-600 */
/* 夜: ヘッダー bg-gradient-to-r from-indigo-700 to-purple-700 */
```

- Tailwind CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- モックアップ参照: `mock/morning-mockup.html` / `mock/evening-mockup.html`

### 単体実行ブロック（全モジュール共通）

```javascript
if (process.argv[1] && process.argv[1].endsWith('xxx.js')) {
  yourFunction(testData).then(result => {
    console.log('結果:', JSON.stringify(result, null, 2));
  }).catch(console.error);
}
```

---

## 単体テスト実行コマンド

```bash
node src/fetchTasks.js    # Google Tasks 取得確認
node src/summarize.js     # AI コメント生成確認
node src/screenshot.js    # test-screenshot.png 生成確認
npm run morning           # 朝レポート E2E 実行
npm run evening           # 夜レポート E2E 実行
```

---

## PR 実装フェーズ（詳細: daily-report-plan.md）

```
フェーズ1（PR-01〜06）: パイプライン検証
  PR-05: screenshot.js ← node src/screenshot.js で test-screenshot.png 確認
  PR-06: sendSlack.js  ← モックアップ PNG が Slack に届く ★E2E検証

フェーズ2（PR-07〜08）: API 接続
  PR-07: fetchTasks.js / PR-08: summarize.js

フェーズ3（PR-09〜12）: 動的テンプレート + 統合
  PR-09〜10: generateHTML.js（朝/夜）
  PR-11〜12: main-morning.js / main-evening.js ← npm run morning/evening で E2E 確認

フェーズ4（PR-13〜14）: GitHub Actions 自動化
```

---

## PR 概要テンプレート

```markdown
## 概要

[このPRで何を実装したかを2〜3文で説明する]

## 実装内容

- `src/xxx.js`: [ファイルの役割と実装した機能]
- `package.json`: [追加した依存パッケージ（あれば）]

## 完了条件チェックリスト

- [ ] [完了条件1]
- [ ] [完了条件2]

## 動作確認方法

```bash
node src/xxx.js
# 期待される出力: ...
```

## 関連情報

- 実装詳細: daily-report-plan.md PR-XX
- 依存する PR: PR-XX（マージ済み）
```

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|---|---|---|
| `Cannot use import statement` | ESM 未設定 | `package.json` に `"type": "module"` を追加 |
| Playwright タイムアウト | CDN 読み込み待ち不足 | `waitUntil: 'networkidle'` を確認 |
| `Slack アップロード URL の取得に失敗` | Bot Token スコープ不足 | `files:write` + `chat:write` を確認 |
| Google Tasks 0件 | 日付フィルタの問題 | `dueMin` / `dueMax` の ISO 形式を確認 |
| `chromium not found` | インストール未実行 | `npx playwright install chromium` を実行 |
| `invalid_auth`（Slack） | Bot Token が間違っている | `xoxb-` で始まる Bot Token か確認 |
| `invalid_grant`（Google） | リフレッシュトークン失効 | OAuth2 フローを再実行してトークンを再取得 |

### 事前確認チェックリスト

```bash
npm install
npx playwright install chromium
cat .env | grep -E "^[A-Z]"   # 全変数が設定されているか確認
```

---

## レビュー指摘対応

```bash
# インラインコメント一覧を取得
gh api repos/ThousandHorse/LarkReport/pulls/{PR番号}/comments \
  --jq '.[] | {id: .id, author: .user.login, path: .path, body: .body}'

# 対応済みリプライを投稿
gh api repos/ThousandHorse/LarkReport/pulls/{PR番号}/comments/{comment_id}/replies \
  -X POST --input - << 'EOF'
{"body": "対応済みです。\n\n〇〇を修正しました（commit: xxxxxxx）。\n\n---\n*Comment by Claude*"}
EOF
```

リプライ末尾には必ず `---\n*Comment by Claude*` を付けること（AI によるコメントと識別できるようにする）。
