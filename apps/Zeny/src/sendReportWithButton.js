/**
 * sendReportWithButton.js
 *
 * 収支レポート PNG をボタン付きメッセージとして Slack に送信する。
 * ボタンを押すと slackModal.js が収支入力モーダルを開く。
 *
 * ボタン一覧:
 *   「収支を入力」  → manual_entry  アクション → manualEntryView モーダル
 *   「支出予定を登録」→ future_expense アクション → futureExpenseView モーダル
 */

import './env.js';
import { WebClient } from '@slack/web-api';

/**
 * レポート PNG とボタンを Slack に送信する。
 *
 * @param {Buffer} imageBuffer        - PNG 画像のバイナリデータ
 * @param {string} dateLabel          - 日付ラベル（例: "2026/05/06（水）"）
 * @param {string} [mention='<!channel>'] - メンション文字列（不要な場合は '' を渡す）
 * @returns {Promise<void>}
 */
export async function sendReportWithButton(imageBuffer, dateLabel, mention = '<!channel>') {
  const token     = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error('環境変数 SLACK_BOT_TOKEN または SLACK_CHANNEL_ID が設定されていません');
  }

  const client = new WebClient(token);

  // 1. PNG をアップロード（ボタンなし）
  await client.filesUploadV2({
    channel_id: channelId,
    file: imageBuffer,
    filename: 'money-report.png',
    initial_comment: mention ? `${mention}\n💴 ${dateLabel} 収支レポートが届きました！` : `💴 ${dateLabel} 収支レポートが届きました！`,
  });

  // 2. メッセージ＋ボタンブロックを別メッセージで送信
  await client.chat.postMessage({
    channel: channelId,
    text: '本日の収支を入力しましょう！',
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '本日の収支を入力しましょう！' },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'open_manual_entry',
            text: { type: 'plain_text', text: '✏️ 収支を入力', emoji: true },
            style: 'primary',
          },
          {
            type: 'button',
            action_id: 'open_future_expense',
            text: { type: 'plain_text', text: '📅 支出予定を登録', emoji: true },
          },
        ],
      },
    ],
  });
}
