# 📊 LarkReport 実装計画書

## 🎯 プロジェクト概要

Google Tasks のタスクを毎日自動取得し、Tailwind CSS で美しいビジュアルレポート（PNG）を生成して Slack に自動配信するツール。

| 項目 | 内容 |
|------|------|
| トリガー | GitHub Actions（朝 7:00 / 夜 22:00） |
| データ取得元 | Google Tasks API |
| レポート生成 | Node.js + Tailwind CSS → Playwright で PNG 変換 |
| AI 要約 | Google Gemini API（gemini-2.0-flash） |
| 配信先 | Slack Incoming Webhook |

---

## 📁 最終的なファイル構成

```
LarkReport/
├── .github/
│   └── workflows/
│       ├── morning-report.yml     # 朝 7:00 トリガー
│       └── evening-report.yml     # 夜 22:00 トリガー
├── src/
│   ├── fetchTasks.js              # Google Tasks からタスク取得
│   ├── generateHTML.js            # Tailwind HTML レポート生成
│   ├── screenshot.js              # Playwright で PNG 変換
│   ├── summarize.js               # Gemini API で AI 要約生成
│   ├── sendSlack.js               # Slack へ PNG 送信
│   ├── main-morning.js            # 朝レポート統合スクリプト
│   └── main-evening.js            # 夜レポート統合スクリプト
├── mockups/
│   ├── morning-mockup.html        # 朝レポート デザイン確認用
│   └── evening-mockup.html        # 夜レポート デザイン確認用
├── .env.example                   # 環境変数のサンプル
├── package.json
└── README.md
```

---

## 🚦 PR 運用ルール（必読）

> **⚠️ 次の PR は、前の PR がマージされるまで絶対に作成しないこと。**

```
実装
 ↓
デバッグ（エラーがなくなるまで繰り返す）
 ↓
その時点で動く全機能の動作確認 ✅
 ↓
PR 作成 → レビュー → ✅ マージ完了
                           ↓
                       次の PR の実装へ
```

### ルール一覧

- 1 つの PR には **1 つの目的** だけを含める
- **実装後は必ずデバッグを行い、エラーが 0 になってから PR を作成する**
- **PR 作成前に、その時点で存在する全機能が正常に動作することを確認する**
- マージ完了を確認してから、次の PR の実装を開始する
- 各 PR の「完了条件」を全て満たしてからマージする

### デバッグ・動作確認の手順（各 PR 共通）

```
Step 1：実装したスクリプトを単体で実行する
         例）node src/fetchTasks.js

Step 2：エラーが出た場合はエラーメッセージを読み、原因を特定して修正する

Step 3：エラーがなくなったら、これまでにマージ済みの全機能を通しで実行する
         例）PR-07 完了時点 → PR-03〜07 の全機能が連携して動くか確認

Step 4：全機能の動作確認が取れてから PR を作成する
```

---

## 🗂️ PR 一覧（全 14 PR）

| PR# | タイトル | 内容 |
|-----|---------|------|
| PR-01 | プロジェクト初期セットアップ | package.json / .gitignore / README |
| PR-02 | 環境変数の定義 | .env.example の作成 |
| PR-03 | 朝レポート モックアップ | Tailwind CSS で静的 HTML を作成・目視確認 |
| PR-04 | 夜レポート モックアップ | Tailwind CSS で静的 HTML を作成・目視確認 |
| PR-05 | HTML → PNG 変換 | Playwright でローカル HTML を直接スクショ |
| PR-06 | Slack 送信スクリプト | Bot Token + Files API で PNG 送信・モックアップで E2E 検証 |
| PR-07 | Google Tasks API 接続 | タスク取得スクリプト |
| PR-08 | Gemini API 接続 | AI 要約スクリプト |
| PR-09 | 朝レポート HTML テンプレート | モックアップを動的 HTML に変換（朝） |
| PR-10 | 夜レポート HTML テンプレート | モックアップを動的 HTML に変換（夜） |
| PR-11 | 朝レポートの統合スクリプト | 全処理をつなぐ main-morning.js |
| PR-12 | 夜レポートの統合スクリプト | 全処理をつなぐ main-evening.js |
| PR-13 | GitHub Actions 朝ワークフロー | morning-report.yml |
| PR-14 | GitHub Actions 夜ワークフロー | evening-report.yml |

---

## 📦 PR-01：プロジェクト初期セットアップ

### やること
- `package.json` を作成し、使用するライブラリを定義する
- `.gitignore` を作成し、不要なファイルを Git 管理から除外する
- `README.md` を作成する

### 作成するファイル

**`package.json`**
```json
{
  "name": "LarkReport",
  "version": "1.0.0",
  "description": "Google Tasks を Slack に自動レポート配信するツール",
  "main": "src/main-morning.js",
  "type": "module",
  "scripts": {
    "morning": "node src/main-morning.js",
    "evening": "node src/main-evening.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "googleapis": "^140.0.0",
    "@playwright/test": "^1.44.0",
    "dotenv": "^16.0.0",
    "node-fetch": "^3.0.0"
  }
}
```

