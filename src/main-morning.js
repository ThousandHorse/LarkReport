import dotenv from 'dotenv';
dotenv.config();
import { fetchTodayTasks } from './fetchTasks.js';
import { generateMorningComment } from './summarize.js';
import { generateMorningHTML } from './generateHTML.js';
import { htmlToPng } from './screenshot.js';
import { sendToSlack } from './sendSlack.js';

/**
 * 朝レポートを生成して Slack に送信する
 */
async function runMorningReport() {
  // 1. Google Tasks からタスクを取得
  const { incomplete, overdue, completedCount, overdueCount } = await fetchTodayTasks();

  // 2. 日付文字列を生成（JST）
  const date = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 3. Gemini API で朝コメントを生成（今日の未完了タスクを渡す）
  const aiComment = await generateMorningComment(incomplete);

  // 4. HTML を生成
  const html = generateMorningHTML({
    date,
    tasks: incomplete,
    overdueTasks: overdue,
    completedCount,
    overdueCount,
    aiComment,
  });

  // 5. HTML → PNG に変換
  const png = await htmlToPng(html);

  // 6. Slack に送信
  await sendToSlack(png, 'morning-report.png', `🌅 ${date} 朝のレポートが届きました！`);

  console.log('✅ 朝レポートを Slack に送信しました');
}

runMorningReport().catch(err => {
  console.error(err);
  process.exit(1);
});
