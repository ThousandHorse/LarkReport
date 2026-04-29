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

  // 2. 日付文字列を生成（JST 固定・CI 等 UTC 環境でも正しい日付になる）
  const date = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Tokyo',
  });

  // 3. Gemini API で朝コメントを生成（未完了＋期限切れタスクを渡して実態に即したアドバイスにする）
  //    タスクが空の場合は Gemini を呼ばず空文字を渡す（HTML 側でフォールバックメッセージを表示）
  let aiComment = '';
  const allTasks = [...overdue, ...incomplete];
  if (allTasks.length > 0) {
    try {
      aiComment = await generateMorningComment(allTasks);
    } catch (err) {
      throw new Error(`朝コメントの生成に失敗しました: ${err.message}`, { cause: err });
    }
  }

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
