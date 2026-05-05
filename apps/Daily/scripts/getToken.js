import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('❌ GOOGLE_CLIENT_ID または GOOGLE_CLIENT_SECRET が .env に設定されていません');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔗 以下の URL をブラウザで開いて認証してください:\n');
console.log(authUrl);
console.log('\n⏳ 認証完了を待っています...\n');

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, REDIRECT_URI);
  if (reqUrl.pathname !== '/callback') return;

  const code = reqUrl.searchParams.get('code');
  if (!code) {
    res.end('認証コードが取得できませんでした。');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    res.end('<h1>✅ 認証完了！ターミナルに戻ってください。</h1>');

    if (refreshToken) {
      console.log('✅ リフレッシュトークンを取得しました!\n');
      console.log('以下を .env に追記してください:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}\n`);
    } else {
      console.log('⚠️  リフレッシュトークンが返されませんでした。');
      console.log('Google アカウントのアプリ権限をいったん削除してから再実行してください。');
      console.log('https://myaccount.google.com/permissions\n');
    }
  } catch (err) {
    res.end('エラーが発生しました。');
    console.error('❌ トークン交換エラー:', err.message);
  } finally {
    server.close();
  }
});

server.listen(3000, () => {
  console.log('🚀 ローカルサーバーを起動しました (http://localhost:3000)');
});