**`.gitignore`**
```
node_modules/
.env
*.png
dist/
```

### 完了条件・デバッグ確認
- [ ] `npm install` が成功する
- [ ] `node_modules/` フォルダが生成される
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🔐 PR-02：環境変数の定義

### やること
- `.env.example` を作成する（実際の値は入れない、キー名だけ書く）
- 各変数が何のために使うかをコメントで説明する

### ⚠️ 重要
`.env` ファイルは **絶対に Git にコミットしない**こと。`.gitignore` で除外済み。

### 作成するファイル

**`.env.example`**
```env
# ===================================
# Google Tasks API 認証情報
# Google Cloud Console で取得する
# ===================================
GOOGLE_CLIENT_ID=あなたのクライアントID
GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
GOOGLE_REFRESH_TOKEN=あなたのリフレッシュトークン

# ===================================
# Gemini API キー
# https://aistudio.google.com/app/apikey で取得（無料枠あり）
# ===================================
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===================================
# Slack Bot Token
# Slack App の「OAuth & Permissions」画面で取得する（xoxb- で始まる）
# 必要スコープ: files:write, chat:write
# ===================================
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx

# ===================================
# Slack 投稿先チャンネル ID
# チャンネル名ではなく ID（例: C0123456789）を使用する
# チャンネルを右クリック → 「チャンネル詳細を表示」→ 最下部に表示される
# ===================================
SLACK_CHANNEL_ID=C0123456789
```

### GitHub Secrets への登録方法
GitHub Actions で使う場合は、リポジトリの
`Settings → Secrets and variables → Actions → New repository secret`
から各キーを登録すること。

登録するシークレット一覧：
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GEMINI_API_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`

### 完了条件・デバッグ確認
- [ ] `.env.example` がリポジトリに存在する
- [ ] `.env`（実際の値入り）が `.gitignore` に含まれており、Git に追跡されていない
- [ ] `git status` を実行して `.env` が表示されないことを確認する
- [ ] エラーが 0 件であることを確認してから PR を作成する

---


## 🎨 PR-03：朝レポート モックアップ

### やること
- ダミーデータ（固定値）を使って、朝レポートの見た目を HTML で作る
- API 接続は一切しない。デザインだけを確定させる
- ブラウザで開いて「この見た目で OK」と確認してから次に進む

### なぜモックアップを先に作るか

```
モックアップなしで進めると…
  API 接続 → HTML 生成 → 「あ、デザイン違う」→ HTML を大幅修正
  → 修正のたびに API を叩く無駄なコストが発生

モックアップを先に作ると…
  デザイン確定 → API 接続 → HTML に当てはめるだけ
  → 手戻りゼロ・無駄なし
```

### 作成するファイル

**`mockups/morning-mockup.html`**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { width: 800px; margin: 0 auto; font-family: 'Hiragino Sans', sans-serif; }
  </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
  <div class="bg-white rounded-2xl shadow-lg overflow-hidden">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">🌅</span>
        <div>
          <h1 class="text-white text-2xl font-bold">朝のレポート</h1>
          <p class="text-blue-100 text-sm">2026年4月25日 土曜日</p>
        </div>
      </div>
    </div>

    <div class="p-8">

      <!-- タスク一覧 -->
      <div class="mb-6">
        <h2 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>📋</span> 今日のタスク（5件）
        </h2>
        <ul class="space-y-2">
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
            <span class="text-gray-700">スタートライン清澄白河 来店（11:00）</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
            <span class="text-gray-700">ピタットハウス清澄白河 来店（16:00）</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
            <span class="text-gray-700">DateCoach STT 実装</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
            <span class="text-gray-700">Udemy Flutter コース 30分</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
            <span class="text-gray-700">カメラマン案件 返信</span>
          </li>
        </ul>
      </div>

      <!-- AI コメント -->
      <div class="bg-indigo-50 rounded-xl p-5">
        <h2 class="text-sm font-bold text-indigo-600 mb-2 flex items-center gap-2">
          <span>🤖</span> AI からのひとこと
        </h2>
        <p class="text-gray-700 text-sm leading-relaxed">
          物件内覧が2件と開発作業が重なるタフな一日です。
          午前中の内覧に集中して、午後は開発にまとめて取り組むとスムーズですよ！
        </p>
      </div>

    </div>
  </div>
</body>
</html>
```

### 完了条件・デバッグ確認
- [ ] `mockups/morning-mockup.html` をブラウザで開いてデザインを目視確認する
- [ ] レイアウト崩れ・文字切れ・余白のズレがないことを確認する
- [ ] **デザインに納得してから** PR を作成する（修正は PR 前に完了させる）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🌙 PR-04：夜レポート モックアップ

### やること
- ダミーデータを使って、夜レポートの見た目を HTML で作る
- 進捗バー・完了リスト・未完了リストのデザインを確定させる

### 作成するファイル

**`mockups/evening-mockup.html`**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { width: 800px; margin: 0 auto; font-family: 'Hiragino Sans', sans-serif; }
  </style>
