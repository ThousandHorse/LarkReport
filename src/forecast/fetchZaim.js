import OAuth from 'oauth';
import dotenv from 'dotenv';
dotenv.config();

const CONSUMER_ID = process.env.ZAIM_CONSUMER_ID;
const CONSUMER_SECRET = process.env.ZAIM_CONSUMER_SECRET;
const ACCESS_TOKEN = process.env.ZAIM_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.ZAIM_ACCESS_TOKEN_SECRET;

const MONEY_URL = 'https://api.zaim.net/v2/home/money';

const oauth = new OAuth.OAuth(
  'https://api.zaim.net/v2/auth/request',
  'https://api.zaim.net/v2/auth/access',
  CONSUMER_ID,
  CONSUMER_SECRET,
  '1.0A',
  null,
  'HMAC-SHA1'
);

/**
 * OAuth 1.0a 署名付き GET リクエストを Promise でラップする
 */
function oauthGet(url) {
  return new Promise((resolve, reject) => {
    oauth.get(url, ACCESS_TOKEN, ACCESS_TOKEN_SECRET, (err, data) => {
      if (err) return reject(err);
      resolve(JSON.parse(data));
    });
  });
}

/**
 * Zaim API から今月の収支データを取得する
 *
 * @returns {{
 *   totalIncome: number,
 *   totalExpense: number,
 *   balance: number,
 *   incomeByCategory: Array<{ category: string, amount: number }>,
 *   expenseByCategory: Array<{ category: string, amount: number }>,
 *   rawData: Array<object>
 * }}
 */
export async function fetchMonthlyData() {
  if (!CONSUMER_ID || !CONSUMER_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
    throw new Error('Zaim API の環境変数が設定されていません。.env を確認してください。');
  }

  // 今月の開始・終了日を計算する
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const url = `${MONEY_URL}?start_date=${startDate}&end_date=${endDate}&limit=100`;
  const response = await oauthGet(url);

  const items = response.money || [];

  // 収入・支出に分類する（mode: 'income' or 'payment'）
  const incomeItems = items.filter(item => item.mode === 'income');
  const expenseItems = items.filter(item => item.mode === 'payment');

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const balance = totalIncome - totalExpense;

  // カテゴリ別に集計する
  const incomeByCategory = aggregateByCategory(incomeItems);
  const expenseByCategory = aggregateByCategory(expenseItems);

  return {
    totalIncome,
    totalExpense,
    balance,
    incomeByCategory,
    expenseByCategory,
    rawData: items,
  };
}

/**
 * カテゴリ別に金額を集計する
 */
function aggregateByCategory(items) {
  const map = {};
  for (const item of items) {
    const category = item.category || '未分類';
    map[category] = (map[category] || 0) + item.amount;
  }
  return Object.entries(map)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// 単体実行テスト用（node src/forecast/fetchZaim.js で動作確認）
if (process.argv[1].endsWith('fetchZaim.js')) {
  fetchMonthlyData()
    .then(result => {
      console.log('✅ Zaim 収支データを取得しました:\n');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('❌ エラー:', err);
    });
}
