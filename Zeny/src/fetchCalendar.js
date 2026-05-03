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
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

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

  const summary = {
    engineer:     { totalMinutes: 0, label: '💻 エンジニア' },
    photographer: { totalMinutes: 0, label: '📷 カメラマン' },
    private:      { totalMinutes: 0, label: '🏖️ プライベート' },
    totalWorkMinutes: 0,
  };

  for (const ev of events) {
    if (summary[ev.category] !== undefined) {
      summary[ev.category].totalMinutes += ev.durationMinutes;
    }
  }
  summary.totalWorkMinutes =
    summary.engineer.totalMinutes + summary.photographer.totalMinutes;

  return { events, summary };
}

if (process.argv[1] && process.argv[1].endsWith('fetchCalendar.js')) {
  const result = await fetchCalendarEvents();
  console.log(JSON.stringify(result, null, 2));
}
