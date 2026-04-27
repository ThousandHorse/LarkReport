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

## 技術的決定事項

| 決定 | 採用内容 | 理由 |
|---|---|---|
| HTML→PNG | Playwright `page.setContent()` | 外部サービス不要・CDN 読み込みを `networkidle` で保証 |
| Slack 送信 | Files Upload API（Bot Token） | Incoming Webhook は PNG 添付不可 |
| モジュール形式 | ESM（`"type": "module"`） | `import/export` 構文を使用 |
| レポート幅 | 固定 800px | PNG のレイアウト崩れを防ぐ |

各モジュールの実装コード詳細: [reference/modules.md](reference/modules.md)

## 環境変数

```bash
GOOGLE_CLIENT_ID=        GOOGLE_CLIENT_SECRET=        GOOGLE_REFRESH_TOKEN=
ANTHROPIC_API_KEY=sk-ant-...
SLACK_BOT_TOKEN=xoxb-...   # スコープ: files:write, chat:write
SLACK_CHANNEL_ID=C...       # チャンネル詳細の最下部で確認
```

GitHub Secrets: 上記6変数を全て登録する

## 実装ワークフロー

```
Step 1: explore サブエージェントで PR 仕様確認
Step 2: 実装（完了条件を全て満たす）
Step 3: generalPurpose サブエージェントでコードレビュー
Step 4: 修正 → git flow feature finish → push → PR 作成
```

サブエージェントの詳細（Task() コード）: [reference/workflow.md](reference/workflow.md)

## Git Flow 運用

```bash
git flow feature start PR-XX-description   # 実装開始
git flow feature finish PR-XX-description  # develop にマージ
git push origin develop
gh pr create --base develop --title "PR-XX: タイトル"
```

PR 概要の書き方: [pr-template.md](pr-template.md)

## PR 実装フェーズ

詳細仕様: [daily-report-plan.md](../../daily-report-plan.md)

```
フェーズ1（PR-01〜06）: パイプライン検証
  PR-05: screenshot.js ← node src/screenshot.js で test-screenshot.png 確認
  PR-06: sendSlack.js  ← モックアップ PNG が Slack に届く ★E2E検証

フェーズ2（PR-07〜08）: API 接続
  PR-07: fetchTasks.js / PR-08: summarize.js

フェーズ3（PR-09〜12）: 動的テンプレート + 統合
  PR-09〜10: generateHTML.js（朝/夜）
  PR-11〜12: main-morning.js / main-evening.js ← npm run morning/evening でE2E確認

フェーズ4（PR-13〜14）: GitHub Actions 自動化
```

## 単体テスト実行コマンド

```bash
node src/fetchTasks.js    # Google Tasks 取得確認
node src/summarize.js     # AIコメント生成確認
node src/screenshot.js    # test-screenshot.png 生成確認
npm run morning           # 朝レポートE2E実行
npm run evening           # 夜レポートE2E実行
```

トラブルシューティング: [reference/troubleshooting.md](reference/troubleshooting.md)
