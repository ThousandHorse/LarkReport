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
 * 今日（JST）期限のタスクを取得し、完了・未完了に分けて返す。
 * あわせて過去 90 日以内の期限切れ未完了タスク（overdue）も取得して返す。
 *
 * @returns {Promise<{
 *   completed:     Array<{title: string, completed: boolean}>,
 *   incomplete:    Array<{title: string, completed: boolean}>,
 *   overdue:       Array<{title: string, completed: boolean, overdueDays: number}>,
 *   total:         number,
 *   completedCount: number,
 *   overdueCount:  number,
 *   progressRate:  number
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

    // Google Tasks は due を常に UTC midnight（T00:00:00.000Z）で保存する。
    // dueMin/dueMax は UTC date で比較されるため、JST の今日に相当する UTC 日付範囲を使う。
    // dueMax は exclusive なので翌日の UTC midnight を指定する。
    const nowJST = new Date(Date.now() + JST_OFFSET_MS);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth();
    const d = nowJST.getUTCDate();
    const startOfDay  = new Date(Date.UTC(y, m, d,     0, 0, 0, 0)).toISOString(); // JST 今日の UTC midnight
    const endOfDay    = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0)).toISOString(); // 翌日の UTC midnight（exclusive）
    const ninetyDaysAgo = new Date(Date.UTC(y, m, d - 90, 0, 0, 0, 0)).toISOString(); // 90 日前

    // ① 今日のタスクを取得（完了・未完了両方）
    const todayTasks = await fetchAllPages(tasksApi, listId, {
      dueMin: startOfDay,
      dueMax: endOfDay,
      showCompleted: true,
      showHidden: true,
    });

    // ② 期限切れ未完了タスクを取得（過去 90 日以内、incomplete のみ）
    const overdueTasks = await fetchAllPages(tasksApi, listId, {
      dueMin: ninetyDaysAgo,
      dueMax: startOfDay,   // 今日より前（exclusive）
      showCompleted: false,
      showHidden: true,
    });

    // 今日のタスクを completed / incomplete に分類する
    const { completed, incomplete } = todayTasks.reduce(
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

    // 期限切れタスクに overdueDays を付与する
    const todayUTC = new Date(Date.UTC(y, m, d));
    const overdue = overdueTasks.map(t => {
      const dueDate = new Date(t.due);
      const overdueDays = Math.floor((todayUTC - dueDate) / (1000 * 60 * 60 * 24));
      return { title: t.title, completed: false, overdueDays };
    });

    const total = todayTasks.length;
    const completedCount = completed.length;
    const overdueCount = overdue.length;
    const progressRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return { completed, incomplete, overdue, total, completedCount, overdueCount, progressRate };
  } catch (err) {
    throw new Error(`Google Tasks の取得に失敗しました: ${err.message}`, { cause: err });
  }
}

/**
 * nextPageToken を使ってタスクを全ページ取得するヘルパー
 *
 * @param {object} tasksApi - google.tasks インスタンス
 * @param {string} listId   - タスクリスト ID
 * @param {object} params   - tasks.list に渡すパラメータ
 * @returns {Promise<Array>}
 */
async function fetchAllPages(tasksApi, listId, params) {
  const allTasks = [];
  let pageToken;
  do {
    const res = await tasksApi.tasks.list({
      tasklist: listId,
      maxResults: 100,
      ...params,
      ...(pageToken && { pageToken }),
    });
    allTasks.push(...(res.data.items || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return allTasks;
}

if (process.argv[1] && process.argv[1].endsWith('fetchTasks.js')) {
  fetchTodayTasks().then(result => {
    console.log('✅ Google Tasks を取得しました:', JSON.stringify(result, null, 2));
  }).catch(console.error);
}
