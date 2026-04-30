import dotenv from 'dotenv';
import { WebClient } from '@slack/web-api';
dotenv.config();

/**
 * Slack に PNG 画像をアップロードしてチャンネルに投稿する
 *
 * @param {Buffer} imageBuffer - PNG 画像のバイナリデータ
 * @param {string} filename    - ファイル名（例: morning-report.png）
 * @param {string} message     - 画像に添えるテキストメッセージ
 */
export async function sendToSlack(imageBuffer, filename, message) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error('環境変数 SLACK_BOT_TOKEN または SLACK_CHANNEL_ID が設定されていません');
  }

  const client = new WebClient(token);

  await client.filesUploadV2({
    channel_id: channelId,
    file: imageBuffer,
    filename,
    initial_comment: `<!channel>\n${message}`,
  });

  console.log('✅ Slack に PNG レポートを送信しました');
}
