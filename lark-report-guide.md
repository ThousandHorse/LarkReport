# 🐦 LarkReport 解説ガイド
### 〜 エンジニアでない人のための「何をしているか」完全解説 〜

---

## 📖 このガイドの使い方

LarkReport を実装する際に「このコードは何をしているの？」「この技術はなぜ必要？」と思ったときに参照するガイドです。
実装計画書（`daily-report-plan.md`）と合わせて読んでください。

---

## 🗺️ 全体の仕組みを一言で言うと

```
毎朝・毎晩、Google のタスクリストを自動で読み取り
→ AI がコメントを書いてくれて
→ きれいな画像レポートにして
→ Slack に届ける

これを、あなたが何もしなくても自動で行うのが LarkReport です。
```

---

## 🧩 使用技術の解説

### 1️⃣ GitHub Actions（トリガー）

**一言で言うと：** 「決まった時間に自動でプログラムを動かす仕組み」

```
普通のプログラム：
  あなたがボタンを押す → プログラムが動く

GitHub Actions：
  毎朝 5:00 になる → 自動でプログラムが動く ← これが LarkReport
```

GitHub というコードを管理するサービスの中に、「スケジュール機能」が無料で使えます。
設定ファイル（`.yml` という形式）に「毎日 5:00 に動かして」と書くだけで OK です。

**なぜ GitHub Actions を選んだか：**
- 無料で使える（月 2,000 分まで）
- サーバーを自分で用意しなくていい
- PC の電源が切れていても動く（クラウド上で動くから）

---

### 2️⃣ Google Tasks API（データ取得）

**一言で言うと：** 「Google のタスクリストをプログラムから読み書きする窓口」

```
普通の使い方：
  あなたが Google Tasks アプリを開く → タスクを見る

API を使った場合：
  プログラムが Google に「今日のタスクを教えて」と問い合わせる
  → Google が「はい、これです」と返してくれる
```

**API とは？**

API（エーピーアイ）とは「Application Programming Interface」の略で、
「プログラム同士が会話するための窓口」です。

レストランで例えると：
```
お客さん（プログラム）
  ↓ 「ハンバーグ定食をください」（APIリクエスト）
ウェイター（API）
  ↓ （厨房に伝える）
厨房（Google のサーバー）
  ↓ 「はい、できました」（APIレスポンス）
ウェイター（API）
  ↓ 「お待たせしました」（データを返す）
お客さん（プログラム） ← タスクデータを受け取る
```

**OAuth（認証）とは？**

Google Tasks API を使うには「このプログラムは本人が許可したものです」という証明が必要です。
これが OAuth 認証で、一度だけ設定すれば、あとは自動的に認証が更新されます。

---

### 3️⃣ Node.js（処理エンジン）

**一言で言うと：** 「JavaScript をパソコン上（サーバー上）で動かす仕組み」

```
もともと JavaScript は：
  Web ブラウザの中だけで動くプログラム言語

Node.js があると：
  ブラウザなしで、サーバー上でも JavaScript が動く
```

LarkReport では「Google からデータを取ってくる」「HTML を作る」「Slack に送る」
という処理を Node.js で書いています。

---

### 4️⃣ Tailwind CSS（デザイン）

**一言で言うと：** 「あらかじめ用意されたデザインの部品を組み合わせてきれいな見た目を作る道具」

```
普通の CSS：
  .button {
    background-color: blue;
    padding: 10px;
    border-radius: 5px;
  }
  → 自分でゼロからデザインを書く

Tailwind CSS：
  <button class="bg-blue-500 p-2 rounded">
  → 用意されたクラス名を並べるだけできれいになる
```

HTML の中に `class="bg-blue-500 text-white rounded-xl p-4"` のように書くだけで
プロ品質のデザインが作れます。LarkReport ではこれでレポートの見た目を作ります。

---

### 5️⃣ Playwright（PNG 変換）

**一言で言うと：** 「人間が操作しなくても、ブラウザを自動で動かしてスクリーンショットを撮る道具」

