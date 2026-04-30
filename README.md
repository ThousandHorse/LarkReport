# LarkReport

Google Tasks の今日のタスクを取得し、Tailwind CSS でビジュアルレポート（PNG）を生成して Slack に自動配信するツール。

## 機能

- 朝レポート（毎日 5:00 JST）：今日のタスク一覧 + AI コメント
- 夜レポート（毎日 23:00 JST）：当日の進捗・達成率 + AI コメント

## 技術スタック

| 役割 | 技術 |
|---|---|
| タスク取得 | Google Tasks API（OAuth2） |
| AI コメント生成 | Google Gemini API（gemini-2.0-flash） |
| HTML レポート | Tailwind CSS CDN |
| PNG 変換 | Playwright Chromium |
| Slack 送信 | Slack Files Upload API（Bot Token） |
| 自動実行 | GitHub Actions（cron） |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
npx playwright install chromium
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を設定する。

```bash
cp .env.example .env
```

| 変数名 | 取得元 |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_REFRESH_TOKEN` | OAuth2 フローで取得 |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `SLACK_BOT_TOKEN` | Slack App の OAuth & Permissions |
| `SLACK_CHANNEL_ID` | Slack チャンネル詳細の最下部 |

### 3. ローカル実行

```bash
npm run morning   # 朝レポートを手動実行
npm run evening   # 夜レポートを手動実行
```

## GitHub Actions

`Settings → Secrets and variables → Actions` に上記6変数を登録すると、
スケジュール自動実行（朝 5:00 / 夜 23:00 JST）が有効になる。
