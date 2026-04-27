---
name: lark-report
description: >-
  LarkReport プロジェクト（Google Tasks → Tailwind HTML → Playwright PNG → Slack 自動配信）の実装ガイド。
  LarkReport の PR 実装・デバッグ・Git Flow 操作・モジュール設計・環境変数設定・コード規約の確認が必要なときに使用する。
  「PR-XX を実装して」「fetchTasks を作って」「Slack に送れない」などの操作で自動的に適用する。
---

# LarkReport 実装スキル

## アーキテクチャ

```
Google Tasks API
  ↓ fetchTodayTasks()          → { completed, incomplete, total, completedCount, progressRate }
Claude API
  ↓ generateMorningComment()   → aiComment（朝）
  ↓ generateEveningComment()   → aiComment（夜）
generateMorningHTML() / generateEveningHTML()   ← Tailwind CSS CDN
  ↓ htmlToPng()                ← Playwright page.setContent()（ローカルレンダリング）
  ↓ sendToSlack()              ← Slack Files Upload API（Bot Token）
Slack チャンネル（PNG 添付）
```

## 技術的決定事項（理由付き）

| 決定 | 採用内容 | 理由 |
|---|---|---|
| HTML→PNG | Playwright `page.setContent()` | 外部サービス不要・CDN 読み込みを `networkidle` で保証 |
| Slack 送信 | Files Upload API（Bot Token） | Incoming Webhook は PNG 添付不可 |
| モジュール形式 | ESM（`"type": "module"`） | `import/export` 構文を使用 |
| レポート幅 | 固定 800px | PNG のレイアウト崩れを防ぐ |

## モジュール実装パターン

### fetchTasks.js
```javascript
import { google } from 'googleapis';
// OAuth2 - アクセストークンをリフレッシュトークンから自動取得
const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
// 今日の期限タスクのみ取得
tasks.tasks.list({ dueMin: startOfDay, dueMax: endOfDay, showCompleted: true, showHidden: true })
```

### screenshot.js
```javascript
import { chromium } from '@playwright/test';
// URL 経由ではなく HTML 文字列を直接レンダリング
await page.setViewportSize({ width: 800, height: 1200 });
await page.setContent(html, { waitUntil: 'networkidle' }); // Tailwind CDN 完全読み込みを待つ
const screenshot = await page.screenshot({ type: 'png', fullPage: true });
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
```javascript
// 共通
body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; }

// 朝レポート
bg-gradient-to-r from-blue-500 to-indigo-600   // ヘッダー
bg-gradient-to-br from-blue-50 to-indigo-100    // 背景

