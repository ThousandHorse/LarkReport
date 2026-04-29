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
        <div class="flex items-center p-6 bg-white border-2 border-blue-100 rounded-[2.5rem] shadow-sm">
          <div class="w-8 h-8 rounded-xl border-2 border-blue-200 mr-5 flex-shrink-0"></div>
          <p class="text-2xl text-slate-700 font-bold">${escapeHtml(t.title)}</p>
        </div>`
        )
        .join('')
    : `<div class="p-6 text-slate-400 text-center rounded-[2.5rem] border-2 border-slate-100">今日のタスクはありません</div>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background-color: #f8fafc; }
    .status-card { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
  </style>
</head>
<body class="p-8">
  <div class="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-blue-100">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-blue-600 to-cyan-500 p-10 text-white">
      <div class="flex items-center justify-between">
        <h1 class="text-4xl font-black">${escapeHtml(date)}</h1>
        <span class="text-4xl text-yellow-300">☀️</span>
      </div>
    </div>

    <div class="p-10">

      <!-- ステータスカード -->
      <div class="flex justify-center mb-10">
        <div class="status-card bg-[#eff6ff] border border-[#bfdbfe] rounded-[1.5rem] py-4 px-10 flex items-center gap-4">
          <span class="text-3xl">📋</span>
          <span class="text-blue-700 text-4xl font-black tabular-nums">${taskCount}</span>
          <span class="text-blue-600 text-lg font-bold">件のタスク</span>
        </div>
      </div>

      <!-- AI コメント -->
      <div class="bg-blue-50 border-l-[6px] border-blue-500 p-8 rounded-r-[2rem] mb-12 flex gap-6 items-start shadow-sm text-blue-900">
        <div class="bg-blue-500 rounded-2xl p-3 text-white shadow-md flex-shrink-0">
          <span class="text-2xl">🤖</span>
        </div>
        <div class="text-xl font-medium leading-relaxed">
          ${escapeHtml(aiComment)}
        </div>
      </div>

      <!-- タスク一覧 -->
      <div>
        <div class="flex items-center gap-3 mb-6 px-2">
          <span class="text-2xl">📝</span>
          <h2 class="text-2xl font-black text-slate-800">今日のタスク</h2>
        </div>
        <div class="space-y-4">
          ${taskItems}
        </div>
      </div>

    </div>

    <!-- フッター -->
    <div class="bg-slate-50 py-8 text-center flex flex-col items-center gap-1 border-t border-slate-100">
      <span class="text-xl text-slate-300">🛡️</span>
      <span class="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Built for Takuma Chiba</span>
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
