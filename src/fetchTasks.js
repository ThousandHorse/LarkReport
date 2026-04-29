import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Google Tasks API に接続するクライアントを作成する
 */
function createAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      '環境変数 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN が設定されていません'
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

/**
 * 今日期限のタスクを取得し、完了・未完了に分けて返す
 *
 * @returns {Promise<{
 *   completed: Array<{title: string, completed: boolean}>,
 *   incomplete: Array<{title: string, completed: boolean}>,
 *   total: number,
 *   completedCount: number,
 *   progressRate: number
 * }>}
 */
export async function fetchTodayTasks() {
  try {
    const auth = createAuthClient();
    const tasks = google.tasks({ version: 'v1', auth });

    const listsRes = await tasks.tasklists.list();
    const items = listsRes.data.items;
    if (!items || items.length === 0) {
      throw new Error('Google Tasks のタスクリストが見つかりませんでした');
    }
    const listId = items[0].id;

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0
    ).toISOString();
    const endOfDay = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999
    ).toISOString();

    const tasksRes = await tasks.tasks.list({
      tasklist: listId,
      dueMin: startOfDay,
      dueMax: endOfDay,
      showCompleted: true,
      showHidden: true,
    });

    const allTasks = tasksRes.data.items || [];

    const completed = allTasks
      .filter(t => t.status === 'completed')
      .map(t => ({ title: t.title, completed: true }));

    const incomplete = allTasks
      .filter(t => t.status !== 'completed')
      .map(t => ({ title: t.title, completed: false }));

    const total = allTasks.length;
    const completedCount = completed.length;
    const progressRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return { completed, incomplete, total, completedCount, progressRate };
  } catch (err) {
    throw new Error(`Google Tasks の取得に失敗しました: ${err.message}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('fetchTasks.js')) {
  fetchTodayTasks().then(result => {
    console.log('✅ Google Tasks を取得しました:', JSON.stringify(result, null, 2));
  }).catch(console.error);
}
