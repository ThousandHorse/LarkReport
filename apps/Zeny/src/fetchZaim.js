/**
 * fetchZaim.js
 *
 * Zaim API からその日（JST）の支出・収入を取得し集計して返す。
 *
 * 戻り値:
 *   {
 *     payments: [{ date, amount, categoryId, name, comment }]
 *     incomes:  [{ date, amount, categoryId, name, comment }]
 *     summary:  { totalPayment, totalIncome, balance }
 *   }
 *
 * 認証: OAuth 1.0a（oauth-1.0a パッケージで署名生成）
 * 注意: ZAIM_ACCESS_TOKEN_SECRET が必要。Zaim Developer Console で取得すること。
 */

import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ZAIM_API_BASE = 'https://api.zaim.net/v2';

/**
 * OAuth 1.0a クライアントを生成する
 */
function createOAuthClient() {
  const consumerKey    = process.env.ZAIM_CLIENT_ID;
  const consumerSecret = process.env.ZAIM_CLIENT_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('環境変数 ZAIM_CLIENT_ID / ZAIM_CLIENT_SECRET が設定されていません');
  }

  return OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base, key) {
      return crypto.createHmac('sha1', key).update(base).digest('base64');
    },
  });
}

/**
 * Zaim API にリクエストを送信する
 * @param {string} url - リクエスト URL（クエリ文字列含む）
 * @returns {Promise<Object>} レスポンス JSON
 */
async function zaimRequest(url) {
  const accessToken       = process.env.ZAIM_ACCESS_TOKEN;
  const accessTokenSecret = process.env.ZAIM_ACCESS_TOKEN_SECRET;

  if (!accessToken || !accessTokenSecret) {
    throw new Error('環境変数 ZAIM_ACCESS_TOKEN / ZAIM_ACCESS_TOKEN_SECRET が設定されていません');
  }

  const oauth = createOAuthClient();
  const token = { key: accessToken, secret: accessTokenSecret };

  // oauth-1.0a はクエリパラメータを data フィールドで受け取り署名対象に含める
  const urlObj = new URL(url);
  const params = Object.fromEntries(urlObj.searchParams);
  const requestData = {
    url: `${urlObj.origin}${urlObj.pathname}`,
    method: 'GET',
    data: params,
  };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    method: 'GET',
    // GETリクエストにボディはないため Content-Type は付与しない
    headers: { ...authHeader },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zaim API エラー: ${res.status} ${res.statusText} - ${body}`);
  }

  return res.json();
}

/**
 * 指定日（JST）の支出・収入を取得して集計する。
 * @param {Date}   targetDate - UTC ベースの Date オブジェクト（デフォルト: 今日）
 * @param {number} limit      - 取得件数の上限（デフォルト: 100）
 * @returns {Promise<{ payments: Array, incomes: Array, summary: Object }>}
 */
export async function fetchZaimEntries(targetDate = new Date(), limit = 100) {
  // JST はサマータイム不使用のため Intl.DateTimeFormat で安全に日付文字列を取得できる
  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' })
    .format(targetDate); // => "YYYY-MM-DD"

  // WHY: 個人用途では1日100件を超えることは想定しないため、ページネーションは省略
  const url = `${ZAIM_API_BASE}/home/money?start_date=${dateStr}&end_date=${dateStr}&limit=${limit}`;
  const data = await zaimRequest(url);

  const entries = data.money || [];

  const payments = entries
    .filter(e => e.mode === 'payment')
    .map(e => ({
      date:       e.date,
      amount:     e.amount,
      categoryId: e.category_id,
      name:       e.name || '',
      comment:    e.comment || '',
    }));

  const incomes = entries
    .filter(e => e.mode === 'income')
    .map(e => ({
      date:       e.date,
      amount:     e.amount,
      categoryId: e.category_id,
      name:       e.name || '',
      comment:    e.comment || '',
    }));

  const totalPayment = payments.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome  = incomes.reduce((sum, e) => sum + e.amount, 0);

  return {
    payments,
    incomes,
    summary: {
      totalPayment,
      totalIncome,
      balance: totalIncome - totalPayment,
    },
  };
}

// 単体実行: node apps/Zeny/src/fetchZaim.js
if (process.argv[1] && process.argv[1].endsWith('fetchZaim.js')) {
  fetchZaimEntries()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => { console.error(err); process.exit(1); });
}
