# トラブルシューティング

## デバッグフロー

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
| `invalid_auth`（Slack） | Bot Token が間違っている | `xoxb-` で始まる Bot Token か確認 |
| Google `invalid_grant` | リフレッシュトークン失効 | OAuth2 フローを再実行してトークンを再取得 |

## 事前確認チェックリスト

```bash
# 依存パッケージ
npm install
npx playwright install chromium

# .env の確認（全変数が設定されているか）
cat .env | grep -E "^[A-Z]"
```
