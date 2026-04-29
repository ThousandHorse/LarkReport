import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

// JST は UTC+9。GitHub Actions などの UTC 環境でも正しく当日日付を扱うためオフセットを定数化する
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

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
 * 今日（JST）期限のタスクを取得し、完了・未完了に分けて返す
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
    const tasksApi = google.tasks({ version: 'v1', auth });

    // タスクリストの選択
    // GOOGLE_TASKLIST_NAME が設定されていれば名前で検索、なければ先頭リストを使用する
    const listsRes = await tasksApi.tasklists.list();
    const items = listsRes.data.items;
    if (!items || items.length === 0) {
      throw new Error('Google Tasks のタスクリストが見つかりませんでした');
    }

    const targetName = process.env.GOOGLE_TASKLIST_NAME;
    const targetList = targetName
      ? items.find(l => l.title === targetName) ?? items[0]
      : items[0];
    const listId = targetList.id;

    // JST で今日の 0:00〜23:59:59.999 を UTC に変換して API に渡す
    const nowJST = new Date(Date.now() + JST_OFFSET_MS);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth();
    const d = nowJST.getUTCDate();
    const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - JST_OFFSET_MS).toISOString();
    const endOfDay = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - JST_OFFSET_MS).toISOString();

    // nextPageToken を使って全ページのタスクを取得する
    const allTasks = [];
    let pageToken;
    do {
      const tasksRes = await tasksApi.tasks.list({
        tasklist: listId,
        dueMin: startOfDay,
        dueMax: endOfDay,
        showCompleted: true,
        showHidden: true,
        maxResults: 100,
        ...(pageToken && { pageToken }),
      });
      const pageItems = tasksRes.data.items || [];
      allTasks.push(...pageItems);
      pageToken = tasksRes.data.nextPageToken;
    } while (pageToken);

    // 1回のループで completed / incomplete に分類する
    const { completed, incomplete } = allTasks.reduce(
      (acc, t) => {
        const isCompleted = t.status === 'completed';
        acc[isCompleted ? 'completed' : 'incomplete'].push({
          title: t.title,
          completed: isCompleted,
        });
        return acc;
      },
      { completed: [], incomplete: [] }
    );

    const total = allTasks.length;
    const completedCount = completed.length;
    const progressRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return { completed, incomplete, total, completedCount, progressRate };
  } catch (err) {
    throw new Error(`Google Tasks の取得に失敗しました: ${err.message}`, { cause: err });
  }
}

if (process.argv[1] && process.argv[1].endsWith('fetchTasks.js')) {
  fetchTodayTasks().then(result => {
    console.log('✅ Google Tasks を取得しました:', JSON.stringify(result, null, 2));
  }).catch(console.error);
}
