const BADGE_MAP = {
  'JCBカード':    'bg-blue-100 text-blue-700',
  'PayPayカード': 'bg-red-100 text-red-600',
  '現金':         'bg-gray-200 text-gray-700',
  '振込':         'bg-green-100 text-green-700',
};

function getBadgeClass(method) {
  return BADGE_MAP[method] || 'bg-yellow-100 text-yellow-700';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(amount) {
  return amount.toLocaleString('ja-JP');
}

function formatDateJa(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const w = days[date.getDay()];
  return `${y}/${m}/${d}（${w}）`;
}

function renderTransactionRow({ category, paymentMethod, amount }, type) {
  const badge = getBadgeClass(paymentMethod);
  const amountColor = type === 'income' ? 'text-emerald-600' : 'text-rose-500';
  const sign = type === 'income' ? '+' : '-';
  return `
    <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-700">${escapeHtml(category)}</span>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${badge}">${escapeHtml(paymentMethod)}</span>
      </div>
      <span class="font-semibold ${amountColor}">${sign}¥${formatCurrency(amount)}</span>
    </div>`;
}

function renderBarChart(monthlyExpenses) {
  const max = Math.max(...monthlyExpenses.map(e => e.amount), 1);
  return monthlyExpenses.map(({ label, amount, color }) => {
    const pct = Math.round((amount / max) * 100);
    const colorStyle = color ? `style="background-color:${escapeHtml(color)}"` : '';
    return `
      <div class="mb-2">
        <div class="flex justify-between text-xs text-gray-600 mb-1">
          <span>${escapeHtml(label)}</span>
          <span>¥${formatCurrency(amount)}</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2">
          <div class="h-2 rounded-full" style="width:${pct}%;background-color:${escapeHtml(color || '#6366f1')}"></div>
        </div>
      </div>`;
  }).join('');
}

function renderFutureExpenses(futureExpenses) {
  if (!futureExpenses || futureExpenses.length === 0) {
    return '<p class="text-sm text-gray-400">予定なし</p>';
  }
  return futureExpenses.map(({ label, year, month, amount }) =>
    `<div class="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
      <span class="text-gray-700">${escapeHtml(label)} <span class="text-gray-400">${year}/${String(month).padStart(2,'0')}</span></span>
      <span class="font-medium text-gray-800">¥${formatCurrency(amount)}</span>
    </div>`
  ).join('');
}

export function generateMoneyHTML({
  date,
  incomeList,
  expenseList,
  futureExpenses,
  monthlyExpenses,
  monthlyIncome,
  aiComment,
}) {
  const dateStr = formatDateJa(date instanceof Date ? date : new Date(date));
  const totalIncome = incomeList.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenseList.reduce((s, i) => s + i.amount, 0);
  const balance = totalIncome - totalExpense;
  const balanceColor = balance >= 0 ? 'text-emerald-600' : 'text-rose-500';
  const balanceSign = balance >= 0 ? '+' : '';

  const incomeRows = incomeList.map(i => renderTransactionRow(i, 'income')).join('');
  const expenseRows = expenseList.map(i => renderTransactionRow(i, 'expense')).join('');
  const barChart = renderBarChart(monthlyExpenses || []);
  const futureRows = renderFutureExpenses(futureExpenses);
  const aiCommentHtml = escapeHtml(aiComment).replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>収支レポート</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; background: #f8fafc; }
  </style>
</head>
<body class="p-0 m-0">
  <div class="w-[800px] mx-auto">

    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-6 rounded-t-2xl">
      <div class="flex justify-between items-center">
        <div>
          <p class="text-violet-200 text-sm font-medium">収支レポート</p>
          <h1 class="text-2xl font-bold mt-1">${escapeHtml(dateStr)}</h1>
        </div>
        <div class="text-right">
          <p class="text-violet-200 text-sm">本日の収支</p>
          <p class="text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-rose-300'}">${balanceSign}¥${formatCurrency(balance)}</p>
        </div>
      </div>
    </div>

    <!-- サマリーカード -->
    <div class="grid grid-cols-3 gap-4 px-8 py-4 bg-white border-b border-gray-100">
      <div class="text-center">
        <p class="text-xs text-gray-500 mb-1">収入</p>
        <p class="text-xl font-bold text-emerald-600">+¥${formatCurrency(totalIncome)}</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-gray-500 mb-1">支出</p>
        <p class="text-xl font-bold text-rose-500">-¥${formatCurrency(totalExpense)}</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-gray-500 mb-1">月収入</p>
        <p class="text-xl font-bold text-indigo-600">¥${formatCurrency(monthlyIncome)}</p>
      </div>
    </div>

    <div class="bg-white px-8 py-6 space-y-6">

      <!-- AI コメント -->
      <div class="bg-violet-50 border border-violet-100 rounded-xl p-4">
        <p class="text-xs text-violet-500 font-medium mb-2">✨ AI アドバイス</p>
        <p class="text-sm text-gray-700 leading-relaxed">${aiCommentHtml}</p>
      </div>

      <!-- 今日の収入 -->
      <div>
        <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">💰 今日の収入</h2>
        ${incomeList.length > 0 ? incomeRows : '<p class="text-sm text-gray-400">記録なし</p>'}
      </div>

      <!-- 今日の支出 -->
      <div>
        <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">💸 今日の支出</h2>
        ${expenseList.length > 0 ? expenseRows : '<p class="text-sm text-gray-400">記録なし</p>'}
      </div>

      <!-- 今後の支出予定 -->
      <div>
        <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">📅 今後の支出予定</h2>
        ${futureRows}
      </div>

      <!-- 月次支出内訳 -->
      <div>
        <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">📊 月次支出内訳</h2>
        ${monthlyExpenses && monthlyExpenses.length > 0 ? barChart : '<p class="text-sm text-gray-400">データなし</p>'}
      </div>

    </div>

    <!-- フッター -->
    <div class="bg-gray-50 px-8 py-3 rounded-b-2xl border-t border-gray-100">
      <p class="text-xs text-gray-400 text-center">Zeny – 収支レポート by LarkReport</p>
    </div>

  </div>
</body>
</html>`;
}

if (process.argv[1] && process.argv[1].endsWith('generateMoneyHTML.js')) {
  import('fs').then(({ writeFileSync, mkdirSync }) => {
    mkdirSync('mockups', { recursive: true });
    const html = generateMoneyHTML({
      date: new Date('2026-05-03'),
      incomeList: [
        { category: 'エンジニア収入', paymentMethod: '振込', amount: 50000 },
      ],
      expenseList: [
        { category: '食費', paymentMethod: '現金', amount: 800 },
        { category: 'カフェ', paymentMethod: 'JCBカード', amount: 540 },
        { category: '交通費', paymentMethod: 'PayPayカード', amount: 320 },
      ],
      futureExpenses: [
        { label: '家賃', year: 2026, month: 5, amount: 80000 },
        { label: '保険料', year: 2026, month: 5, amount: 12000 },
      ],
      monthlyExpenses: [
        { label: '食費', amount: 28000, color: '#f87171' },
        { label: 'カフェ', amount: 12000, color: '#fb923c' },
        { label: '交通費', amount: 8000, color: '#60a5fa' },
        { label: '日用品', amount: 5000, color: '#a78bfa' },
      ],
      monthlyIncome: 350000,
      aiComment: '今日もお疲れ様でした！カフェ代は月12,000円ペースですね ☕\n在宅作業の息抜きとして適度な範囲です。食費をあと少し抑えると月末の余裕が広がります。',
    });
    writeFileSync('mockups/mockup-money-time.html', html);
    console.log('✅ mockups/mockup-money-time.html を生成しました');
  });
}