</head>
<body class="bg-gradient-to-br from-indigo-900 to-purple-900 p-8">
  <div class="bg-white rounded-2xl shadow-xl overflow-hidden">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-indigo-700 to-purple-700 px-8 py-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">🌙</span>
        <div>
          <h1 class="text-white text-2xl font-bold">夜のレポート</h1>
          <p class="text-purple-200 text-sm">2026年4月25日 土曜日</p>
        </div>
      </div>
    </div>

    <div class="p-8">

      <!-- 進捗バー -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-gray-700">本日の進捗</span>
          <span class="text-2xl font-bold text-indigo-600">60%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full" style="width: 60%"></div>
        </div>
        <p class="text-sm text-gray-500 mt-1">完了 3件 ／ 全 5件</p>
      </div>

      <!-- 完了タスク -->
      <div class="mb-4">
        <h2 class="text-sm font-bold text-green-600 mb-2">✅ 完了（3件）</h2>
        <ul class="space-y-2">
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="text-green-500">✅</span>
            <span class="text-gray-400 line-through">スタートライン清澄白河 来店（11:00）</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="text-green-500">✅</span>
            <span class="text-gray-400 line-through">ピタットハウス清澄白河 来店（16:00）</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="text-green-500">✅</span>
            <span class="text-gray-400 line-through">Udemy Flutter コース 30分</span>
          </li>
        </ul>
      </div>

      <!-- 未完了タスク -->
      <div class="mb-6">
        <h2 class="text-sm font-bold text-orange-500 mb-2">⬜ 未完了（2件）</h2>
        <ul class="space-y-2">
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0"></span>
            <span class="text-gray-700">DateCoach STT 実装</span>
            <span class="ml-auto text-xs text-orange-400 font-medium">→ 明日へ</span>
          </li>
          <li class="flex items-center gap-3 py-2 border-b border-gray-100">
            <span class="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0"></span>
            <span class="text-gray-700">カメラマン案件 返信</span>
            <span class="ml-auto text-xs text-orange-400 font-medium">→ 明日へ</span>
          </li>
        </ul>
      </div>

      <!-- AI コメント -->
      <div class="bg-purple-50 rounded-xl p-5">
        <h2 class="text-sm font-bold text-purple-600 mb-2 flex items-center gap-2">
          <span>🤖</span> AI からの振り返り
        </h2>
        <p class="text-gray-700 text-sm leading-relaxed">
          物件内覧2件をしっかりこなした充実の一日でした！
          明日は開発とカメラマン返信を朝一番で片付けると気持ちよくスタートできますよ 💪
        </p>
      </div>

    </div>
  </div>
</body>
</html>
```

### 完了条件・デバッグ確認
- [ ] `mockups/evening-mockup.html` をブラウザで開いてデザインを目視確認する
- [ ] 進捗バー・完了リスト・未完了リストが正しく表示されている
- [ ] 朝モックアップ（PR-03）と色調・雰囲気に統一感があることを確認する
- [ ] **デザインに納得してから** PR を作成する（修正は PR 前に完了させる）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 📸 PR-05：HTML → PNG 変換（Playwright）

### やること
- Playwright で生成した HTML 文字列を直接レンダリングしてスクリーンショットを撮る
- 外部サービス不要で、ローカル・GitHub Actions の両方でそのまま動作する

### なぜ HTML を直接渡すか

```
【外部 URL を経由する方法】
  HTML → 外部サービスに公開 → URL → Playwright で開く → PNG
  → 外部サービスのアカウント・トークン・ネットワーク遅延が必要

【HTML を直接渡す方法（採用）✅】
  HTML → Playwright の page.setContent() に渡す → PNG
  → 外部依存ゼロ・シンプル・高速
```

### 作成するファイル

**`src/screenshot.js`**
```javascript
import { chromium } from '@playwright/test';

/**
 * HTML 文字列を Playwright でレンダリングして PNG 画像のバイナリデータを返す
 *
 * @param {string} html - レンダリングする HTML 文字列
 * @returns {Buffer} PNG 画像のバイナリデータ
 */
export async function htmlToPng(html) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // ビューポートを 800px × 1200px に設定（レポートの固定幅に合わせる）
  await page.setViewportSize({ width: 800, height: 1200 });

  // HTML 文字列を直接ページにセットする
  // waitUntil: 'networkidle' = Tailwind CDN など全リソースの読み込み完了まで待つ
  await page.setContent(html, { waitUntil: 'networkidle' });

  // ページ全体のスクリーンショットを PNG で撮影する
  // fullPage: true = スクロールが必要な部分も全てキャプチャ
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: true,
  });

  await browser.close();

  return screenshot;
}

