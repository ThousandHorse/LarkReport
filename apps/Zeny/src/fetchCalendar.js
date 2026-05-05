/**
 * fetchCalendar.js
 *
 * Google Calendar API からその日（JST）のイベントを取得し、
 * タイトルのキーワードでカテゴリ分類・作業時間を集計して返す。
 *
 * 戻り値:
 *   {
 *     events:  [{ title, category, label, startTime, endTime, durationMinutes }]
 *     summary: { engineer, photographer, private, totalWorkMinutes }
 *   }
 *
 * カテゴリ判定: CATEGORY_RULES のキーワードに前方一致するものを適用。
 *              どのキーワードにも一致しない場合は private に分類。
 * 注意: GOOGLE_REFRESH_TOKEN は calendar.readonly スコープで取得したものを使用すること。
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

// Google Calendar API の OAuth2 認証
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

// カテゴリ判定ルール: keywords のいずれかがタイトルに含まれれば該当カテゴリに分類
// keywords が空配列の場合はフォールバック（最後に定義すること）
const CATEGORY_RULES = [
  { category: 'engineer',     keywords: ['案件'],  label: '💻 エンジニア',  color: 'blue'   },
  { category: 'photographer', keywords: ['撮影'],  label: '📷 カメラマン',  color: 'purple' },
  { category: 'private',      keywords: [],        label: '🏖️ プライベート', color: 'gray'   },
];

// イベントタイトルからカテゴリを判定する
function classifyEvent(title) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.length > 0 && rule.keywords.some(kw => title.includes(kw))) {
      return rule;
    }
  }
  return CATEGORY_RULES.find(r => r.category === 'private');
}

/**
 * 指定日（JST）のカレンダーイベントを取得してカテゴリ集計する。
 * @param {Date} targetDate - 対象日（デフォルト: 今日）
 */
export async function fetchCalendarEvents(targetDate = new Date()) {
  // JST (UTC+9) で 0:00〜23:59 を計算する
  // GitHub Actions は UTC 環境のため setHours() では 9 時間ズレが生じる
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  const dateStr = new Date(targetDate.getTime() + JST_OFFSET)
    .toISOString()
    .slice(0, 10); // "YYYY-MM-DD"
  const startOfDay = new Date(`${dateStr}T00:00:00+09:00`);
  const endOfDay   = new Date(`${dateStr}T23:59:59+09:00`);

  const calendar = google.calendar({ version: 'v3', auth });

  // 当日の全イベントを開始時刻順で取得（終日イベントは dateTime がないため後段で除外）
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const items = res.data.items || [];

  // 終日イベント（start.dateTime がない）を除外してカテゴリ分類・所要時間を計算
  const events = items
    .filter(item => item.start?.dateTime && item.end?.dateTime)
    .map(item => {
      const title = item.summary || '（無題）';
      const rule = classifyEvent(title);
      const startTime = item.start.dateTime;
      const endTime = item.end.dateTime;
      const durationMinutes = Math.round(
        (new Date(endTime) - new Date(startTime)) / 60000
      );
      return {
        title,
        category: rule.category,
        label: rule.label,
        startTime,
        endTime,
        durationMinutes,
      };
    });

  // CATEGORY_RULES から動的に集計オブジェクトを生成（カテゴリ追加時にここを修正不要）
  const summary = Object.fromEntries(
    CATEGORY_RULES.map(r => [r.category, 0])
  );
  summary.totalWorkMinutes = 0;

  for (const ev of events) {
    if (ev.category in summary) {
      summary[ev.category] += ev.durationMinutes;
    }
  }
  // private 以外のカテゴリ（就労時間）を合算
  summary.totalWorkMinutes = CATEGORY_RULES
    .filter(r => r.category !== 'private')
    .reduce((acc, r) => acc + summary[r.category], 0);

  return { events, summary };
}

// 単体実行: node src/fetchCalendar.js
// → 今日のカレンダーイベントと集計結果を JSON で出力
if (process.argv[1] && process.argv[1].endsWith('fetchCalendar.js')) {
  fetchCalendarEvents()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => { console.error(err); process.exit(1); });
}
