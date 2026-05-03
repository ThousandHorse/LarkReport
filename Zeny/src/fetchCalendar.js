import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const CATEGORY_RULES = [
  { category: 'engineer',     keywords: ['案件'],  label: '💻 エンジニア',  color: 'blue'   },
  { category: 'photographer', keywords: ['撮影'],  label: '📷 カメラマン',  color: 'purple' },
  { category: 'private',      keywords: [],        label: '🏖️ プライベート', color: 'gray'   },
];

function classifyEvent(title) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.length > 0 && rule.keywords.some(kw => title.includes(kw))) {
      return rule;
    }
  }
  return CATEGORY_RULES.find(r => r.category === 'private');
}

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

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const items = res.data.items || [];

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

if (process.argv[1] && process.argv[1].endsWith('fetchCalendar.js')) {
  fetchCalendarEvents()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => { console.error(err); process.exit(1); });
}
