import './env.js';
import { fetchTodayTasks } from './fetchTasks.js';
import { generateEveningComment } from './summarize.js';
import { generateEveningHTML } from './generateHTML.js';
import { htmlToPng } from '../../shared/screenshot.js';
import { sendToSlack } from '../../shared/sendSlack.js';

/**
 * 夜レポートを生成して Slack に送信する
 */
async function runEveningReport() {
  // 1. Google Tasks からタスクを取得
  const { completed, incomplete, overdue, progressRate } = await fetchTodayTasks();

  // 2. 日付文字列を生成（JST 固定・CI 等 UTC 環境でも正しい日付になる）
  //    例: 2026/04/30（木）
  const _now = new Date();
  const _datePart = _now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' });
  const _weekday  = _now.toLocaleDateString('ja-JP', { weekday: 'narrow', timeZone: 'Asia/Tokyo' });
  const date = `${_datePart}（${_weekday}）`;

  // 3. Gemini API で夜コメントを生成（完了＋未完了タスクを渡して実態に即した振り返りにする）
  //    タスクが空の場合は Gemini を呼ばず空文字を渡す（HTML 側でフォールバックメッセージを表示）
  let aiComment = '';
  const allTasks = [...completed, ...incomplete, ...overdue];
  if (allTasks.length > 0) {
    try {
      aiComment = await generateEveningComment(allTasks, progressRate);
    } catch (err) {
      throw new Error(`夜コメントの生成に失敗しました: ${err.message}`, { cause: err });
    }
  }

  // 4. HTML を生成
  const html = generateEveningHTML({
    date,
    completed,
    incomplete,
    overdueTasks: overdue,
    progressRate,
    aiComment,
  });

  // 5. HTML → PNG に変換
  const png = await htmlToPng(html);

  // 6. Slack に送信
  await sendToSlack(png, 'evening-report.png', `🌙 ${date} 夜のレポートが届きました！`);

  console.log('✅ 夜レポートを Slack に送信しました');
}

runEveningReport().catch(err => {
  console.error(err);
  process.exit(1);
});
