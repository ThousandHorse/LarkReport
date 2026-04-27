# PR 概要の書き方

## タイトル形式

```
PR-XX: [モジュール名] [動詞] - [一言説明]
```

**例:**
- `PR-05: screenshot.js 実装 - HTML→PNG 変換（Playwright）`
- `PR-07: fetchTasks.js 実装 - Google Tasks API 接続`
- `PR-11: main-morning.js 実装 - 朝レポートE2E統合`

---

## 本文テンプレート

```markdown
## 概要

[このPRで何を実装したかを2〜3文で説明する]

## 実装内容

- `src/xxx.js`: [ファイルの役割と実装した機能]
- `package.json`: [追加した依存パッケージ（あれば）]

## 完了条件チェックリスト

daily-report-plan.md の完了条件より：

- [ ] [完了条件1]
- [ ] [完了条件2]
- [ ] [完了条件3]

## 動作確認方法

```bash
# 単体テスト
node src/xxx.js

# 期待される出力
> [期待値を記載]
```

## 関連情報

- 実装詳細: [daily-report-plan.md](../daily-report-plan.md) PR-XX
- 依存する PR: PR-XX（マージ済み）
```

---

## セクション別の書き方ガイド

### 概要
- 「何を・なぜ・どうやって」の順に書く
- 実装の背景にある設計判断があれば一言添える
- 例: `htmlToPng() を実装。外部サービス不要で Tailwind CDN を networkidle で待機してから PNG 化する。`

### 実装内容
- ファイル単位で変更点を箇条書き
- 関数シグネチャの変更は明示する（例: `urlToPng(url)` → `htmlToPng(html)`）
- 追加した npm パッケージは `npm install xxx` コマンドも記載

### 完了条件チェックリスト
- `daily-report-plan.md` に記載の完了条件をそのまま転記する
- PR 作成時点で全てチェック済みであること（未完了の場合は WIP にする）

### 動作確認方法
- レビュアーが手元で再現できるコマンドを書く
- 期待されるコンソール出力やファイル生成物を記載する

### 関連情報
- `daily-report-plan.md` の該当 PR 番号へのリンクを必ず入れる
- 前の PR に依存がある場合は明示する

---

## フェーズ別の記載ポイント

### フェーズ1（PR-01〜06）パイプライン構築
- PR-06 は「モックアップ PNG が Slack に届いた」スクリーンショットをコメントに添付すると良い

### フェーズ2（PR-07〜08）API 接続
- 取得したタスクデータのサンプル JSON をコードブロックで貼り付ける
- API キー・トークンは絶対に本文に書かない（`.env` 経由であることを明記）

### フェーズ3（PR-09〜12）動的テンプレート + 統合
- HTML のビジュアルを確認できるようスクリーンショット PNG を添付する
- E2E 確認（`npm run morning` / `npm run evening`）の実行ログを貼る

### フェーズ4（PR-13〜14）GitHub Actions
- Actions のワークフロー実行結果（成功ログ）のリンクを添付する
- cron スケジュール（JST 換算）を本文に記載する

---

## 記入例（PR-05）

```markdown
## 概要

Playwright Chromium を用いた HTML→PNG 変換モジュール `src/screenshot.js` を実装する。
URL を経由せず HTML 文字列を直接 `page.setContent()` でレンダリングすることで
外部サービス不要のローカル変換を実現する。

## 実装内容

- `src/screenshot.js`: `htmlToPng(html)` 関数を追加。800×1200px で Tailwind CDN の読み込みを
  `networkidle` で待機してからフルページスクリーンショットを PNG バッファとして返す。

## 完了条件チェックリスト

- [x] `htmlToPng(html)` が HTML 文字列を受け取り PNG Buffer を返す
- [x] `node src/screenshot.js` で `test-screenshot.png` が生成される
- [x] 生成された PNG にヘッダー・本文・フッターが正しくレイアウトされている

## 動作確認方法

```bash
npx playwright install chromium
node src/screenshot.js
# → test-screenshot.png が生成されることを確認
```

## 関連情報

- 実装詳細: daily-report-plan.md PR-05
- 依存する PR: PR-04（package.json に playwright 追加済み）
```
