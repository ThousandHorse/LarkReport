# LarkReport — Claude Code ガイド

Google Tasks のタスクを毎日自動取得し、Tailwind CSS でビジュアルレポート（PNG）を生成して Slack に自動配信するツール。

## プロジェクト構成
- Daily/：タスクレポートツール（`src/` から移動済み）
- shared/：Daily・Zeny 共通モジュール（screenshot.js, sendSlack.js）
- Zeny/：収支レポートツール（新規追加）
- `package.json` / `.env.example`：ルートで一元管理（Daily・Zeny 共通）

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
| Slack 送信 | `@slack/web-api` の `filesUploadV2` | Incoming Webhook は PNG 添付不可 |
| モジュール形式 | ESM（`"type": "module"`） | `import/export` 構文を使用 |
| レポート幅 | 固定 800px | PNG のレイアウト崩れを防ぐ |

## コード規約（全プロジェクト共通）
- ESM（type: module）：import/export を使用（require 禁止）
- 環境変数は process.env から取得（ハードコード禁止）
- page.goto() 禁止 → page.setContent() を使用
- Incoming Webhook 禁止 → Files Upload API を使用
- 各モジュールに単体実行ブロックを必ず付ける

## テストに関する禁止事項（重要）
- テストの削除禁止
- テストの期待値の改ざん禁止
- テストを通すために実装側を修正すること

## 既存モジュールの流用（Zeny）
- `shared/screenshot.js` を `import { htmlToPng } from '../../shared/screenshot.js'` で参照
- `shared/sendSlack.js`  を `import { sendToSlack } from '../../shared/sendSlack.js'` で参照

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

## 詳細ガイド（reference フォルダ）

実装・運用の詳細は `.claude/skills/lark-report/` を参照すること。

| ファイル | 内容 |
|---|---|
| [SKILL.md](.claude/skills/lark-report/SKILL.md) | スキル全体概要・Git Flow・PR フェーズ一覧 |
| [reference/modules.md](.claude/skills/lark-report/reference/modules.md) | 各モジュールの実装パターン（fetchTasks・screenshot・summarize・sendSlack・generateHTML） |
| [reference/workflow.md](.claude/skills/lark-report/reference/workflow.md) | PR 実装ワークフロー・レビュー指摘対応手順 |
| [reference/pr-template.md](.claude/skills/lark-report/reference/pr-template.md) | PR 概要の書き方・テンプレート |
| [reference/troubleshooting.md](.claude/skills/lark-report/reference/troubleshooting.md) | よくあるエラーと対処・事前確認チェックリスト |

---

## 単体テスト実行コマンド

```bash
node Daily/src/fetchTasks.js    # Google Tasks 取得確認
node Daily/src/summarize.js     # AI コメント生成確認
node shared/screenshot.js       # Daily/test-output/png/*.png 生成確認
cd Daily && npm run morning     # 朝レポート E2E 実行
cd Daily && npm run evening     # 夜レポート E2E 実行
```
