# Render デプロイ手順

`slackModal.js`（Zeny Slack モーダルアプリ）を Render に常駐デプロイする手順。
デプロイ後はローカル Mac を起動しなくてもスマホ含む任意のデバイスから `/zeny` コマンドとボタンが使えるようになる。

---

## 前提条件

- GitHub リポジトリに PR-17E（`render.yaml`）がマージ済みであること
- `.env` に必要な環境変数が設定済みであること

---

## 手順

### 1. アカウント作成

[render.com](https://render.com) を開いて「**Get Started for Free**」→「**GitHub でログイン**」

---

### 2. プロジェクト作成

1. ダッシュボードで「**New +**」→「**Blueprint**」を選択
2. LarkReport リポジトリを選択
3. `render.yaml` が自動検出され「zeny-slack-modal」サービスが表示される（**Web Service**・無料プラン）
4. 「**Apply**」をクリック

> ⚠️ **Background Worker は有料プランのみ**のため、Web Service として起動します。  
> Socket Mode は WebSocket 接続のため HTTP リクエストがなくてもスリープしません。

---

### 3. 環境変数を設定

サービスの「**Environment**」タブを開き、以下を追加する（`.env` の値をそのままコピー）：

| 変数名 | 説明 |
|--------|------|
| `SLACK_BOT_TOKEN` | xoxb- で始まる Bot Token |
| `SLACK_APP_TOKEN` | xapp- で始まる App-Level Token |
| `SLACK_SIGNING_SECRET` | Slack App の Signing Secret |
| `GOOGLE_CLIENT_ID` | Google Cloud Console のクライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console のクライアントシークレット |
| `GOOGLE_REFRESH_TOKEN` | calendar.readonly + spreadsheets スコープのリフレッシュトークン |
| `ZENY_SPREADSHEET_ID` | Google Sheets のスプレッドシート ID |
| `ZAIM_CLIENT_ID` | Zaim Developer Console のコンシューマーキー |
| `ZAIM_CLIENT_SECRET` | Zaim Developer Console のコンシューマーシークレット |
| `ZAIM_ACCESS_TOKEN` | Zaim のアクセストークン |
| `ZAIM_ACCESS_TOKEN_SECRET` | Zaim のアクセストークンシークレット |

「**Save Changes**」をクリックすると自動でデプロイが走る。

---

### 4. デプロイ確認

「**Logs**」タブを開き、以下のログが表示されれば成功：

```
✅ Zeny Slack モーダルアプリが起動しました（Socket Mode）
```

---

### 5. 動作確認

スマホの Slack で `/zeny` を入力してモーダルが開けば完了。

---

## 再デプロイ

`develop` ブランチに push するたびに Render が自動で再デプロイを行う。手動で再デプロイする場合は Render ダッシュボードの「**Manual Deploy**」→「**Deploy latest commit**」をクリック。

---

## トラブルシューティング

### ログに `invalid_grant` が表示される
→ `GOOGLE_REFRESH_TOKEN` が期限切れ。`node apps/Zeny/src/refreshToken.js` で再取得して Render の環境変数を更新する。

### ログに `401 Unauthorized` が表示される（Zaim）
→ `ZAIM_ACCESS_TOKEN` が無効。Zaim Developer Console でトークンを再発行して環境変数を更新する。

### モーダルが開かない
→ Render のログで起動メッセージを確認。エラーがある場合は環境変数の設定漏れを確認する。