```
普通のスクリーンショット：
  あなたがブラウザを開く → ページを表示 → PrintScreen キーを押す

Playwright：
  プログラムが自動でブラウザを起動
  → HTML を表示
  → スクリーンショットを撮る
  → ブラウザを閉じる
  → PNG ファイルの完成
```

「ヘッドレスブラウザ」とも呼ばれ、画面は表示されないまま裏側で動きます。
GitHub Actions のサーバーには画面がないので、このヘッドレスモードが必須です。

**なぜ Puppeteer ではなく Playwright か？**

```
Puppeteer（Google 製）
  → GitHub Actions で動かすには追加の設定が必要で複雑

Playwright（Microsoft 製）✅ ← LarkReport はこちらを採用
  → GitHub Actions の公式サポートがあり、追加設定なしで動く
  → コードがシンプルで読みやすい
  → Chrome / Firefox / Safari と複数ブラウザに対応
```

---

### 6️⃣ Gemini API（AI 要約）

**一言で言うと：** 「Google の AI（Gemini）にプログラムから質問して、答えを受け取る仕組み」

```
普通の使い方：
  Gemini.google.com を開く → 手動で質問を入力 → 回答を読む

Gemini API：
  プログラムが自動でタスクリストを Gemini に送る
  → Gemini が自動でコメントを生成して返してくれる
  → レポートに自動で埋め込まれる
```

毎日同じような質問を送るのに、毎回手動でやるのは大変です。
API を使えばプログラムが代わりに質問して答えをもらえます。
`gemini-2.0-flash` モデルは無料枠で利用可能なため、都度課金が発生しません。
API キーは Google AI Studio（https://aistudio.google.com/app/apikey）で取得できます。

---

### 7️⃣ Slack Incoming Webhook（配信）

**一言で言うと：** 「外部のプログラムから Slack にメッセージを送るための専用の窓口」

```
普通の Slack：
  あなたが Slack アプリを開く → 手動でメッセージを送る

Incoming Webhook：
  プログラムが Webhook URL（特別なアドレス）に画像を送る
  → Slack のチャンネルに自動で届く
```

Webhook URL は「この URL にデータを送ると Slack に届く」という特別なアドレスです。
一度 URL を発行しておけば、あとはプログラムから送り放題です。

---

## 📄 各ファイルの役割解説

### `src/fetchTasks.js` — タスクを取得するファイル

```
【このファイルがやること】
Google Tasks API に接続して、今日のタスクを全部取得する
完了済みと未完了に仕分けして返す

【返ってくるデータのイメージ】
{
  completed: [{ title: "Udemyコース30分", completed: true }],
  incomplete: [{ title: "国民年金手続き", completed: false }],
  total: 5,           // 全タスク数
  completedCount: 3,  // 完了数
  progressRate: 60,   // 進捗率（%）
}
```

**コードの中で難しそうな部分の解説：**

```javascript
// auth.setCredentials({ refresh_token: ... })
// ↑ これは「俺はちゃんと本人だよ」という証明書を渡している
//   一度設定したら、アクセストークンの期限が切れても自動で更新してくれる

// waitUntil: 'networkidle0'
// ↑ 「ネットワーク通信が完全に止まるまで待って」という意味
//   Tailwind CSS が CDN から読み込まれるのを待つために必要
```

---

### `src/summarize.js` — AI 要約を生成するファイル

```
【このファイルがやること】
Gemini API にタスクリストを送る
Gemini が生成したコメント文を受け取る
朝用・夜用でプロンプトを変える

【プロンプトとは？】
AI への「質問文」または「指示文」のこと
どんな指示を書くかで AI の回答の質が変わる
```

**朝のプロンプトのポイント：**
```
「励みになる朝のコメントを2〜3文で」
→ 短く・ポジティブに絞ることで、毎日読みやすいコメントになる
```

**夜のプロンプトのポイント：**
```
「振り返りと明日への前向きなアドバイスを2〜3文で」
→ 過去（今日）を振り返りつつ、未来（明日）を向く構成にする
```