// 単体実行テスト用（node src/screenshot.js で動作確認）
if (process.argv[1].endsWith('screenshot.js')) {
  const testHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="p-8 bg-blue-50"><h1 class="text-2xl font-bold text-blue-800">スクショテスト</h1></body></html>`;
  import('fs').then(({ writeFileSync }) => {
    htmlToPng(testHtml).then(buf => {
      writeFileSync('test-screenshot.png', buf);
      console.log('✅ test-screenshot.png を生成しました');
    }).catch(console.error);
  });
}
```

### インストールコマンド

```bash
# ライブラリのインストール
npm install

# Playwright が使う Chromium ブラウザをインストール（初回のみ）
npx playwright install chromium
```

### 完了条件・デバッグ確認
- [ ] `node src/screenshot.js` を実行すると `test-screenshot.png` が生成される
- [ ] PNG をブラウザで開いて「スクショテスト」が表示されていることを確認する
- [ ] PR-03〜04 も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 📨 PR-06：Slack 送信スクリプト

### やること
- Slack の **Files Upload API** を使って PNG 画像をチャンネルに送信する
- Bot Token を使うことで、ファイルの添付（実際の画像表示）が可能になる

### 事前準備（手動）

1. [Slack API](https://api.slack.com/apps) にアクセス
2. `Create New App` → `From scratch`
3. `OAuth & Permissions` を開く
4. `Bot Token Scopes` に以下を追加する
   - `files:write`（ファイルのアップロード権限）
   - `chat:write`（メッセージ投稿権限）
5. `Install to Workspace` をクリックしてインストール
6. 表示される `Bot User OAuth Token`（`xoxb-` で始まる）をコピーして `.env` の `SLACK_BOT_TOKEN` に保存
7. 投稿先チャンネルを右クリック → 「チャンネル詳細を表示」→ 最下部のチャンネル ID をコピーして `SLACK_CHANNEL_ID` に保存
8. チャンネルに作成した Bot を追加する（チャンネル内で `/invite @ボット名`）

### 作成するファイル

**`src/sendSlack.js`**
```javascript
import dotenv from 'dotenv';
dotenv.config();

/**
 * Slack に PNG 画像をアップロードしてチャンネルに投稿する
 *
 * @param {Buffer} imageBuffer - PNG 画像のバイナリデータ
 * @param {string} filename    - ファイル名（例: morning-report.png）
 * @param {string} message     - 画像に添えるテキストメッセージ
 */
export async function sendToSlack(imageBuffer, filename, message) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  // Step 1: アップロード用 URL を取得する
  const urlRes = await fetch('https://slack.com/api/files.getUploadURLExternal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      length: imageBuffer.length,
    }),
  });

  const { upload_url, file_id } = await urlRes.json();
  if (!upload_url) throw new Error('Slack アップロード URL の取得に失敗しました');

  // Step 2: 取得した URL に PNG バイナリを PUT でアップロードする
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: imageBuffer,
  });

  if (!uploadRes.ok) throw new Error(`PNG アップロード失敗: ${uploadRes.statusText}`);

  // Step 3: アップロード完了を通知してチャンネルに投稿する
  const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [{ id: file_id }],
      channel_id: channelId,
      initial_comment: message,
    }),
  });

  const completeData = await completeRes.json();
  if (!completeData.ok) throw new Error(`Slack 投稿失敗: ${completeData.error}`);

  console.log('✅ Slack に PNG レポートを送信しました');
}
```

### 完了条件・デバッグ確認
- [ ] `mockups/morning-mockup.html` を読み込んで `htmlToPng()` で PNG を生成し、`sendToSlack()` で Slack に送信する
- [ ] Slack のチャンネルにモックアップの PNG 画像が届く（API 接続なしでパイプライン全体が動作することを確認）
- [ ] テキストメッセージ（`message` の内容）も一緒に表示される
- [ ] PR-03〜05 も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 📋 PR-07：Google Tasks API 接続

### やること
- Google Tasks API を使って「今日のタスク一覧」を取得する
- 完了済み・未完了を判別できるデータ形式に変換する

### 事前準備（コード実装前に手動で行う）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例：`LarkReport`）
3. `Tasks API` を有効化
4. `OAuth 2.0 クライアント ID` を作成（種類：デスクトップアプリ）
5. `CLIENT_ID` と `CLIENT_SECRET` をメモ
6. リフレッシュトークンを取得（OAuth2 フロー実行）

### 作成するファイル

**`src/fetchTasks.js`**
```javascript
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Google Tasks API に接続するクライアントを作成する
 */
function createAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // リフレッシュトークンをセットすることで、
  // アクセストークンを自動で再取得してくれる
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return auth;
}

/**
 * 今日期限のタスクを取得し、完了・未完了に分けて返す
 *
 * @returns {{
 *   completed: Array<{title: string, completed: boolean}>,
 *   incomplete: Array<{title: string, completed: boolean}>,
 *   total: number,
 *   completedCount: number,
 *   progressRate: number
 * }}
 */
export async function fetchTodayTasks() {
  const auth = createAuthClient();
  const tasks = google.tasks({ version: 'v1', auth });

  // タスクリスト一覧を取得（デフォルトリストを使用）
  const listsRes = await tasks.tasklists.list();
  const listId = listsRes.data.items[0].id;

  // 今日の開始・終了時刻を計算（ISO 形式）
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  // タスクを取得（期限が今日のものに絞る）
  const tasksRes = await tasks.tasks.list({
    tasklist: listId,
    dueMin: startOfDay,
    dueMax: endOfDay,
    showCompleted: true,  // 完了済みも含める
    showHidden: true,
  });

  const allTasks = tasksRes.data.items || [];

  // 完了・未完了に分類する
  const completed = allTasks.filter(t => t.status === 'completed').map(t => ({
    title: t.title,
    completed: true,
  }));

  const incomplete = allTasks.filter(t => t.status !== 'completed').map(t => ({
    title: t.title,
    completed: false,
  }));

  const total = allTasks.length;
  const completedCount = completed.length;

  // 進捗率を計算（0〜100 の整数）
  const progressRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return { completed, incomplete, total, completedCount, progressRate };
}

// 単体実行テスト用（node src/fetchTasks.js で動作確認）
if (process.argv[1].endsWith('fetchTasks.js')) {
  fetchTodayTasks().then(result => {
    console.log('取得結果:', JSON.stringify(result, null, 2));
  }).catch(console.error);
}
```

### 完了条件・デバッグ確認
- [ ] `node src/fetchTasks.js` を実行して、タスクデータがコンソールに表示される
- [ ] 完了・未完了のタスクが正しく分類されている
- [ ] `progressRate`（進捗率）が正しい数値で返ってくる
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🤖 PR-08：Gemini API 接続（AI 要約）

### やること
- Google Gemini API を呼び出して、タスク一覧から AI コメントを生成する
- 朝・夜でプロンプトを変える
- 無料枠（gemini-2.0-flash）を使用することで都度課金を回避する

### 作成するファイル

**`src/summarize.js`**
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * 朝レポート用の AI コメントを生成する
 *
 * @param {Array<{title: string}>} tasks - 今日のタスク一覧
 * @returns {string} AI が生成したコメント文
 */
export async function generateMorningComment(tasks) {
  const taskList = tasks.map(t => `・${t.title}`).join('\n');

  const prompt = `以下は今日のタスク一覧です。
励みになる朝のコメントを日本語で2〜3文で生成してください。
タスクの優先順位や進め方のアドバイスも含めてください。

${taskList}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// 単体実行テスト用（node src/summarize.js で動作確認）
if (process.argv[1].endsWith('summarize.js')) {
  const testTasks = [
    { title: 'テストタスク1', completed: false },
    { title: 'テストタスク2', completed: false },
  ];
  generateMorningComment(testTasks).then(comment => {
    console.log('朝コメント:', comment);
  }).catch(console.error);
}

/**
 * 夜レポート用の AI コメントを生成する
 *
 * @param {Array<{title: string, completed: boolean}>} tasks - タスクと完了状態
 * @param {number} progressRate - 進捗率（0〜100）
 * @returns {string} AI が生成したコメント文
 */
export async function generateEveningComment(tasks, progressRate) {
  const taskList = tasks
    .map(t => `${t.completed ? '✅' : '⬜'} ${t.title}`)
    .join('\n');

  const prompt = `今日の作業結果です。進捗率は ${progressRate}% です。
振り返りと明日への前向きなアドバイスを日本語で2〜3文で生成してください。

${taskList}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### 完了条件・デバッグ確認
- [ ] テスト用のタスクを渡して AI コメントがコンソールに表示される
- [ ] 朝・夜で異なるトーンのコメントが生成される
- [ ] PR-03〜07 も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🎨 PR-09：朝レポート HTML テンプレート（Tailwind CSS）

### やること
- Tailwind CSS を使って、朝レポートの HTML を動的に生成する
- PNG 変換しやすいよう、固定幅（800px）で作る

### 作成するファイル

**`src/generateHTML.js`（朝レポート部分）**
```javascript
/**
 * 朝レポートの HTML 文字列を生成する
 *
 * @param {{
 *   date: string,
 *   tasks: Array<{title: string}>,
 *   aiComment: string
 * }} data
 * @returns {string} HTML 文字列
 */
export function generateMorningHTML({ date, tasks, aiComment }) {
  const taskItems = tasks
    .map(
      t => `
      <li class="flex items-center gap-3 py-2 border-b border-gray-100">
        <span class="w-5 h-5 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
        <span class="text-gray-700">${t.title}</span>
      </li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; }
  </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
  <div class="bg-white rounded-2xl shadow-lg overflow-hidden">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">🌅</span>
        <div>
          <h1 class="text-white text-2xl font-bold">朝のレポート</h1>
          <p class="text-blue-100 text-sm">${date}</p>
        </div>
      </div>
    </div>

    <div class="p-8">

      <!-- タスク一覧 -->
      <div class="mb-6">
        <h2 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>📋</span> 今日のタスク（${tasks.length}件）
        </h2>
        <ul class="space-y-1">
          ${taskItems}
        </ul>
      </div>

      <!-- AI コメント -->
      <div class="bg-indigo-50 rounded-xl p-5">
        <h2 class="text-sm font-bold text-indigo-600 mb-2 flex items-center gap-2">
          <span>🤖</span> AI からのひとこと
        </h2>
        <p class="text-gray-700 text-sm leading-relaxed">${aiComment}</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}
```

### 完了条件・デバッグ確認
- [ ] `generateMorningHTML()` を呼び出すと HTML 文字列が返ってくる
- [ ] HTML をブラウザで開いてデザインが崩れていないことを目視確認する
- [ ] PR-03〜08 も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🌙 PR-10：夜レポート HTML テンプレート（Tailwind CSS）

### やること
- 夜レポート専用の HTML を生成する関数を追加する
- 進捗バー・完了・未完了の視覚的な表示を実装する

**`src/generateHTML.js`（夜レポート部分を追記）**
```javascript
/**
 * 夜レポートの HTML 文字列を生成する
 *
 * @param {{
 *   date: string,
 *   completed: Array<{title: string}>,
 *   incomplete: Array<{title: string}>,
 *   total: number,
 *   completedCount: number,
 *   progressRate: number,
 *   aiComment: string
 * }} data
 * @returns {string} HTML 文字列
 */
export function generateEveningHTML({
  date, completed, incomplete,
  total, completedCount, progressRate, aiComment
}) {
  const completedItems = completed
    .map(t => `
      <li class="flex items-center gap-3 py-2 border-b border-gray-100">
        <span class="text-green-500">✅</span>
        <span class="text-gray-500 line-through">${t.title}</span>
      </li>`)
    .join('');

  const incompleteItems = incomplete
    .map(t => `
      <li class="flex items-center gap-3 py-2 border-b border-gray-100">
        <span class="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0"></span>
        <span class="text-gray-700">${t.title}</span>
        <span class="ml-auto text-xs text-orange-400 font-medium">→ 明日へ</span>
      </li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; }
  </style>
</head>
<body class="bg-gradient-to-br from-indigo-900 to-purple-900 p-8">
  <div class="bg-white rounded-2xl shadow-xl overflow-hidden">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-indigo-700 to-purple-700 px-8 py-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">🌙</span>
        <div>
          <h1 class="text-white text-2xl font-bold">夜のレポート</h1>
          <p class="text-purple-200 text-sm">${date}</p>
        </div>
      </div>
    </div>

    <div class="p-8">

      <!-- 進捗バー -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-gray-700">本日の進捗</span>
          <span class="text-2xl font-bold text-indigo-600">${progressRate}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div
            class="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all"
            style="width: ${progressRate}%"
          ></div>
        </div>
        <p class="text-sm text-gray-500 mt-1">完了 ${completedCount}件 ／ 全 ${total}件</p>
      </div>

      <!-- 完了タスク -->
      ${completed.length > 0 ? `
      <div class="mb-4">
        <h2 class="text-sm font-bold text-green-600 mb-2">✅ 完了（${completed.length}件）</h2>
        <ul>${completedItems}</ul>
      </div>` : ''}

      <!-- 未完了タスク -->
      ${incomplete.length > 0 ? `
      <div class="mb-6">
        <h2 class="text-sm font-bold text-orange-500 mb-2">⬜ 未完了（${incomplete.length}件）</h2>
        <ul>${incompleteItems}</ul>
      </div>` : ''}

      <!-- AI コメント -->
      <div class="bg-purple-50 rounded-xl p-5">
        <h2 class="text-sm font-bold text-purple-600 mb-2 flex items-center gap-2">
          <span>🤖</span> AI からの振り返り
        </h2>
        <p class="text-gray-700 text-sm leading-relaxed">${aiComment}</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}
```

### 完了条件・デバッグ確認
- [ ] `generateEveningHTML()` を呼び出すと HTML 文字列が返ってくる
- [ ] HTML をブラウザで開いて進捗バー・完了・未完了リストが正しく表示される
- [ ] PR-03〜09 も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🔗 PR-11：朝レポートの統合スクリプト

### やること
- PR-05〜10 で作った各モジュールを組み合わせて、朝レポートを一気通貫で実行する

### 作成するファイル

**`src/main-morning.js`**
```javascript
import { fetchTodayTasks } from './fetchTasks.js';
import { generateMorningComment } from './summarize.js';
import { generateMorningHTML } from './generateHTML.js';
import { htmlToPng } from './screenshot.js';
import { sendToSlack } from './sendSlack.js';

async function runMorningReport() {
  console.log('🌅 朝レポート生成を開始します...');

  // Step 1: Google Tasks からタスクを取得
  console.log('📋 タスクを取得中...');
  const { incomplete } = await fetchTodayTasks();

  // Step 2: Gemini API で AI コメント生成
  console.log('🤖 AI コメントを生成中...');
  const aiComment = await generateMorningComment(incomplete);

  // Step 3: 今日の日付を整形（例: 2026年4月21日 月曜日）
  const date = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  // Step 4: HTML レポートを生成
  console.log('🎨 HTML を生成中...');
  const html = generateMorningHTML({ date, tasks: incomplete, aiComment });

  // Step 5: HTML → PNG 変換（Playwright でローカルレンダリング）
  console.log('📸 スクリーンショットを撮影中...');
  const png = await htmlToPng(html);

  // Step 6: Slack に PNG を送信
  console.log('📨 Slack に送信中...');
  await sendToSlack(png, 'morning-report.png', `🌅 ${date} 朝のレポートが届きました！`);

  console.log('✅ 朝レポートの送信が完了しました！');
}

runMorningReport().catch(console.error);
```

### 完了条件・デバッグ確認
- [ ] `npm run morning` を実行して Slack に朝レポート PNG が届く
- [ ] AI コメント・タスクリスト・日付が正しく表示されている
- [ ] PR-05〜10 も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## 🌙 PR-12：夜レポートの統合スクリプト

### やること
- 夜レポートを一気通貫で実行する統合スクリプトを作成する

### 作成するファイル

**`src/main-evening.js`**
```javascript
import { fetchTodayTasks } from './fetchTasks.js';
import { generateEveningComment } from './summarize.js';
import { generateEveningHTML } from './generateHTML.js';
import { htmlToPng } from './screenshot.js';
import { sendToSlack } from './sendSlack.js';

async function runEveningReport() {
  console.log('🌙 夜レポート生成を開始します...');

  // Step 1: Google Tasks からタスクを取得（完了・未完了両方）
  console.log('📋 タスクを取得中...');
  const { completed, incomplete, total, completedCount, progressRate } = await fetchTodayTasks();

  // Step 2: Gemini API で AI コメント生成
  console.log('🤖 AI コメントを生成中...');
  const allTasks = [...completed, ...incomplete];
  const aiComment = await generateEveningComment(allTasks, progressRate);

  // Step 3: 今日の日付を整形
  const date = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  // Step 4: HTML レポートを生成
  console.log('🎨 HTML を生成中...');
  const html = generateEveningHTML({
    date, completed, incomplete,
    total, completedCount, progressRate, aiComment,
  });

  // Step 5: HTML → PNG 変換（Playwright でローカルレンダリング）
  console.log('📸 スクリーンショットを撮影中...');
  const png = await htmlToPng(html);

  // Step 6: Slack に PNG を送信
  console.log('📨 Slack に送信中...');
  await sendToSlack(png, 'evening-report.png', `🌙 ${date} 夜のレポートが届きました！`);

  console.log('✅ 夜レポートの送信が完了しました！');
}

runEveningReport().catch(console.error);
```

### 完了条件・デバッグ確認
- [ ] `npm run evening` を実行して Slack に夜レポート PNG が届く
- [ ] 進捗バー・完了タスク・未完了タスク・AI コメントが正しく表示されている
- [ ] `npm run morning` も引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## ⚙️ PR-13：GitHub Actions 朝ワークフロー

### やること
- GitHub Actions に朝 7:00（JST）に自動実行されるワークフローを定義する
- JST（日本時間）は UTC+9 なので、GitHub Actions の cron は UTC 基準で 22:00 に設定する

### 作成するファイル

**`.github/workflows/morning-report.yml`**
```yaml
name: 朝のデイリーレポート

# 毎日 UTC 22:00 = JST 07:00 に実行
on:
  schedule:
    - cron: '0 22 * * *'
  # 手動実行も可能にする（テスト用）
  workflow_dispatch:

jobs:
  send-morning-report:
    runs-on: ubuntu-latest  # Linux サーバー上で実行

    steps:
      # Step 1: このリポジトリのコードをサーバーにダウンロード
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4

      # Step 2: Node.js をインストール
      - name: Node.js セットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Step 3: 依存ライブラリをインストール
      - name: 依存ライブラリのインストール
        run: npm ci

      # Step 4: Playwright の公式セットアップ（Chromium を自動インストール）
      # Puppeteer と違い、公式アクションで一発セットアップできる ✅
      - name: Playwright セットアップ
        run: npx playwright install --with-deps chromium

      # Step 5: 朝レポートスクリプトを実行
      - name: 朝レポートを実行
        env:
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          GOOGLE_REFRESH_TOKEN: ${{ secrets.GOOGLE_REFRESH_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
        run: npm run morning
```

### cron 記法の読み方

```
'0 22 * * *'
 │  │  │ │ └── 曜日（* = 毎日）
 │  │  │ └──── 月（* = 毎月）
 │  │  └────── 日（* = 毎日）
 │  └────────── 時（UTC で 22 時 = JST の 7 時）
 └──────────── 分（0 分ちょうど）
```

### 完了条件・デバッグ確認
- [ ] GitHub の Actions タブで `workflow_dispatch`（手動実行）して成功する
- [ ] 実行ログにエラーが出ていないことを確認する
- [ ] Slack に朝レポート PNG が届いている
- [ ] `npm run morning` / `npm run evening` もローカルで引き続き正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する

---

## ⚙️ PR-14：GitHub Actions 夜ワークフロー

### やること
- 夜 22:00（JST）= UTC 13:00 に自動実行されるワークフローを定義する

### 作成するファイル

**`.github/workflows/evening-report.yml`**
```yaml
name: 夜のデイリーレポート

# 毎日 UTC 13:00 = JST 22:00 に実行
on:
  schedule:
    - cron: '0 13 * * *'
  workflow_dispatch:

jobs:
  send-evening-report:
    runs-on: ubuntu-latest

    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4

      - name: Node.js セットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存ライブラリのインストール
        run: npm ci

      # Playwright の公式セットアップ（朝ワークフローと同じ設定）
      - name: Playwright セットアップ
        run: npx playwright install --with-deps chromium

      - name: 夜レポートを実行
        env:
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          GOOGLE_REFRESH_TOKEN: ${{ secrets.GOOGLE_REFRESH_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
        run: npm run evening
```

### 完了条件・デバッグ確認
- [ ] GitHub Actions で `workflow_dispatch`（手動実行）して Slack に夜レポートが届く
- [ ] 実行ログにエラーが出ていないことを確認する
- [ ] 翌日、朝・夜ともにスケジュール自動実行されていることをログで確認する
- [ ] 朝・夜ワークフロー両方が正常動作する（全機能確認）
- [ ] エラーが 0 件であることを確認してから PR を作成する → 🎉 完成！

---

## 📌 実装全体のチェックリスト

### 事前準備（コード不要・手動作業）
- [ ] Google Cloud Console でプロジェクト作成
- [ ] Tasks API を有効化
- [ ] OAuth 2.0 クライアント ID を発行
- [ ] リフレッシュトークンを取得
- [ ] Slack ワークスペース作成（個人用）
- [ ] Slack App 作成・`files:write` + `chat:write` スコープを付与
- [ ] Slack Bot Token（`xoxb-`）を取得・投稿先チャンネルに Bot を招待
- [ ] Slack チャンネル ID を取得
- [ ] Gemini API キーを取得（Google AI Studio: https://aistudio.google.com/app/apikey）
- [ ] GitHub リポジトリ作成
- [ ] GitHub Secrets に全キーを登録（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN / GEMINI_API_KEY / SLACK_BOT_TOKEN / SLACK_CHANNEL_ID）

### PR 実装チェック（デバッグ確認 → マージ → 次の PR の順で進める）

**フェーズ1：デリバリーパイプライン検証（モックアップで E2E 確認）**
- [ ] PR-01：package.json / .gitignore / README 作成・動作確認
- [ ] PR-02：.env.example 作成・Git 追跡されていないことを確認
- [ ] PR-03：朝モックアップ HTML・ブラウザで目視確認・デザイン納得
- [ ] PR-04：夜モックアップ HTML・ブラウザで目視確認・デザイン納得
- [ ] PR-05：Playwright PNG 変換・test-screenshot.png の生成を確認
- [ ] PR-06：Slack 送信スクリプト・**モックアップ PNG が Slack に届いたことを確認** ✅ パイプライン検証完了

**フェーズ2：API 接続**
- [ ] PR-07：Google Tasks 取得スクリプト・タスク取得成功を確認
- [ ] PR-08：Gemini API 要約スクリプト・AI コメント生成を確認

**フェーズ3：動的テンプレート＋統合**
- [ ] PR-09：朝 HTML テンプレート（動的化）・ブラウザで目視確認
- [ ] PR-10：夜 HTML テンプレート（動的化）・ブラウザで目視確認
- [ ] PR-11：朝レポート統合・Slack に PNG レポート届いたことを確認
- [ ] PR-12：夜レポート統合・Slack に PNG レポート届いたことを確認

**フェーズ4：自動化**
- [ ] PR-13：GitHub Actions 朝ワークフロー・手動実行で成功を確認
- [ ] PR-14：GitHub Actions 夜ワークフロー・手動＆翌日自動実行を確認 → 🎉 完成

---

## 🚀 推奨実装順序

```
Week 1：準備・デザイン確定・パイプライン検証
  Day 1: 事前準備（Google / Slack / GitHub の設定）
  Day 2: PR-01, PR-02（プロジェクト作成）
  Day 3: PR-03（朝モックアップ・デザイン確定）
  Day 4: PR-04（夜モックアップ・デザイン確定）
  Day 5: PR-05（Playwright でローカルスクショ確認）
  Day 6: PR-06（Slack PNG 送信テスト）
          ★ モックアップ PNG が Slack に届いた時点でパイプライン検証完了 ✅

Week 2：API 接続
  Day 7: PR-07（Google Tasks 接続テスト）
  Day 8: PR-08（Gemini API 接続テスト）

Week 3：動的テンプレート＋統合
  Day 9:  PR-09（朝 HTML 動的化）
  Day 10: PR-10（夜 HTML 動的化）
  Day 11: PR-11, PR-12（統合スクリプトで E2E テスト）

Week 4：自動化
  Day 12: PR-13, PR-14（GitHub Actions 手動実行テスト）
  Day 13: 本番自動実行を確認して完成 🎉
```

---

*このドキュメントは Claude Code に渡して実装を進めるための設計書です。*
*PR ごとに 1 つずつ実装し、動作確認してからマージしてください。*
