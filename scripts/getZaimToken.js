import OAuth from 'oauth';
import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const CONSUMER_ID = process.env.ZAIM_CONSUMER_ID;
const CONSUMER_SECRET = process.env.ZAIM_CONSUMER_SECRET;
const CALLBACK_URL = 'http://localhost:3000/callback';

const REQUEST_TOKEN_URL = 'https://api.zaim.net/v2/auth/request';
const ACCESS_TOKEN_URL = 'https://api.zaim.net/v2/auth/access';
const AUTHORIZE_URL = 'https://auth.zaim.net/users/auth';

if (!CONSUMER_ID || !CONSUMER_SECRET) {
  console.error('❌ ZAIM_CONSUMER_ID と ZAIM_CONSUMER_SECRET を .env に設定してください');
  process.exit(1);
}

const oauth = new OAuth.OAuth(
  REQUEST_TOKEN_URL,
  ACCESS_TOKEN_URL,
  CONSUMER_ID,
  CONSUMER_SECRET,
  '1.0A',
  CALLBACK_URL,
  'HMAC-SHA1'
);

// Step 1: リクエストトークンを取得する
oauth.getOAuthRequestToken((err, requestToken, requestTokenSecret) => {
  if (err) {
    console.error('❌ リクエストトークンの取得に失敗しました:', err);
    process.exit(1);
  }

  const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${requestToken}`;
  console.log('\n✅ リクエストトークンを取得しました');
  console.log('\n以下の URL をブラウザで開いて Zaim にログインし、アプリを認証してください:\n');
  console.log(`  ${authorizeUrl}\n`);
  console.log('認証完了後、自動的にアクセストークンが表示されます...\n');

  // Step 2: localhost:3000 でコールバックを待受する
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, CALLBACK_URL);
    const verifier = parsedUrl.searchParams.get('oauth_verifier');

    if (!verifier) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>oauth_verifier が見つかりません。もう一度認証してください。</h1>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>認証完了！ターミナルに戻ってアクセストークンを確認してください。</h1>');

    // Step 3: verifier を使ってアクセストークンを取得する
    oauth.getOAuthAccessToken(
      requestToken,
      requestTokenSecret,
      verifier,
      (err, accessToken, accessTokenSecret) => {
        server.close();

        if (err) {
          console.error('❌ アクセストークンの取得に失敗しました:', err);
          process.exit(1);
        }

        console.log('✅ アクセストークンを取得しました！\n');
        console.log('以下の値を .env に設定してください:\n');
        console.log(`ZAIM_ACCESS_TOKEN=${accessToken}`);
        console.log(`ZAIM_ACCESS_TOKEN_SECRET=${accessTokenSecret}`);
        console.log('');
      }
    );
  });

  server.listen(3000, () => {
    console.log('localhost:3000 でコールバックを待機中...');
  });
});
