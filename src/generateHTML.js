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
          <span class="text-3xl">⚠️</span>
          <span class="text-[#b45309] text-4xl font-black tabular-nums">${incompleteCount}</span>
        </div>
        <div class="status-card bg-[#fef2f2] border border-[#fee2e2] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">🚨</span>
          <span class="text-[#b91c1c] text-4xl font-black tabular-nums">${overdueCount}</span>
        </div>
      </div>

      <!-- AI コメント -->
      <div class="bg-blue-50 border-l-[6px] border-blue-500 p-8 rounded-r-[2rem] mb-12 flex gap-6 items-start shadow-sm text-blue-900">
        <div class="bg-blue-500 rounded-2xl p-3 text-white shadow-md flex-shrink-0">
          <span class="text-2xl">🤖</span>
        </div>
        <div class="text-xl font-medium leading-relaxed whitespace-pre-wrap">${escapeHtml(aiComment).trim()}</div>
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

/**
 * 夜レポートの HTML 文字列を生成する
 *
 * @param {{
 *   date:           string,
 *   completed:      Array<{title: string}>,
 *   incomplete:     Array<{title: string}>,
 *   overdueTasks:   Array<{title: string, overdueDays: number}>,
 *   completedCount: number,
 *   overdueCount:   number,
 *   progressRate:   number,
 *   aiComment:      string
 * }} data
 * @returns {string} HTML 文字列
 */
