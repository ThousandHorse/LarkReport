import OAuth from 'oauth';
import dotenv from 'dotenv';
dotenv.config();

const CONSUMER_ID = process.env.ZAIM_CONSUMER_ID;
const CONSUMER_SECRET = process.env.ZAIM_CONSUMER_SECRET;
const ACCESS_TOKEN = process.env.ZAIM_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.ZAIM_ACCESS_TOKEN_SECRET;

const MONEY_URL = 'https://api.zaim.net/v2/home/money';
const CATEGORY_URL = 'https://api.zaim.net/v2/home/category';
const PAGE_LIMIT = 100;

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
      try {
        resolve(JSON.parse(data));
      } catch (parseErr) {
        reject(new Error(`レスポンスの JSON パースに失敗しました: ${parseErr.message}`));
      }
    });
  });
}

/**
 * JST の現在年月から今月の開始・終了日（YYYY-MM-DD）を返す
 * GitHub Actions は UTC で動作するため Intl.DateTimeFormat で JST に変換する
 */
function getJstMonthRange() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).formatToParts(now);

  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const monthNum = parseInt(month, 10);

  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year, 10), monthNum, 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
}

/**
 * /v2/home/category からカテゴリ ID → 名前のマップを取得する
 *
 * @returns {Map<number, string>}
 */
async function fetchCategoryMap() {
  try {
    const response = await oauthGet(CATEGORY_URL);
    const categories = response.categories || [];
    return new Map(categories.map(c => [c.id, c.name]));
  } catch {
    return new Map();
  }
}

/**
 * ページネーションを使って今月の全収支レコードを取得する
 * Zaim API の上限は 1 リクエスト 100 件のため、100 件取得できた場合は次ページも取得する
 */
async function fetchAllMoneyItems(startDate, endDate) {
  const allItems = [];
  let page = 1;

  while (true) {
    const url = `${MONEY_URL}?start_date=${startDate}&end_date=${endDate}&limit=${PAGE_LIMIT}&page=${page}`;
    const response = await oauthGet(url);
    const items = response.money || [];

    allItems.push(...items);

    if (items.length < PAGE_LIMIT) break;
    page++;
  }

  return allItems;
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

  const { startDate, endDate } = getJstMonthRange();

  const [items, categoryMap] = await Promise.all([
    fetchAllMoneyItems(startDate, endDate),
    fetchCategoryMap(),
  ]);

  const incomeItems = items.filter(item => item.mode === 'income');
  const expenseItems = items.filter(item => item.mode === 'payment');

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const balance = totalIncome - totalExpense;

  const incomeByCategory = aggregateByCategory(incomeItems, categoryMap);
  const expenseByCategory = aggregateByCategory(expenseItems, categoryMap);

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
 * カテゴリ ID をカテゴリ名にマッピングしながら金額を集計する
 */
function aggregateByCategory(items, categoryMap) {
  const map = {};
  for (const item of items) {
    const category = categoryMap.get(item.category_id) || `カテゴリID:${item.category_id ?? '不明'}`;
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
