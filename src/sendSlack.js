import dotenv from 'dotenv';
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

  // Step 1: アップロード用 URL を取得する
  const urlRes = await fetch('https://slack.com/api/files.getUploadURLExternal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      length: imageBuffer.length,
    }),
  });

  const urlData = await urlRes.json();
  if (!urlData.ok) throw new Error(`Slack アップロード URL 取得失敗: ${urlData.error}`);
  const { upload_url, file_id } = urlData;

  // Step 2: 取得した URL に PNG バイナリを PUT でアップロードする
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: imageBuffer,
  });

  if (!uploadRes.ok) throw new Error(`PNG アップロード失敗: ${uploadRes.statusText}`);

  // Step 3: アップロード完了を通知してチャンネルに投稿する
  const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [{ id: file_id }],
      channel_id: channelId,
      initial_comment: message,
    }),
  });

  const completeData = await completeRes.json();
  if (!completeData.ok) throw new Error(`Slack 投稿失敗: ${completeData.error}`);

  console.log('✅ Slack に PNG レポートを送信しました');
}