export function generateEveningHTML({ date, completed = [], incomplete = [], overdueTasks = [], completedCount = 0, overdueCount = 0, progressRate = 0, aiComment = '' }) {
  const incompleteCount = incomplete.length;
  const safeRate = Math.min(100, Math.max(0, Math.round(Number(progressRate) || 0)));

  // 完了タスク行（打ち消し線）
  const completedItems = completed
    .map(t => `
        <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-slate-500 font-bold text-lg line-through">
          ${escapeHtml(t.title)}
        </div>`)
    .join('') ||
    `<div class="p-4 text-slate-400 text-sm text-center rounded-[2rem] border border-slate-100">完了タスクはありません</div>`;

  // 未完了タスク行（→ 明日へ）
  const incompleteItems = incomplete
    .map(t => `
        <div class="flex items-center justify-between p-5 bg-indigo-50/50 border-2 border-indigo-100 rounded-[2rem]">
          <p class="text-lg text-slate-700 font-bold">${escapeHtml(t.title)}</p>
          <span class="text-xs font-bold text-indigo-400 ml-3 flex-shrink-0">→ 明日へ</span>
        </div>`)
    .join('');

  // 期限切れタスク行（遅延バッジ付き）
  const overdueItems = overdueTasks
    .map(t => `
        <div class="flex items-center justify-between p-5 bg-rose-50 border-2 border-rose-100 rounded-[2rem]">
          <p class="text-lg text-rose-900 font-bold">${escapeHtml(t.title)}</p>
          <span class="bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ml-3">⏱ ${escapeHtml(String(t.overdueDays))}日遅延</span>
        </div>`)
    .join('');

  const nextItems = (overdueItems + incompleteItems) ||
    `<div class="p-4 text-slate-400 text-sm text-center rounded-[2rem] border border-slate-100">未完了タスクはありません 🎉</div>`;

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
    body { width: 800px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background-color: #0f172a; }
    .status-card { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
  </style>
</head>
<body class="p-8">
  <div class="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-10 text-white">
      <div class="flex justify-between items-start mb-8">
        <div class="flex items-center gap-4">
          <h1 class="text-4xl font-black">${escapeHtml(date)}</h1>
          <span class="text-4xl text-indigo-300">🌙</span>
        </div>
        <div class="text-right">
          <div class="text-6xl font-black text-indigo-400 leading-none">${safeRate}<span class="text-2xl ml-1">%</span></div>
        </div>
      </div>
      <!-- 進捗バー -->
      <div class="w-full bg-slate-800/50 rounded-full h-4 overflow-hidden p-0.5 border border-white/10">
        <div class="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 h-full rounded-full" style="width: ${safeRate}%"></div>
      </div>
    </div>

    <div class="p-10 space-y-10">

      <!-- ステータスカード（3カラム） -->
      <div class="grid grid-cols-3 gap-4">
        <div class="status-card bg-[#f0fdf4] border border-[#bbf7d0] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">✅</span>
          <span class="text-[#15803d] text-4xl font-black tabular-nums">${completedCount}</span>
        </div>
        <div class="status-card bg-[#fffbeb] border border-[#fef3c7] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">⚠️</span>
          <span class="text-[#b45309] text-4xl font-black tabular-nums">${incompleteCount}</span>
        </div>
        <div class="status-card bg-[#fef2f2] border border-[#fee2e2] rounded-[1.5rem] py-4 px-6 flex items-center justify-center gap-4">
          <span class="text-3xl">🚨</span>
          <span class="text-[#b91c1c] text-4xl font-black tabular-nums">${overdueCount}</span>
        </div>
      </div>

      <!-- AI コメント -->
      <div class="bg-indigo-50 border-l-[6px] border-indigo-500 p-8 rounded-r-[2rem] flex gap-6 items-start shadow-sm text-indigo-900">
        <div class="bg-indigo-600 rounded-2xl p-3 text-white shadow-md flex-shrink-0">
          <span class="text-2xl">✨</span>
        </div>
        <div class="text-xl font-medium leading-relaxed whitespace-pre-wrap">${escapeHtml(aiComment).trim()}</div>
      </div>

      <!-- タスクリスト（2カラム） -->
      <div class="grid grid-cols-2 gap-8">

        <!-- Done -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 border-b border-emerald-100 pb-3">
            <span class="text-lg">✅</span>
            <span class="font-black text-sm uppercase tracking-widest text-emerald-600 opacity-80">Done</span>
            <span class="ml-auto text-sm font-bold text-emerald-600">${completedCount}件</span>
          </div>
          <div class="space-y-3">
            ${completedItems}
          </div>
        </div>

        <!-- Next -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 border-b border-indigo-100 pb-3">
            <span class="text-lg">📅</span>
            <span class="font-black text-sm uppercase tracking-widest text-indigo-600 opacity-80">Next</span>
            <span class="ml-auto text-sm font-bold text-indigo-600">${incompleteCount + overdueCount}件</span>
          </div>
          <div class="space-y-3">
            ${nextItems}
          </div>
        </div>

      </div>

    </div>

    <!-- フッター -->
    <div class="bg-slate-900 py-8 text-center flex flex-col items-center gap-1">
      <span class="text-xl text-indigo-400">🌙</span>
      <span class="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase">Built for Takuma Chiba</span>
    </div>

  </div>
</body>
</html>`;
}

// 単体実行テスト用（node src/generateHTML.js で動作確認）
if (process.argv[1] && process.argv[1].endsWith('generateHTML.js')) {
  import('fs').then(({ writeFileSync }) => {
    const morningHtml = generateMorningHTML({
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
      aiComment: 'おはようございます！今日も充実した一日にしましょう。\nまずは期限切れになっている設計書のレビューから取り掛かり、全体像を把握してから実装に進むとスムーズです。',
    });
    writeFileSync('test-morning.html', morningHtml);
    console.log('✅ test-morning.html を生成しました');

    const eveningHtml = generateEveningHTML({
      date: '2026年4月29日（水）',
      completed: [
        { title: 'API 接続テストの実装' },
      ],
      incomplete: [
        { title: 'Slack 通知の動作確認' },
      ],
      overdueTasks: [
        { title: 'プロジェクト設計書のレビュー', overdueDays: 2 },
      ],
      completedCount: 1,
      overdueCount: 1,
      progressRate: 33,
      aiComment: '今日もお疲れ様でした！\nAPI 接続テストを完了させた実行力、素晴らしいです。\n期限切れになっている設計書のレビューを明日の午前中に最優先で対処しましょう。',
    });
    writeFileSync('test-evening.html', eveningHtml);
    console.log('✅ test-evening.html を生成しました');
  }).catch(console.error);
}
