/**
 * getZaimToken.js
 *
 * Zaim の OAuth 1.0a アクセストークンを取得するワンタイムスクリプト。
 * 取得した ZAIM_ACCESS_TOKEN / ZAIM_ACCESS_TOKEN_SECRET を .env に設定すれば
 * 以降は fetchZaim.js がそのまま動作する。
 *
 * 実行方法:
 *   1. .env に ZAIM_CLIENT_ID / ZAIM_CLIENT_SECRET を設定
 *   2. node apps/Zeny/scripts/getZaimToken.js を実行
 *   3. 表示された URL をブラウザで開いて Zaim にログイン・認可
 *   4. リダイレクト先の URL から oauth_verifier をコピーしてターミナルに貼り付け
 *   5. 表示された ACCESS_TOKEN / ACCESS_TOKEN_SECRET を .env に設定
 */

import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

const REQUEST_TOKEN_URL = 'https://api.zaim.net/v2/auth/request';
const AUTHORIZE_URL     = 'https://auth.zaim.net/users/auth';
const ACCESS_TOKEN_URL  = 'https://api.zaim.net/v2/auth/access';

const consumerKey    = process.env.ZAIM_CLIENT_ID;
const consumerSecret = process.env.ZAIM_CLIENT_SECRET;

if (!consumerKey || !consumerSecret) {
  console.error('❌ .env に ZAIM_CLIENT_ID / ZAIM_CLIENT_SECRET を設定してください');
  process.exit(1);
}

const oauth = OAuth({
  consumer: { key: consumerKey, secret: consumerSecret },
  signature_method: 'HMAC-SHA1',
  hash_function(base, key) {
    return crypto.createHmac('sha1', key).update(base).digest('base64');
  },
});

/**
 * OAuth 署名付き POST リクエストを送信する
 */
async function oauthPost(url, token = null, extraParams = {}) {
  const requestData = { url, method: 'POST', data: extraParams };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    method: 'POST',
    headers: { ...authHeader },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`リクエスト失敗: ${res.status} ${res.statusText} - ${body}`);
  }

  // レスポンスは "key=value&key=value" 形式
  const text = await res.text();
  return Object.fromEntries(new URLSearchParams(text));
}

/**
 * ターミナルから入力を受け取る
 */
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

(async () => {
  // Step 1: リクエストトークン取得
  // oauth_callback=oob は「ブラウザリダイレクト不要・verifier を手動コピー」を意味する
  console.log('\n⏳ Step 1: リクエストトークンを取得中...');
  const requestToken = await oauthPost(REQUEST_TOKEN_URL, null, { oauth_callback: 'oob' });
  console.log('✅ リクエストトークン取得成功');

  // Step 2: 認可 URL を表示してユーザーに開かせる
  const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${requestToken.oauth_token}`;
  console.log('\n📌 Step 2: 以下の URL をブラウザで開いて Zaim にログイン・認可してください:\n');
  console.log(`  ${authorizeUrl}\n`);
  console.log('認可後、リダイレクト先の URL（または表示された verifier）を確認してください。');

  // Step 3: oauth_verifier を入力
  const verifier = await prompt('\n🔑 Step 3: oauth_verifier を入力してください: ');

  // Step 4: アクセストークン取得
  console.log('\n⏳ Step 4: アクセストークンを取得中...');
  const token = { key: requestToken.oauth_token, secret: requestToken.oauth_token_secret };
  const accessToken = await oauthPost(
    `${ACCESS_TOKEN_URL}?oauth_verifier=${verifier}`,
    token
  );

  console.log('\n✅ アクセストークン取得成功！以下を .env に追加してください:\n');
  console.log(`ZAIM_ACCESS_TOKEN=${accessToken.oauth_token}`);
  console.log(`ZAIM_ACCESS_TOKEN_SECRET=${accessToken.oauth_token_secret}`);
  console.log('');
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
