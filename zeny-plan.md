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
│       ├── money-report.yml          # 毎日 23:00 JST トリガー      ✅ PR-20
│       └── slack-modal.yml           # slackModal 起動ワークフロー   🔜 PR-17C
├── apps/
│   └── Zeny/
│       ├── src/
│       │   ├── env.js                # ESM dotenv ローダー          ✅ PR-19
│       │   ├── fetchZaim.js          # Zaim API から収支取得        ✅ PR-15
│       │   ├── fetchCalendar.js      # Google Calendar から予定取得 ✅ PR-16
│       │   ├── generateMoneyHTML.js  # Tailwind HTML 生成           ✅ PR-18
│       │   ├── googleSheets.js       # Google Sheets CRUD           🔜 PR-17A
│       │   ├── modalViews.js         # Block Kit モーダル定義        🔜 PR-17C
│       │   ├── postZaim.js           # Zaim への書き込み             🔜 PR-17D
│       │   ├── sendReportWithButton.js # ボタン付きレポート送信      🔜 PR-17C
│       │   ├── slackModal.js         # Socket Mode Bolt アプリ      🔜 PR-17C
│       │   └── main-money.js         # 日次収支レポート統合          ✅ PR-19（PR-17B で変更）
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
| PR-17A | googleSheets.js 実装 | Google Sheets CRUD（収支・futureExpenses） | ✅ マージ済み |
| PR-17B | main-money.js 変更 | futureExpenses を Sheets から取得して統合 | ✅ マージ済み |
| PR-17C | slackModal.js 実装 | Slack Socket Mode モーダル + ボタン送信 | 🔜 **次にやること** |
| PR-17D | postZaim.js 実装 | Slack モーダルの手動入力を Zaim にも書き込み | 🔜 PR-17C 完了後 |
| PR-18 | generateMoneyHTML.js 実装 | Tailwind HTML 生成 | ✅ マージ済み |
| PR-19 | main-money.js 実装 | 日次収支レポート E2E 統合 | ✅ マージ済み |
| PR-20 | money-report.yml 実装 | GitHub Actions 毎日 23:00 JST 自動実行 | ✅ マージ済み |

---

## 📋 各 PR の仕様

---

### PR-17A: `apps/Zeny/src/googleSheets.js`

**目的**: Google Sheets API の CRUD ラッパー。収支の手動入力と futureExpenses の保存・取得を担う。

**実装する関数**:
- `initSpreadsheet()` — 初回のみ実行。「Zeny Data」スプレッドシートを新規作成し ID を返す
- `appendManualEntry(entry)` — 収支手動入力を「収支手動入力」シートに追記
- `appendFutureExpense(item)` — 支出予定を「futureExpenses」シートに追記
- `fetchFutureExpenses()` — 「futureExpenses」シートから全行を取得して配列で返す

**Google スプレッドシート構成**:

シート1「収支手動入力」: `date | type | category | amount | method | comment | created_at`
シート2「futureExpenses」: `label | year | month | amount | created_at`

**必要な環境変数**:
```
GOOGLE_CLIENT_ID=        # 既存
GOOGLE_CLIENT_SECRET=    # 既存
GOOGLE_REFRESH_TOKEN=    # 既存（spreadsheets スコープが必要）
ZENY_SPREADSHEET_ID=     # initSpreadsheet() 実行後に取得して設定
```

**完了条件**:
- [ ] `node apps/Zeny/src/googleSheets.js` で initSpreadsheet → append → fetch が成功する
- [ ] Google Sheets にデータが記録されていることを目視確認できる

---

### PR-17B: `apps/Zeny/src/main-money.js` 変更

**目的**: `fetchFutureExpenses()` を呼んで Sheets から futureExpenses を取得し、レポートに反映する。

**変更内容（2箇所のみ）**:
1. `fetchFutureExpenses()` を import して `opts.futureExpenses` に渡す
2. 既存の `sendToSlack` はそのまま維持（ボタン追加は PR-17C）

