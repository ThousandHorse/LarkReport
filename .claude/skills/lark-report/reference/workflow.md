# 実装ワークフロー

## 大原則

- **1PR ずつ着実に進める**: 複数の PR を一度に実装しない。1つの PR が完了・確認できてから次に移る
- **PR のマージはユーザーが手動で行う**: `gh pr merge` は使わない。PR を作成したら、ユーザーがマージするまで次の PR に進まず待つ
- **マージ確認後に次の PR へ**: ユーザーから「マージした」「次進めて」などの明示的な指示があってから次の PR の実装を開始する
- **develop への直接 push 禁止**: コード変更は必ず feature ブランチで行い PR 経由でマージする。`git push origin develop` は絶対に使わない

---

## Step 1: PR 仕様確認（実装前）

`daily-report-plan.md` から対象 PR の仕様を確認する。

調査項目：
1. このPRで作成・変更するファイル名と関数シグネチャ
2. 完了条件チェックリスト（全項目）
3. このPRが依存する前のPR（依存関係）
4. 実装のポイントや注意事項（記載があれば）
5. 単体テスト実行コマンドと期待される出力

## Step 2: 実装

完了条件を全て満たすこと。

## Step 3: PR 作成前コードレビュー（自己確認）

以下の観点で実装コードを確認する。

### プロジェクト規約
- `"type": "module"`（ESM）: `import/export` を使用
- Playwright は `page.setContent()` でローカルレンダリング（`page.goto()` 禁止）
- Slack は Files Upload API の3ステップ（Incoming Webhook 禁止）
- 単体実行ブロック: `if (process.argv[1] && process.argv[1].endsWith('xxx.js')) { ... }`
- 環境変数は `process.env` から取得（ハードコード禁止）

### レビュー観点
1. **規約違反**: 上記プロジェクト規約に反している箇所はないか
2. **エラーハンドリング**: API 呼び出しや非同期処理に try/catch があるか
3. **完了条件**: `daily-report-plan.md` の完了条件を満たしているか
4. **コードの一貫性**: 既存モジュールのスタイルと揃っているか

## Step 4: PR 作成

```bash
# feature ブランチをリモートにプッシュ
git push origin feature/PR-XX-description

# PR を作成する（必ず --base develop を指定すること）
gh pr create --base develop --title "PR-XX: タイトル"
```

> ⚠️ `--base develop` を**必ず**付けること。省略するとデフォルトブランチ（main）がベースになる。

> ⚠️ **禁止事項（厳守）**
> - `git flow feature finish` → ローカルで develop にマージしてしまうので使わない
> - `git push origin develop` → develop への直接 push は禁止
> - `gh pr merge` → CLI でのマージ操作は禁止。マージはユーザーが GitHub 上で手動で行う

PR 概要の書き方: [pr-template.md](pr-template.md)

## Step 5: レビュー指摘対応

PR に bot（gemini-code-assist / chatgpt-codex など）や reviewer からレビュー指摘が来た場合、以下の手順で対応する。

### 5-1. 指摘内容の確認

```bash
# インラインコメント一覧を取得
gh api repos/ThousandHorse/LarkReport/pulls/{PR番号}/comments \
  --jq '.[] | {id: .id, author: .user.login, path: .path, body: .body}'
```

### 5-2. 修正・コミット・プッシュ

指摘に対してコードまたはドキュメントを修正し、feature ブランチにコミット＆プッシュする。

### 5-3. 対応済みスレッドにリプライ

`-f body=` では改行が反映されないため、`--input` でヒアドキュメントを JSON として渡す。

```bash
# 対応内容をリプライとして残す（comment_id は 5-1 で取得した id）
gh api repos/ThousandHorse/LarkReport/pulls/{PR番号}/comments/{comment_id}/replies \
  -X POST --input - << 'EOF'
{
  "body": "対応済みです。\n\n〇〇を修正しました（commit: xxxxxxx）。\n\n---\n*Comment by Claude*"
}
EOF
```

リプライの推奨フォーマット：

```
対応済みです。

- 修正内容: 〇〇を〇〇に変更
- 対応 commit: xxxxxxx

---
*Comment by Claude*
```

> ⚠️ **必須**: リプライ末尾に必ず `---\n*Comment by Claude*` を付けること。
> AI によるコメントであることをレビュアーが識別できるようにする。

### 5-4. スレッドを Resolve

```bash
# GraphQL でスレッドを Resolved に変更（thread_id は GraphQL で取得）
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_xxx"}) {
    thread { isResolved }
  }
}'
```

スレッド ID の取得：

```bash
gh api graphql -f query='
{
  repository(owner: "ThousandHorse", name: "LarkReport") {
    pullRequest(number: {PR番号}) {
      reviewThreads(first: 20) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes { author { login } path body }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | {id, resolved: .isResolved, path: .comments.nodes[0].path}'
```

> **対応不要と判断した指摘**も、その理由をリプライに記載してから Resolve する。

---

## Step 6: ユーザーのマージ待ち

レビュー指摘の対応・Resolve が完了したら、**ユーザーがマージするまで次の PR に進まない**。

ユーザーから「マージした」「次進めて」などの指示を受けてから：

```bash
# develop を最新化してから次の feature ブランチを切る
git checkout develop
git pull origin develop
git flow feature start PR-XX-next-description
```
