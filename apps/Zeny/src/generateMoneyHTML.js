/**
 * generateMoneyHTML.js
 *
 * Zaim（収支）データを受け取り、Tailwind CSS ベースの HTML 文字列を生成する。
 * デザインは apps/Zeny/mock/money.html を参照。
 *
 * 引数:
 *   zaimResult  - fetchZaimEntries() の戻り値
 *                 { payments, incomes, summary: { totalPayment, totalIncome, balance } }
 *   targetDate  - 対象日（Date オブジェクト、デフォルト: 今日）
 *
 * 戻り値: HTML 文字列
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 支払い方法バッジのスタイルを返す
 */
const BADGE_MAP = {
  'JCBカード':    'bg-blue-100 text-blue-700',
  'PayPayカード': 'bg-red-100 text-red-600',
  '現金':         'bg-gray-200 text-gray-700',
  '振込':         'bg-green-100 text-green-700',
};

function getBadgeClass(method) {
  return BADGE_MAP[method] ?? 'bg-yellow-100 text-yellow-700';
}

function fmtYen(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

/**
 * 収入または支出の行 HTML を生成する
 */
function buildTableRows(entries) {
  if (entries.length === 0) {
    return '<tr><td colspan="3" class="py-3 text-center text-gray-400 text-xs">記録なし</td></tr>';
  }
  return entries.map(e => {
    const badge = getBadgeClass(e.method);
    return `
          <tr class="border-b">
            <td class="py-2">${escapeHtml(e.category)}</td>
            <td class="py-2">
              <span class="px-2 py-1 rounded-full text-xs font-semibold ${badge}">
                ${escapeHtml(e.method)}
              </span>
            </td>
            <td class="py-2 text-right font-medium">${fmtYen(e.amount)}</td>
          </tr>`;
  }).join('');
}

/**
 * 今後の支出予定行 HTML を生成する
 */
function buildFutureRows(futureData, todayYM) {
  const nextYM = todayYM + (todayYM % 100 === 12 ? 89 : 1); // 月跨ぎ対応（12→1）

  return futureData.map(item => {
    const ym = item.year * 100 + item.month;
    const isHighlight = ym === todayYM || ym === nextYM;
    const rowCls  = isHighlight ? ' bg-orange-50' : '';
    const badgeCls = isHighlight
      ? 'bg-orange-100 text-orange-700'
      : 'bg-gray-100 text-gray-600';
    return `
          <tr class="border-b${rowCls}">
            <td class="py-2">${escapeHtml(item.label)}</td>
            <td class="py-2">
              <span class="px-2 py-1 text-xs rounded-full ${badgeCls}">
                ${item.year}年${item.month}月
              </span>
            </td>
            <td class="py-2 text-right font-medium">${fmtYen(item.amount)}</td>
          </tr>`;
  }).join('');
}

/**
 * カテゴリ別月次バーグラフ HTML を生成する
 */
function buildMonthlyBars(monthlyData) {
  if (monthlyData.length === 0) return '<p class="text-gray-400 text-xs text-center">データなし</p>';

  const maxAmount = Math.max(...monthlyData.map(d => d.amount));

  return monthlyData.map(item => {
    const pct = maxAmount > 0 ? Math.round((item.amount / maxAmount) * 100) : 0;
    return `
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>${escapeHtml(item.label)}</span><span>${fmtYen(item.amount)}</span>
          </div>
          <div class="bg-gray-200 h-3 rounded-full">
            <div class="${item.color} h-3 rounded-full" style="width:${pct}%"></div>
          </div>
        </div>`;
  }).join('');
}

/**
 * Zaim データから HTML を生成する。
 *
 * @param {Object} zaimResult   - fetchZaimEntries() の戻り値
 * @param {Date}   targetDate   - 対象日（デフォルト: 今日）
 * @param {Object} [opts]       - オプション
 * @param {Array}  [opts.futureExpenses]  - 今後の支出予定 [{ label, year, month, amount }]
 * @param {Array}  [opts.monthlyExpenses] - 今月の累計カテゴリ [{ label, amount, color }]
 * @param {number} [opts.monthlyTotalIncome]  - 今月の収入累計
 * @param {number} [opts.monthlyTotalExpense] - 今月の支出累計
 * @param {string} [opts.aiAdvice]  - AI アドバイス文（HTML 可）
 * @returns {string} HTML 文字列
 */
export function generateMoneyHTML(zaimResult, targetDate = new Date(), opts = {}) {
  const { payments, incomes, summary } = zaimResult;
  const { totalPayment, totalIncome, balance } = summary;

  // 日付ヘッダー: Daily に合わせて "2026/05/03（日）" 形式
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const jstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(targetDate);
  const [jy, jmo, jd] = jstStr.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(`${jstStr}T12:00:00+09:00`).getDay()];
  const dateLabel = `${jy}/${String(jmo).padStart(2, '0')}/${String(jd).padStart(2, '0')}（${weekday}）`;

  // 今月 YYYYMM
  const todayJST = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(targetDate);
  const [y, m] = todayJST.split('-').map(Number);
  const todayYM = y * 100 + m;

  // 収支テーブル
  // fetchZaimEntries は categoryId を返すだけのため、category/method フィールドが必要
  // 現時点では name フィールドをカテゴリ表示に使い、method は常に「記録なし」にはしない
  const incomeRows  = buildTableRows(incomes.map(e => ({
    category: e.name || `カテゴリID: ${e.categoryId}`,
    method:   e.method ?? '—',
    amount:   e.amount,
  })));
  const expenseRows = buildTableRows(payments.map(e => ({
    category: e.name || `カテゴリID: ${e.categoryId}`,
    method:   e.method ?? '—',
    amount:   e.amount,
  })));

  // 差引の色
  const balanceColor = balance >= 0 ? 'text-green-600' : 'text-red-500';

  // 今後の支出予定
  const futureData   = [...(opts.futureExpenses ?? [])].sort(
    (a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month)
  );
  const futureTotal  = futureData.reduce((s, r) => s + r.amount, 0);
  const futureRows   = buildFutureRows(futureData, todayYM);
  const futureTotalLabel = futureData.length > 0
    ? `合計予定金額：${fmtYen(futureTotal)}`
    : '';

  // TODO: 今月の累計（Zaim API 月次集計で実装予定）
  // const monthlyData         = opts.monthlyExpenses ?? [];
  // const monthlyTotalIncome  = opts.monthlyTotalIncome  ?? 0;
  // const monthlyTotalExpense = opts.monthlyTotalExpense ?? 0;
  // const monthlyBars         = buildMonthlyBars(monthlyData);

  // AI アドバイス
  const aiAdvice = opts.aiAdvice ?? '本日の収支データを集計しました。';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zeny Money Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    body { width: 800px; min-height: 900px; margin: 0; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background-color: #f0fdf4; }
  </style>
</head>

<body>
  <div class="bg-white overflow-hidden">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-emerald-500 to-teal-600 p-10 text-white">
      <div class="flex items-center gap-4">
        <h1 class="text-4xl font-black">${dateLabel}</h1>
        <span class="text-4xl">💴</span>
      </div>
    </div>

    <div class="p-10 space-y-10">

      <!-- 💴 今日の収支 -->
      <div>
        <div class="flex items-center gap-3 mb-6 px-2">
          <h2 class="text-2xl font-black text-slate-800">💴 今日の収支</h2>
        </div>

        <!-- サマリー -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[1.5rem] py-4 px-6 text-center">
            <div class="text-sm text-gray-500 mb-1">収入</div>
            <div class="text-2xl font-black text-green-600">${fmtYen(totalIncome)}</div>
          </div>
          <div class="bg-[#fef2f2] border border-[#fee2e2] rounded-[1.5rem] py-4 px-6 text-center">
            <div class="text-sm text-gray-500 mb-1">支出</div>
            <div class="text-2xl font-black text-red-500">${fmtYen(totalPayment)}</div>
          </div>
          <div class="bg-[#fffbeb] border border-[#fef3c7] rounded-[1.5rem] py-4 px-6 text-center">
            <div class="text-sm text-gray-500 mb-1">差引</div>
            <div class="text-2xl font-black ${balanceColor}">${fmtYen(balance)}</div>
          </div>
        </div>

        <!-- 収入テーブル -->
        <div class="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 mb-4">
          <div class="font-black text-green-600 mb-3">📥 収入</div>
          <table class="w-full text-sm">
            <thead class="text-gray-500 border-b">
              <tr>
                <th class="text-left py-2">カテゴリ</th>
                <th class="text-left py-2">支払い方法</th>
                <th class="text-right py-2">金額</th>
              </tr>
            </thead>
            <tbody>${incomeRows}</tbody>
          </table>
        </div>

        <!-- 支出テーブル -->
        <div class="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6">
          <div class="font-black text-red-500 mb-3">📤 支出</div>
          <table class="w-full text-sm">
            <thead class="text-gray-500 border-b">
              <tr>
                <th class="text-left py-2">カテゴリ</th>
                <th class="text-left py-2">支払い方法</th>
                <th class="text-right py-2">金額</th>
              </tr>
            </thead>
            <tbody>${expenseRows}</tbody>
          </table>
        </div>
      </div>

      <!-- 📅 今後の支出予定 -->
      <div>
        <div class="flex items-center gap-3 mb-6 px-2">
          <h2 class="text-2xl font-black text-slate-800">📅 今後の支出予定</h2>
        </div>

        <div class="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6">
          <table class="w-full text-sm mb-4">
            <thead class="text-gray-500 border-b">
              <tr>
                <th class="text-left py-2">内容</th>
                <th class="text-left py-2">予定時期</th>
                <th class="text-right py-2">予定金額</th>
              </tr>
            </thead>
            <tbody>${futureRows || '<tr><td colspan="3" class="py-3 text-center text-gray-400 text-xs">予定なし</td></tr>'}</tbody>
          </table>
          ${futureTotalLabel ? `<div class="text-right font-black text-lg text-slate-800">${futureTotalLabel}</div>` : ''}
        </div>
      </div>

      <!-- TODO: 今月の累計（Zaim API 月次集計で実装予定）
      <div>
        <div class="flex items-center gap-3 mb-6 px-2">
          <h2 class="text-2xl font-black text-slate-800">📊 今月の累計</h2>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-[#fef2f2] border border-[#fee2e2] rounded-[1.5rem] py-4 px-6 text-center">
            <div class="text-sm text-gray-500 mb-1">支出</div>
            <div class="text-2xl font-black text-red-500">monthlyTotalExpense</div>
          </div>
          <div class="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[1.5rem] py-4 px-6 text-center">
            <div class="text-sm text-gray-500 mb-1">収入</div>
            <div class="text-2xl font-black text-green-600">monthlyTotalIncome</div>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 space-y-4">
          monthlyBars
        </div>
      </div>
      -->

      <!-- 🤖 AI アドバイス -->
      <div>
        <div class="flex items-center gap-3 mb-6 px-2">
          <h2 class="text-2xl font-black text-slate-800">🤖 AI からのアドバイス</h2>
        </div>

        <div class="bg-emerald-50 border-l-[6px] border-emerald-500 p-8 rounded-r-[2rem] flex gap-6 items-start shadow-sm text-emerald-900">
          <div class="bg-emerald-500 rounded-2xl p-3 text-white shadow-md flex-shrink-0">
            <span class="text-2xl">🤖</span>
          </div>
          <div class="text-xl font-medium leading-relaxed">${aiAdvice}</div>
        </div>
      </div>

    </div>

  </div>
</body>
</html>`;
}

// 単体実行: node apps/Zeny/src/generateMoneyHTML.js
if (process.argv[1] && process.argv[1].endsWith('generateMoneyHTML.js')) {
  import('fs').then(({ writeFileSync, mkdirSync }) => {
    const mockResult = {
      payments: [
        { name: '🍜 食費',   method: 'PayPayカード', categoryId: 1, amount: 1200, date: '2026-05-03', comment: '' },
        { name: '🚃 交通費', method: 'JCBカード',    categoryId: 2, amount: 560,  date: '2026-05-03', comment: '' },
        { name: '☕ カフェ', method: '現金',          categoryId: 3, amount: 650,  date: '2026-05-03', comment: '' },
      ],
      incomes: [
        { name: '💻 エンジニア収入', method: '振込', categoryId: 10, amount: 350000, date: '2026-05-03', comment: '' },
        { name: '📷 カメラマン収入', method: '現金', categoryId: 11, amount: 30000,  date: '2026-05-03', comment: '' },
      ],
      summary: { totalPayment: 2410, totalIncome: 380000, balance: 377590 },
    };
    const opts = {
      futureExpenses: [
        { label: '🦷 歯医者',     year: 2026, month: 5, amount: 20000  },
        { label: '🏠 引越し費用', year: 2026, month: 6, amount: 300000 },
        { label: '🛋️ 家具・家電', year: 2026, month: 6, amount: 150000 },
      ],
      monthlyExpenses: [
        { label: '🍜 食費',   amount: 32000, color: 'bg-emerald-500' },
        { label: '🚃 交通費', amount: 8400,  color: 'bg-teal-500'    },
        { label: '🛍️ 日用品', amount: 12000, color: 'bg-emerald-400' },
        { label: '☕ カフェ', amount: 6500,  color: 'bg-teal-400'    },
        { label: '🎮 娯楽',   amount: 5000,  color: 'bg-emerald-300' },
      ],
      monthlyTotalIncome:  410000,
      monthlyTotalExpense: 63900,
      aiAdvice: '今日は食費・交通費ともに平均的な支出でした👍<br>来月の引越し費用に備えて、今月の娯楽費を<br>¥3,000 ほど抑えると安心です。<br>引き続き収支プラスをキープしていきましょう！',
    };
    mkdirSync('test-output', { recursive: true });
    const html = generateMoneyHTML(mockResult, new Date(), opts);
    writeFileSync('test-output/money.html', html);
    console.log('✅ test-output/money.html を生成しました');
  });
}
