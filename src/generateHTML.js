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
 *   date:           string,
 *   tasks:          Array<{title: string}>,
 *   overdueTasks:   Array<{title: string, overdueDays: number}>,
 *   completedCount: number,
 *   overdueCount:   number,
 *   aiComment:      string
 * }} data
 * @returns {string} HTML 文字列
 */
export function generateMorningHTML({ date, tasks, overdueTasks = [], completedCount = 0, overdueCount = 0, aiComment }) {
  const incompleteCount = tasks.length;

  // 期限切れタスク行（赤系・遅延バッジ付き）
  const overdueItems = overdueTasks
    .map(t => `
        <div class="flex items-center p-6 bg-white border-2 border-rose-100 rounded-[2.5rem] shadow-sm">
          <div class="w-8 h-8 rounded-xl border-2 border-rose-200 mr-5 flex-shrink-0"></div>
          <p class="text-2xl text-slate-700 font-bold flex-grow">${escapeHtml(t.title)}</p>
          <span class="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-lg flex-shrink-0 ml-3">
            ⏱ ${escapeHtml(String(t.overdueDays))}日遅延
          </span>
        </div>`)
    .join('');

  // 今日の未完了タスク行
  const incompleteItems = tasks
    .map(t => `
        <div class="flex items-center p-6 bg-white border-2 border-blue-100 rounded-[2.5rem] shadow-sm">
          <div class="w-8 h-8 rounded-xl border-2 border-blue-200 mr-5 flex-shrink-0"></div>
          <p class="text-2xl text-slate-700 font-bold">${escapeHtml(t.title)}</p>
        </div>`)
    .join('');

  const taskItems = (overdueItems + incompleteItems) ||
    `<div class="p-6 text-slate-400 text-center rounded-[2.5rem] border-2 border-slate-100">今日のタスクはありません</div>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background-color: #f8fafc; }
    .status-card { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
  </style>
</head>
<body class="p-8">
  <div class="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-blue-100">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-blue-600 to-cyan-500 p-10 text-white">
      <div class="flex items-center gap-4">
        <h1 class="text-4xl font-black">${escapeHtml(date)}</h1>
        <span class="text-4xl text-yellow-300">☀️</span>
      </div>
    </div>

    <div class="p-10">

      <!-- ステータスカード（3カラム） -->
      <div class="grid grid-cols-3 gap-4 mb-10">
        <div class="status-card bg-[#f0fdf4] border border-[#bbf7d0] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">✅</span>
          <span class="text-[#15803d] text-4xl font-black tabular-nums">${completedCount}</span>
        </div>
        <div class="status-card bg-[#fffbeb] border border-[#fef3c7] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">⬜</span>
          <span class="text-[#b45309] text-4xl font-black tabular-nums">${incompleteCount}</span>
        </div>
        <div class="status-card bg-[#fef2f2] border border-[#fee2e2] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">⚠️</span>
          <span class="text-[#b91c1c] text-4xl font-black tabular-nums">${overdueCount}</span>
        </div>
      </div>

      <!-- AI コメント -->
      <div class="bg-blue-50 border-l-[6px] border-blue-500 p-8 rounded-r-[2rem] mb-12 flex gap-6 items-start shadow-sm text-blue-900">
        <div class="bg-blue-500 rounded-2xl p-3 text-white shadow-md flex-shrink-0">
          <span class="text-2xl">🤖</span>
        </div>
        <div class="text-xl font-medium leading-relaxed whitespace-pre-wrap">
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
        { title: 'API 接続テストの実装' },
        { title: 'Slack 通知の動作確認' },
      ],
      overdueTasks: [
        { title: 'プロジェクト設計書のレビュー', overdueDays: 2 },
      ],
      completedCount: 1,
      overdueCount: 1,
      aiComment: 'おはようございます！今日も充実した一日にしましょう。まずは期限切れになっている設計書のレビューから取り掛かり、全体像を把握してから実装に進むとスムーズです。',
    });
    writeFileSync('test-morning.html', html);
    console.log('✅ test-morning.html を生成しました（ブラウザで開いて確認してください）');
  }).catch(console.error);
}
