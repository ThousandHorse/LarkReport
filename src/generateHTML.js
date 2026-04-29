/**
 * HTML 特殊文字をエスケープする
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  const taskCount = tasks.length;
  const taskItems = taskCount > 0
    ? tasks
        .map(
          t => `
        <li class="flex items-center gap-4 p-4 bg-white border border-blue-100 rounded-2xl shadow-sm">
          <span class="w-6 h-6 rounded-full border-2 border-blue-400 flex-shrink-0"></span>
          <span class="text-slate-700 text-base font-medium">${escapeHtml(t.title)}</span>
        </li>`
        )
        .join('')
    : `<li class="p-4 text-slate-400 text-sm text-center">今日のタスクはありません</li>`;

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
  <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-blue-100">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-10 py-8">
      <div class="flex items-center gap-4">
        <span class="text-5xl">🌅</span>
        <div>
          <h1 class="text-white text-3xl font-black">朝のレポート</h1>
          <p class="text-blue-100 text-base mt-1">${escapeHtml(date)}</p>
        </div>
      </div>
    </div>

    <div class="p-10">

      <!-- AI コメント -->
      <div class="bg-blue-50 border-l-4 border-blue-500 rounded-r-2xl p-6 mb-8 flex gap-4 items-start shadow-sm">
        <div class="bg-blue-500 rounded-xl p-2 text-white flex-shrink-0">
          <span class="text-2xl">🤖</span>
        </div>
        <div>
          <p class="text-sm font-bold text-blue-600 mb-1">AI からのひとこと</p>
          <p class="text-slate-700 text-sm leading-relaxed">${escapeHtml(aiComment)}</p>
        </div>
      </div>

      <!-- タスク一覧 -->
      <div>
        <h2 class="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <span>📋</span> 今日のタスク
          <span class="ml-2 bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">${taskCount}件</span>
        </h2>
        <ul class="space-y-3">
          ${taskItems}
        </ul>
      </div>

    </div>

    <!-- フッター -->
    <div class="bg-slate-50 py-5 text-center border-t border-slate-100">
      <span class="text-xs font-bold text-slate-400 tracking-widest uppercase">LarkReport</span>
    </div>

  </div>
</body>
</html>`;
}

// 単体実行テスト用（node src/generateHTML.js で動作確認）
if (process.argv[1] && process.argv[1].endsWith('generateHTML.js')) {
  import('fs').then(({ writeFileSync }) => {
    const html = generateMorningHTML({
      date: '2026年4月29日（水）',
      tasks: [
        { title: 'プロジェクト設計書のレビュー' },
        { title: 'API 接続テストの実装' },
        { title: 'Slack 通知の動作確認' },
      ],
      aiComment: 'おはようございます！今日も充実した一日にしましょう。まずは設計書のレビューから取り掛かり、全体像を把握してから実装に進むとスムーズです。',
    });
    writeFileSync('test-morning.html', html);
    console.log('✅ test-morning.html を生成しました（ブラウザで開いて確認してください）');
  }).catch(console.error);
}
