# 💴 Zeny 実装計画書

## 🎯 プロジェクト概要

Zaim の収支データを毎日自動取得し、Tailwind CSS で収支レポート（PNG）を生成して Slack に自動配信するツール。

| 項目 | 内容 |
|------|------|
| トリガー | GitHub Actions（毎日 23:00 JST） |
| データ取得元 | Zaim API（収支）/ Google Calendar API（予定） |
| レポート生成 | Node.js + Tailwind CSS → Playwright で PNG 変換 |
| AI アドバイス | Google Gemini API（gemini-2.5-flash） |
| 配信先 | Slack Files Upload API（Bot Token） |

---

## 📁 最終的なファイル構成

```
LarkReport/
├── .github/
│   └── workflows/
│       └── money-report.yml          # 毎日 23:00 JST トリガー
├── apps/
│   └── Zeny/
│       ├── src/
│       │   ├── env.js                # ESM dotenv ローダー          ✅ PR-19
│       │   ├── fetchZaim.js          # Zaim API から収支取得        ✅ PR-15
│       │   ├── fetchCalendar.js      # Google Calendar から予定取得 ✅ PR-16
│       │   ├── generateMoneyHTML.js  # Tailwind HTML 生成           ✅ PR-18
│       │   ├── main-money.js         # 日次収支レポート統合          ✅ PR-19
│       │   └── slackModal.js         # 手動入力モーダル（後回し）    🔜 PR-17
│       └── mock/
│           └── money.html            # デザイン確認用モックアップ    ✅ PR-18
└── shared/
    ├── screenshot.js                 # HTML → PNG（Playwright）
    └── sendSlack.js                  # Slack 送信
```

---

## 🗂️ PR 一覧

| PR# | タイトル | 内容 | 状態 |
|-----|---------|------|------|
| PR-15 | fetchZaim.js 実装 | Zaim API から収支取得（OAuth 1.0a） | ✅ マージ済み |
| PR-16 | fetchCalendar.js 実装 | Google Calendar から予定取得 | ✅ マージ済み |
| PR-17 | slackModal.js 実装 | Slack 手動入力モーダル | 🔜 後回し |
| PR-18 | generateMoneyHTML.js 実装 | Tailwind HTML 生成 | ✅ マージ済み |
| PR-19 | main-money.js 実装 | 日次収支レポート E2E 統合 | ✅ マージ済み |
| PR-20 | money-report.yml 実装 | GitHub Actions 毎日 23:00 JST 自動実行 | 🔜 **次にやること** |

---

## 📋 各 PR の仕様

---

### PR-20: `.github/workflows/money-report.yml`

**目的**: 毎日 23:00 JST に収支レポートを自動実行して Slack に送信する。

**トリガー**:
- `schedule`: `cron: '0 14 * * *'`（UTC 14:00 = JST 23:00）
- `workflow_dispatch`: 手動実行（テスト用）

**ジョブ構成**（`morning-report.yml` と同じ構成）:
1. リポジトリをチェックアウト（`actions/checkout@v4`）
2. Node.js セットアップ（`actions/setup-node@v4`、バージョン 20、npm キャッシュ有効）
3. 依存パッケージをインストール（`npm ci`）
4. Playwright (Chromium) をインストール（`npx playwright install --with-deps chromium`、`working-directory: apps/Zeny`）
5. 収支レポートを実行（`node apps/Zeny/src/main-money.js`）

**必要な GitHub Secrets**:
```
ZAIM_CLIENT_ID
ZAIM_CLIENT_SECRET
ZAIM_ACCESS_TOKEN
ZAIM_ACCESS_TOKEN_SECRET
GEMINI_API_KEY
SLACK_BOT_TOKEN
SLACK_CHANNEL_ID
```

**完了条件**:
- [ ] `workflow_dispatch` で手動実行して Actions が成功する
- [ ] Slack に PNG レポートが届く
- [ ] cron スケジュール（JST 換算）が本文コメントに記載されている

---

### PR-17: `apps/Zeny/src/slackModal.js`（後回し）

**目的**: Slack のモーダルから手動で収支を入力できる機能。

> ⚠️ 現時点では後回し。PR-20 完了後に着手する。

---

## 🔑 環境変数

```bash
# Zaim API（https://dev.zaim.net/ で取得）
ZAIM_CLIENT_ID=
ZAIM_CLIENT_SECRET=
ZAIM_ACCESS_TOKEN=
ZAIM_ACCESS_TOKEN_SECRET=

# Gemini API（https://aistudio.google.com/app/apikey で取得）
GEMINI_API_KEY=AIza...

# Slack（Bot Token スコープ: files:write, chat:write）
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...

# Google Calendar（fetchCalendar.js で使用）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
```

---

## 🚦 PR 運用ルール

- **1PR ずつ**。ユーザーがマージしてから次の PR へ
- **PR マージはユーザーが手動**（`gh pr merge` は使わない）
- **develop への直接 push 禁止**（必ず feature ブランチ経由）

詳細: `.claude/skills/lark-report/reference/workflow.md`

---

## 🔮 将来実装予定（opts のプレースホルダー）

`generateMoneyHTML.js` の `opts` に渡している以下の項目は、将来的に外部データソースから取得する予定。

| opts フィールド | 将来のデータソース |
|---|---|
| `futureExpenses` | Google スプレッドシート（手動メンテ） |
| `monthlyExpenses` | Zaim API（月次集計） |
| `monthlyTotalIncome` | Zaim API（月次集計） |
| `monthlyTotalExpense` | Zaim API（月次集計） |