**完了条件**:
- [ ] `npm run money` を実行して Sheets の futureExpenses がレポートに表示される

---

### PR-17C: Slack モーダル本体

**目的**: `/zeny` スラッシュコマンドとボタンでモーダルを開き、収支・futureExpenses を入力して Sheets に保存する。

**実装ファイル**:
- `apps/Zeny/src/modalViews.js` — Block Kit モーダル定義
- `apps/Zeny/src/slackModal.js` — Socket Mode Bolt アプリ本体
- `apps/Zeny/src/sendReportWithButton.js` — ボタン付きレポート送信
- `.github/workflows/slack-modal.yml` — GitHub Actions ワークフロー
- `package.json` — `@slack/bolt` 追加

**追加環境変数**:
```
SLACK_APP_TOKEN=xapp-...      # Socket Mode 用 App-Level Token
SLACK_SIGNING_SECRET=         # Slack App の Signing Secret
```

---

### PR-20: `.github/workflows/money-report.yml` ✅ マージ済み

---

### PR-17D: `apps/Zeny/src/postZaim.js`

**目的**: Slack モーダルから手動入力した収支データを Zaim API に書き込む。PR-17C の `slackModal.js` から呼び出すことで、Sheets への保存（PR-17A）と Zaim への書き込みを同時に行う。

**実装する関数**:
- `postZaimPayment(entry)` — 支出を Zaim に登録する
- `postZaimIncome(entry)` — 収入を Zaim に登録する
- `fetchZaimCategories()` — Zaim のカテゴリ一覧を取得してキャッシュする

**Zaim API エンドポイント**:
```
POST https://api.zaim.net/v2/home/money/payment  # 支出登録
POST https://api.zaim.net/v2/home/money/income   # 収入登録
GET  https://api.zaim.net/v2/home/category       # カテゴリ一覧取得
```

**引数スキーマ（appendManualEntry と同形式）**:
```js
// postZaimPayment / postZaimIncome 共通
{
  date:     string,              // "YYYY-MM-DD"
  amount:   number,              // 金額（正の整数）
  category: string,              // カテゴリ名（例: "食費"）→ ID に変換
  name:     string,              // 品目名（Zaim の "name" フィールド）
  comment?: string,              // メモ（省略可）
}
```

**カテゴリ名 → ID 変換**:
- `fetchZaimCategories()` で取得したカテゴリ一覧から `name` で検索して `id` を返す
- 一致するカテゴリが見つからない場合は「その他」カテゴリ ID にフォールバック

**PR-17C との連携**:
`slackModal.js` のモーダル送信ハンドラ内で以下を並列実行:
```js
await Promise.all([
  appendManualEntry(entry),           // Google Sheets に保存（PR-17A）
  postZaimPayment(entry),             // Zaim に書き込み（PR-17D）
]);
```

**完了条件**:
- [ ] Slack モーダルから支出を入力すると Zaim アプリに反映される
- [ ] Slack モーダルから収入を入力すると Zaim アプリに反映される
- [ ] カテゴリ名が Zaim に存在しない場合でもエラーにならず「その他」に記録される

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

# Slack Bot Token（スコープ: files:write, chat:write, commands）
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...
SLACK_APP_TOKEN=xapp-...      # PR-17C〜 Socket Mode 用 App-Level Token
SLACK_SIGNING_SECRET=         # PR-17C〜 Slack App の Signing Secret

# Google API（Calendar / Sheets 共通）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=         # spreadsheets スコープが必要（PR-17A〜）

# Google Sheets（PR-17A〜）
ZENY_SPREADSHEET_ID=          # initSpreadsheet() 実行後に設定
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
| `futureExpenses` | Google スプレッドシート「futureExpenses」シート（PR-17A〜） |
| `monthlyExpenses` | Zaim API（月次集計） |
| `monthlyTotalIncome` | Zaim API（月次集計） |
| `monthlyTotalExpense` | Zaim API（月次集計） |