// 夜レポート
bg-gradient-to-r from-indigo-700 to-purple-700  // ヘッダー
bg-gradient-to-br from-indigo-900 to-purple-900 // 背景
```

## 環境変数

```bash
# Google Tasks API
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Slack Bot Token（xoxb- で始まる）
# 必要スコープ: files:write, chat:write
# チャンネルに Bot を招待してから使用
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...   # チャンネル ID（チャンネル詳細の最下部）
```

GitHub Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `ANTHROPIC_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`

## 実装ワークフロー（サブエージェント）

### Step 1: PR 仕様確認（実装前）

**exploreサブエージェント**を起動して `daily-report-plan.md` から対象 PR の仕様を調査する。

```
Task({
  subagent_type: "explore",
  description: "PR-XX の仕様確認",
  prompt: `
    /Users/chibatakuma/Documents/Project/LarkReport/daily-report-plan.md
    から以下の情報を抽出してください。

    【対象】PR-XX（例: PR-05）

    調査項目：
    1. このPRで作成・変更するファイル名と関数シグネチャ
    2. 完了条件チェックリスト（全項目）
    3. このPRが依存する前のPR（依存関係）
    4. 実装のポイントや注意事項（記載があれば）
    5. 単体テスト実行コマンドと期待される出力

    結果は箇条書きで整理して返してください。
  `
})
```

### Step 2: 実装

メインエージェントが実装する。完了条件を全て満たすこと。

### Step 3: PR 作成前コードレビュー

**generalPurposeサブエージェント**を起動して実装コードを批判的にレビューする。

```
Task({
  subagent_type: "generalPurpose",
  description: "PR-XX のコードレビュー",
  readonly: true,
  prompt: `
    LarkReport プロジェクトの実装コードをレビューしてください。

    【対象ファイル】{src/xxx.js のパスを指定}

    ## プロジェクト規約
    - "type": "module"（ESM）: import/export を使用
    - Playwright は page.setContent() でローカルレンダリング（page.goto() 禁止）
    - Slack は Files Upload API の3ステップ（Incoming Webhook 禁止）
    - 単体実行ブロック: if (process.argv[1].endsWith('xxx.js')) { ... }
    - 環境変数は process.env から取得（ハードコード禁止）

    ## レビュー観点
    1. **規約違反**: 上記プロジェクト規約に反している箇所はないか
    2. **エラーハンドリング**: API 呼び出しや非同期処理に try/catch があるか
    3. **完了条件**: daily-report-plan.md の完了条件を満たしているか
    4. **コードの一貫性**: 既存モジュールのスタイルと揃っているか

    ## 出力形式

    ### 必ず修正すべき問題
    - ...

    ### 改善推奨
    - ...

    ### 問題なし
    - ...
  `
})
```

### Step 4: PR 作成

レビューで挙がった「必ず修正すべき問題」を解消してから PR を作成する。

```bash
git flow feature finish PR-XX-description
git push origin develop
gh pr create --base develop --title "PR-XX: タイトル"
```

---

## Git Flow 運用

```bash
# PR 実装開始
git flow feature start PR-XX-description  # → feature/PR-XX-description ブランチ

# デバッグ完了 → PR 作成
git flow feature finish PR-XX-description  # develop にマージ
git push origin develop
gh pr create --base develop --title "PR-XX: タイトル"

# PR マージ後に次の PR へ（必ずマージ確認してから）
```

**PR 概要の書き方**: [pr-template.md](pr-template.md) を参照

## PR 実装順序とフェーズ

詳細仕様: [daily-report-plan.md](../../daily-report-plan.md)

```
フェーズ1（PR-01〜06）: パイプライン検証
  PR-05: screenshot.js ← node src/screenshot.js で test-screenshot.png を確認
  PR-06: sendSlack.js  ← モックアップ PNG が Slack に届くことを確認 ★E2E検証完了

フェーズ2（PR-07〜08）: API 接続
  PR-07: fetchTasks.js  ← node src/fetchTasks.js でタスク取得確認
  PR-08: summarize.js   ← node src/summarize.js でAIコメント確認

フェーズ3（PR-09〜12）: 動的テンプレート + 統合
  PR-09: generateHTML.js（朝）
  PR-10: generateHTML.js（夜）
  PR-11: main-morning.js ← npm run morning でE2E確認
  PR-12: main-evening.js ← npm run evening でE2E確認

フェーズ4（PR-13〜14）: GitHub Actions 自動化
```

## 単体テスト実行コマンド

```bash
node src/fetchTasks.js    # Google Tasks 取得結果をコンソール表示
node src/summarize.js     # テストタスクでAIコメント生成
node src/screenshot.js    # test-screenshot.png を生成（ブラウザで確認）
npm run morning           # 朝レポートE2E実行
npm run evening           # 夜レポートE2E実行
```

## デバッグワークフロー

```
実装
  ↓
node src/[module].js（単体確認）
  ↓ エラーあり → エラーメッセージを読んで修正 → 再実行
  ↓ エラーなし
既存モジュール全て正常動作を確認
  ↓
git flow feature finish → push → PR 作成
```

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|---|---|---|
| `Cannot use import statement` | ESM 未設定 | `package.json` に `"type": "module"` を追加 |
| Playwright タイムアウト | CDN 読み込み待ち不足 | `waitUntil: 'networkidle'` を確認 |
| `Slack アップロード URL の取得に失敗` | Bot Token のスコープ不足 | `files:write` + `chat:write` を確認 |
| Google Tasks 0件 | 日付フィルタの問題 | `dueMin` / `dueMax` の ISO 形式を確認 |
| Playwright `chromium not found` | インストール未実行 | `npx playwright install chromium` を実行 |