---

### `src/generateHTML.js` — HTML レポートを生成するファイル

```
【このファイルがやること】
タスクデータと AI コメントを受け取る
Tailwind CSS を使った HTML 文字列を作る
朝用・夜用で別々のデザインを生成する

【HTML 文字列とは？】
Web ページのソースコードを、文字列（テキスト）として
プログラムの中で組み立てたもの
Playwright がこれをブラウザで表示してスクリーンショットを撮る
```

**テンプレートリテラル（バッククォート）とは：**
```javascript
// 普通の文字列（ダブルクォート）
const text = "こんにちは " + name + " さん";

// テンプレートリテラル（バッククォート）← LarkReport で使っている
const text = `こんにちは ${name} さん`;
// ${ } の中に変数を直接埋め込めるので、HTML を組み立てるのに便利
```

---

### `src/screenshot.js` — PNG 変換ファイル

```
【このファイルがやること】
Playwright でヘッドレスブラウザ（Chromium）を起動
HTML 文字列をブラウザに読み込む
スクリーンショットを撮って PNG データを返す
```

**Playwright が Puppeteer より楽な理由：**
```
Puppeteer の場合：
  GitHub Actions のサーバー（Linux）では追加オプションが必要で
  設定を間違えると動かない。ハマりやすいポイントだった。

Playwright の場合：
  npx playwright install --with-deps chromium
  このコマンド 1 つで必要な全てが揃う。
  追加オプションなしでそのまま GitHub Actions で動く ✅
```

---

### `src/sendSlack.js` — Slack 送信ファイル

```
【このファイルがやること】
PNG のバイナリデータを受け取る
Slack の Webhook URL にデータを送信する
送信成功・失敗を確認する

【バイナリデータとは？】
画像や音声などをコンピュータが扱える 0 と 1 の数列にしたもの
PNG ファイルの中身は実はバイナリデータ
```

---

### `.github/workflows/*.yml` — GitHub Actions の設定ファイル

```
【このファイルがやること】
「いつ」「何を」実行するかを GitHub に伝える設定ファイル
YAML（ヤムル）という形式で書く
インデント（字下げ）がズレると動かないので注意
```

**YAML の基本：**
```yaml
# # から始まる行はコメント（メモ）
# インデントはスペース 2 つが基本（タブは使わない）

name: ワークフローの名前    # GitHub の画面に表示される名前
on:                        # 「いつ動くか」の設定
  schedule:
    - cron: '0 20 * * *'  # 毎日 UTC 20:00（= JST 05:00）

jobs:                      # 「何をするか」の設定
  job-name:
    runs-on: ubuntu-latest # Linux サーバーで実行
    steps:                 # 手順を順番に書く
      - name: 手順の名前
        run: 実行するコマンド
```

**cron（クーロン）記法とは：**
```
'0 22 * * *'
 ↑  ↑  ↑ ↑ ↑
 │  │  │ │ └── 曜日（* = 毎日）
 │  │  │ └──── 月（* = 毎月）
 │  │  └────── 日（* = 毎日）
 │  └────────── 時（UTC で 20 時 = 日本時間の朝 5 時）
 └──────────── 分（0 分ちょうど）

日本時間（JST）は UTC より 9 時間進んでいる
朝 5:00 JST = 20:00 UTC（前日）
夜 23:00 JST = 14:00 UTC
```

---

## 🔐 環境変数（`.env`）とは何か

```
【普通のコードのダメな書き方】
const apiKey = "AIzaxxxxxxxxxxxxxxxx";  // ← パスワードをコードに直書き
                                        //   GitHub に上げると全世界に公開される！

【正しい書き方：環境変数を使う】
const apiKey = process.env.GEMINI_API_KEY;  // ← 変数名だけ書く
// 実際の値は .env ファイルに書く（GitHub には上げない）
```

