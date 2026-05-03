# LarkReport プロジェクトルール

## プロジェクト構成
- Daily/：タスクレポートツール（既存・変更不要）
  - 実体は現在リポジトリルートの src/ と .github/workflows/ に配置されている
- Zeny/：収支レポートツール（新規追加）

## コード規約（全プロジェクト共通）
- ESM（type: module）：import/export を使用（require 禁止）
- 環境変数は process.env から取得（ハードコード禁止）
- page.goto() 禁止 → page.setContent() を使用
- Incoming Webhook 禁止 → Files Upload API 3ステップを使用
- 各モジュールに単体実行ブロックを必ず付ける

## テストに関する禁止事項（重要）
- テストの削除禁止
- テストの期待値の改ざん禁止
- テストを通すために実装側を修正すること

## 既存モジュールの流用
Zeny/ に以下をコピーして使用する
- src/screenshot.js → Zeny/src/screenshot.js
- src/sendSlack.js  → Zeny/src/sendSlack.js
