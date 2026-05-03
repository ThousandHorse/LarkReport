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

各モジュールの実装コード詳細: [reference/modules.md](reference/modules.md)

## 環境変数

```bash
GOOGLE_CLIENT_ID=        GOOGLE_CLIENT_SECRET=        GOOGLE_REFRESH_TOKEN=
GEMINI_API_KEY=AIza...       # Google AI Studio で取得（無料枠あり）
SLACK_BOT_TOKEN=xoxb-...   # スコープ: files:write, chat:write
SLACK_CHANNEL_ID=C...       # チャンネル詳細の最下部で確認
```

GitHub Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GEMINI_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`

## 実装ワークフロー

```
Step 1: daily-report-plan.md で PR 仕様確認
Step 2: 実装（完了条件を全て満たす）
Step 3: コードレビュー（reference/workflow.md の観点で自己確認）
Step 4: git push origin feature/PR-XX-description → gh pr create --base develop
Step 5: ユーザーのマージを待つ ← 次の PR はマージ確認後に開始
```

- **1PR ずつ進める**（複数 PR を一度に実装しない）
- **PR マージはユーザーが手動**（`gh pr merge` は使わない）
- **develop への直接 push 禁止**（必ず feature ブランチ経由）

サブエージェントの詳細: [reference/workflow.md](reference/workflow.md)

## Git Flow 運用

```bash
git flow feature start PR-XX-description     # ブランチ作成・実装開始
git push origin feature/PR-XX-description   # PR 作成前にリモートへ push
gh pr create --base develop --title "PR-XX: タイトル"
# → ユーザーがマージするまで待つ（finish・gh pr merge は使わない）

# マージ確認後に develop を最新化
git checkout develop && git pull origin develop
```

⛔ 禁止事項:
- `git push origin develop`（develop への直接 push）
- `git flow feature finish`（ローカルで勝手にマージ）
- `gh pr merge`（CLI でのマージ操作禁止）

PR 概要の書き方: [reference/pr-template.md](reference/pr-template.md)

## PR 実装フェーズ

詳細仕様: [daily-report-plan.md](../../../daily-report-plan.md)

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

## スキルの更新ルール

仕様・運用方法に変更があった場合は、このスキルファイル（および `reference/` 配下の該当ファイル）を必ず更新すること。

**`.cursor/skills/lark-report/` と `.claude/skills/lark-report/` は常に同じ内容を維持すること。**
片方を変更したら、必ずもう片方にも同じ変更を加える（同期漏れ禁止）。

対象ファイル（両方を必ず同時に更新する）：
- `SKILL.md`
- `reference/modules.md`
- `reference/pr-template.md`
- `reference/troubleshooting.md`
- `reference/workflow.md`（署名 `*Comment by Cursor*` / `*Comment by Claude*` のみ異なる）
