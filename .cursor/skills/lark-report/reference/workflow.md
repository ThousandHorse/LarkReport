# 実装ワークフロー（サブエージェント）

## Step 1: PR 仕様確認（実装前）

**exploreサブエージェント**を起動して `daily-report-plan.md` から対象 PR の仕様を調査する。

```
Task({
  subagent_type: "explore",
  description: "PR-XX の仕様確認",
  prompt: `
    /Users/chibatakuma/Documents/Project/LarkReport/daily-report-plan.md
    から以下の情報を抽出してください。

    【対象】PR-XX（例: PR-05）

    調査項目：
    1. このPRで作成・変更するファイル名と関数シグネチャ
    2. 完了条件チェックリスト（全項目）
    3. このPRが依存する前のPR（依存関係）
    4. 実装のポイントや注意事項（記載があれば）
    5. 単体テスト実行コマンドと期待される出力

    結果は箇条書きで整理して返してください。
  `
})
```

## Step 2: 実装

メインエージェントが実装する。完了条件を全て満たすこと。

## Step 3: PR 作成前コードレビュー

**generalPurposeサブエージェント**を起動して実装コードを批判的にレビューする。

```
Task({
  subagent_type: "generalPurpose",
  description: "PR-XX のコードレビュー",
  readonly: true,
  prompt: `
    LarkReport プロジェクトの実装コードをレビューしてください。

    【対象ファイル】{src/xxx.js のパスを指定}

    ## プロジェクト規約
    - "type": "module"（ESM）: import/export を使用
    - Playwright は page.setContent() でローカルレンダリング（page.goto() 禁止）
    - Slack は Files Upload API の3ステップ（Incoming Webhook 禁止）
    - 単体実行ブロック: if (process.argv[1].endsWith('xxx.js')) { ... }
    - 環境変数は process.env から取得（ハードコード禁止）

    ## レビュー観点
    1. **規約違反**: 上記プロジェクト規約に反している箇所はないか
    2. **エラーハンドリング**: API 呼び出しや非同期処理に try/catch があるか
    3. **完了条件**: daily-report-plan.md の完了条件を満たしているか
    4. **コードの一貫性**: 既存モジュールのスタイルと揃っているか

    ## 出力形式

    ### 必ず修正すべき問題
    - ...

    ### 改善推奨
    - ...

    ### 問題なし
    - ...
  `
})
```

## Step 4: PR 作成

レビューで挙がった「必ず修正すべき問題」を解消してから PR を作成する。

```bash
git flow feature finish PR-XX-description
git push origin develop
gh pr create --base develop --title "PR-XX: タイトル"
```

PR 概要の書き方: [pr-template.md](pr-template.md)
