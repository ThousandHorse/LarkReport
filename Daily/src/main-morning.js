import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
import { fetchTodayTasks } from './fetchTasks.js';
import { generateMorningComment } from './summarize.js';
import { generateMorningHTML } from './generateHTML.js';
import { htmlToPng } from '../../shared/screenshot.js';
import { sendToSlack } from '../../shared/sendSlack.js';

/**
 * 朝レポートを生成して Slack に送信する
 */
async function runMorningReport() {
  // 1. Google Tasks からタスクを取得
  const { incomplete, overdue, completedCount, overdueCount } = await fetchTodayTasks();

  // 2. 日付文字列を生成（JST 固定・CI 等 UTC 環境でも正しい日付になる）
  //    例: 2026/04/30（木）
  const _now = new Date();
  const _datePart = _now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' });
  const _weekday  = _now.toLocaleDateString('ja-JP', { weekday: 'narrow', timeZone: 'Asia/Tokyo' });
  const date = `${_datePart}（${_weekday}）`;

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
