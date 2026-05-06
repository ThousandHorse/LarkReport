/**
 * postZaim.js
 *
 * Zaim API への書き込みラッパー。
 * Slack モーダルで入力した収支データを Zaim に登録する。
 *
 * 実装する関数:
 *   fetchZaimCategories() — カテゴリ一覧を取得してキャッシュする
 *   postZaimPayment(entry) — 支出を Zaim に登録する
 *   postZaimIncome(entry)  — 収入を Zaim に登録する
 *
 * 認証: OAuth 1.0a（fetchZaim.js と同じパターン）
 */

import './env.js';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

const ZAIM_API_BASE = 'https://api.zaim.net/v2';

// カテゴリ一覧のインメモリキャッシュ（プロセス起動中は再取得しない）
let categoryCache = null;

/**
 * OAuth 1.0a クライアントを生成する（fetchZaim.js と同じパターン）
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
 * Zaim API に POST リクエストを送信する
 *
 * @param {string} path   - API パス（例: '/home/money/payment'）
 * @param {Object} params - POST パラメータ
 * @returns {Promise<Object>} レスポンス JSON
 */
async function zaimPost(path, params) {
  const accessToken       = process.env.ZAIM_ACCESS_TOKEN;
  const accessTokenSecret = process.env.ZAIM_ACCESS_TOKEN_SECRET;

  if (!accessToken || !accessTokenSecret) {
    throw new Error('環境変数 ZAIM_ACCESS_TOKEN / ZAIM_ACCESS_TOKEN_SECRET が設定されていません');
  }

  const oauth = createOAuthClient();
  const token = { key: accessToken, secret: accessTokenSecret };
  const url   = `${ZAIM_API_BASE}${path}`;

  const requestData = { url, method: 'POST', data: params };
  const authHeader  = oauth.toHeader(oauth.authorize(requestData, token));

  const body = new URLSearchParams(params);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zaim API エラー: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

/**
 * Zaim API に GET リクエストを送信する
 *
 * @param {string} url - リクエスト URL
 * @returns {Promise<Object>} レスポンス JSON
 */
async function zaimGet(url) {
  const accessToken       = process.env.ZAIM_ACCESS_TOKEN;
  const accessTokenSecret = process.env.ZAIM_ACCESS_TOKEN_SECRET;

  if (!accessToken || !accessTokenSecret) {
    throw new Error('環境変数 ZAIM_ACCESS_TOKEN / ZAIM_ACCESS_TOKEN_SECRET が設定されていません');
  }

  const oauth = createOAuthClient();
  const token = { key: accessToken, secret: accessTokenSecret };

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
    headers: { ...authHeader },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zaim API エラー: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

/**
 * Zaim のカテゴリ一覧を取得してキャッシュする。
 * 2回目以降はキャッシュを返す。
 *
 * @returns {Promise<Array<{ id: number, name: string, mode: string }>>}
 */
export async function fetchZaimCategories() {
  if (categoryCache) return categoryCache;

  const data = await zaimGet(`${ZAIM_API_BASE}/home/category`);
  categoryCache = (data.categories ?? []).map(c => ({
    id:   c.id,
    name: c.name,
    mode: c.mode, // 'payment' | 'income'
  }));

  return categoryCache;
}

/**
 * カテゴリ名から Zaim カテゴリ ID を検索する。
 * 一致しない場合は null を返す。
 *
 * @param {string} categoryName - カテゴリ名（例: "食費"）
 * @param {'payment'|'income'} mode
 * @returns {Promise<number|null>}
 */
async function resolveCategoryId(categoryName, mode) {
  const categories = await fetchZaimCategories();
  const matched = categories.find(
    c => c.mode === mode && c.name === categoryName
  );
  return matched?.id ?? null;
}

/**
 * 支出を Zaim に登録する。
 *
 * @param {{
 *   date:      string,  // "YYYY-MM-DD"
 *   category:  string,  // カテゴリ名（例: "食費"）
 *   amount:    number,
 *   name?:     string,  // 品目名
 *   comment?:  string,
 * }} entry
 * @returns {Promise<Object>} Zaim API レスポンス
 */
export async function postZaimPayment(entry) {
  const { date, category, amount, name = '', comment = '' } = entry;

  // カテゴリ名 → ID（見つからなければ未分類として category_id を省略）
  const categoryId = await resolveCategoryId(category, 'payment');

  const params = {
    mapping:  '1',
    date,
    amount:   String(amount),
    name,
    comment,
    ...(categoryId !== null && { category_id: String(categoryId) }),
  };

  try {
    const result = await zaimPost('/home/money/payment', params);
    return result;
  } catch (err) {
    throw new Error(`Zaim 支出登録に失敗しました: ${err.message}`, { cause: err });
  }
}

/**
 * 収入を Zaim に登録する。
 *
 * @param {{
 *   date:      string,  // "YYYY-MM-DD"
 *   category:  string,  // カテゴリ名（例: "給与"）
 *   amount:    number,
 *   name?:     string,
 *   comment?:  string,
 * }} entry
 * @returns {Promise<Object>} Zaim API レスポンス
 */
export async function postZaimIncome(entry) {
  const { date, category, amount, name = '', comment = '' } = entry;

  const categoryId = await resolveCategoryId(category, 'income');

  const params = {
    mapping:  '1',
    date,
    amount:   String(amount),
    name,
    comment,
    ...(categoryId !== null && { category_id: String(categoryId) }),
  };

  try {
    const result = await zaimPost('/home/money/income', params);
    return result;
  } catch (err) {
    throw new Error(`Zaim 収入登録に失敗しました: ${err.message}`, { cause: err });
  }
}

// 単体実行: node apps/Zeny/src/postZaim.js
if (process.argv[1] && process.argv[1].endsWith('postZaim.js')) {
  (async () => {
    console.log('=== fetchZaimCategories テスト ===');
    const categories = await fetchZaimCategories();
    console.log(`取得カテゴリ数: ${categories.length}`);
    console.log('支出カテゴリ例:', categories.filter(c => c.mode === 'payment').slice(0, 5));
    console.log('収入カテゴリ例:', categories.filter(c => c.mode === 'income').slice(0, 5));

    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

    console.log('\n=== postZaimPayment テスト ===');
    const payResult = await postZaimPayment({
      date:     today,
      category: '食費',
      amount:   1,
      name:     'テスト支出（削除してください）',
      comment:  'postZaim.js 動作確認用',
    });
    console.log('✅ 支出登録成功:', JSON.stringify(payResult, null, 2));
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
