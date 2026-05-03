import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchCalendarEvents } from './fetchCalendar.js';
import { generateMoneyHTML } from './generateMoneyHTML.js';
import { htmlToPng } from './screenshot.js';
import { sendToSlack } from './sendSlack.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getJSTDate() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(jst.toISOString().slice(0, 10));
}

function formatDateJa(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const w = days[date.getDay()];
  return `${y}/${m}/${d}（${w}）`;
}

function loadManualEntries(targetDate) {
  const dateStr = targetDate.toISOString().slice(0, 10);
  try {
    const filePath = path.join(__dirname, '../data/manual-entries.json');
    const raw = readFileSync(filePath, 'utf-8');
    const all = JSON.parse(raw);
    return all.filter(e => e.date === dateStr);
  } catch {
    return [];
  }
}

async function generateAIComment({ totalIncome, totalExpense, expenseList, futureExpenses, dateStr }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const expenseSummary = expenseList
    .map(e => `${e.category} ¥${e.amount}`)
    .join('、') || 'なし';

  const futureSummary = (futureExpenses || [])
    .map(f => `${f.label} ${f.year}/${String(f.month).padStart(2, '0')} ¥${f.amount}`)
    .join('、') || 'なし';

  const prompt = `
以下は${dateStr}の収支データです。
収入: ${totalIncome}円
支出: ${totalExpense}円
支出カテゴリ: ${expenseSummary}
今後の支出予定: ${futureSummary}

フリーランスエンジニア（30歳男性）へ向けた
家計アドバイスを3〜4文で生成してください。
絵文字を1〜2個使い、親しみやすいトーンで。
`;

  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/[*_`#]/g, '').trim();
      console.log(`✅ Gemini (${modelName}) でコメント生成`);
      return text;
    } catch (err) {
      if (err.status === 503 || err.message?.includes('503')) {
        console.warn(`⚠️ ${modelName} が 503。次のモデルに切り替えます。`);
        continue;
      }
      throw err;
    }
  }

  return '今日も一日お疲れ様でした。引き続き収支管理を続けていきましょう！';
}

async function main() {
  const today = getJSTDate();
  const dateStr = formatDateJa(today);
  console.log(`📅 収支レポート生成開始: ${dateStr}`);

  // 1. Google Calendar からカレンダーイベント取得
  let calendarData = { events: [], summary: {} };
  try {
    calendarData = await fetchCalendarEvents(today);
    console.log(`📆 カレンダーイベント取得: ${calendarData.events.length} 件`);
  } catch (err) {
    console.warn('⚠️ カレンダー取得エラー（スキップ）:', err.message);
  }

  // 2. Zaim API（PR-15 完了後に有効化・現状はスキップ）

  // 3. 手動入力データを読み込む
  const manualEntries = loadManualEntries(today);
  console.log(`📝 手動入力データ: ${manualEntries.length} 件`);

  // 4. 収支データをマージ
  const incomeList = manualEntries
    .filter(e => e.type === 'income')
    .map(e => ({ category: e.category, paymentMethod: e.paymentMethod, amount: e.amount }));

  const expenseList = manualEntries
    .filter(e => e.type === 'expense')
    .map(e => ({ category: e.category, paymentMethod: e.paymentMethod, amount: e.amount }));

  const totalIncome = incomeList.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenseList.reduce((s, i) => s + i.amount, 0);

  // 月次集計（カテゴリ別支出集計）
  const categoryTotals = {};
  expenseList.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const COLOR_MAP = ['#f87171', '#fb923c', '#60a5fa', '#a78bfa', '#34d399', '#f59e0b'];
  const monthlyExpenses = Object.entries(categoryTotals).map(([label, amount], i) => ({
    label,
    amount,
    color: COLOR_MAP[i % COLOR_MAP.length],
  }));

  // 5. Gemini AI でアドバイス生成
  let aiComment = '';
  if (process.env.GEMINI_API_KEY) {
    try {
      aiComment = await generateAIComment({
        totalIncome,
        totalExpense,
        expenseList,
        futureExpenses: [],
        dateStr,
      });
    } catch (err) {
      console.warn('⚠️ Gemini エラー（スキップ）:', err.message);
      aiComment = '今日も一日お疲れ様でした。引き続き収支管理を続けていきましょう！';
    }
  } else {
    aiComment = '今日も一日お疲れ様でした。引き続き収支管理を続けていきましょう！';
  }

  // 6. HTML 生成
  const html = generateMoneyHTML({
    date: today,
    incomeList,
    expenseList,
    futureExpenses: [],
    monthlyExpenses,
    monthlyIncome: totalIncome,
    aiComment,
  });

  // 7. PNG 変換
  console.log('🖼️ PNG 変換中...');
  const png = await htmlToPng(html);

  // 8. Slack 送信
  const filename = `money-report-${today.toISOString().slice(0, 10)}.png`;
  await sendToSlack(png, filename, `💰 ${dateStr} 収支レポート`);

  console.log('✅ 収支レポート送信完了');
}

main().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