**.env ファイルの仕組み：**
```
.env ファイル（ローカルのみ・GitHub に上げない）
  GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxx

↓ dotenv ライブラリが読み込む

コード内
  process.env.GEMINI_API_KEY → "AIzaxxxxxxxxxxxxxxxx" が返ってくる
```

**GitHub Actions での環境変数：**
```
GitHub の「Secrets」という金庫に預ける
  → ワークフローの実行時だけ取り出せる
  → ログにも表示されない（セキュア）
```

---

## 📦 npm と package.json とは

**npm（エヌピーエム）とは：**
```
Node.js のライブラリを管理するツール
「図書館の司書」みたいなもの
  → 「Playwright を使いたい」と言えば自動でインストールしてくれる
  → 「全部入れて」と言えば package.json を見て一括インストール
```

**package.json とは：**
```json
{
  "name": "LarkReport",         // プロジェクト名
  "dependencies": {              // 使うライブラリの一覧
    "@playwright/test": "^1.44.0"  // Playwright（スクリーンショット用）
    "googleapis": "^140.0.0"    // Google APIs ライブラリ
  }
}
```

```bash
npm install   # package.json を見て全ライブラリをインストール
npm run morning  # 朝レポートを手動実行
npm run evening  # 夜レポートを手動実行
```

---

## 🗓️ PR ごとの技術難易度

| PR# | タイトル | 難易度 | 詰まりやすいポイント |
|-----|---------|--------|-------------------|
| PR-01 | 初期セットアップ | ⭐ | なし |
| PR-02 | 環境変数 | ⭐ | .env を Git に上げないこと |
| PR-03 | Google Tasks API | ⭐⭐⭐ | OAuth 認証の設定が一番ハマりやすい |
| PR-04 | Gemini API | ⭐⭐ | API キーの設定だけ注意（Google AI Studio で取得） |
| PR-05 | 朝 HTML | ⭐⭐ | Tailwind のクラス名に慣れが必要 |
| PR-06 | 夜 HTML | ⭐⭐ | PR-05 と同じなので楽になる |
| PR-09 | Playwright PNG | ⭐⭐ | Chromium のインストールコマンドに注意 |
| PR-08 | Slack 送信 | ⭐⭐ | Webhook URL の発行手順 |
| PR-09 | 朝統合スクリプト | ⭐⭐ | 各モジュールのつなぎ方 |
| PR-10 | 夜統合スクリプト | ⭐ | PR-09 とほぼ同じ |
| PR-11 | Actions 朝 | ⭐⭐⭐ | cron の UTC 変換・Secrets 設定 |
| PR-12 | Actions 夜 | ⭐ | PR-11 と同じなので楽になる |

---

## 🆘 よくある詰まりポイントと対処法

### ❓ `npm install` でエラーが出る
```bash
# Node.js のバージョンが古い可能性
node -v  # v20 以上が必要

# バージョンが古ければ以下でアップデート
# https://nodejs.org から最新版をインストール
```

### ❓ Google Tasks が取得できない
```
考えられる原因：
1. Tasks API が Cloud Console で有効になっていない
2. リフレッシュトークンが間違っている
3. .env ファイルの変数名にタイポがある（スペルミス）

確認手順：
1. Cloud Console → APIs & Services → 有効な API → Tasks API を探す
2. .env のキー名と process.env.XXX の名前が一致しているか確認
```

### ❓ GitHub Actions が動かない
```
確認ポイント：
1. Secrets の名前が .yml の ${{ secrets.XXX }} と一致しているか
2. YAML のインデントがズレていないか（スペース 2 つ厳守）
3. cron の UTC 時刻変換が合っているか（JST - 9 = UTC）
```

### ❓ Slack に届かない
```
確認ポイント：
1. Webhook URL が正しいか（コピペミスに注意）
2. Incoming Webhooks が Slack App で有効になっているか
3. .env または GitHub Secrets に URL が登録されているか
```

---

*このガイドは LarkReport の実装中にいつでも参照してください。*
*詰まったときは Claude Code にエラーメッセージを貼り付けて相談しましょう。*
