import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('環境変数 GEMINI_API_KEY が設定されていません');
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * 朝レポート用の AI コメントを生成する
 *
 * @param {Array<{title: string}>} tasks - 今日のタスク一覧
 * @returns {Promise<string>} AI が生成したコメント文
 */
export async function generateMorningComment(tasks) {
  const taskList = tasks.map(t => `・${t.title}`).join('\n');

  const prompt = `以下は今日のタスク一覧です。
励みになる朝のコメントを日本語で2〜3文で生成してください。
タスクの優先順位や進め方のアドバイスも含めてください。

${taskList}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    throw new Error('朝コメントの生成に失敗しました: ' + err.message, { cause: err });
  }
}

/**
 * 夜レポート用の AI コメントを生成する
 *
 * @param {Array<{title: string, completed: boolean}>} tasks - タスクと完了状態
 * @param {number} progressRate - 進捗率（0〜100）
 * @returns {Promise<string>} AI が生成したコメント文
 */
export async function generateEveningComment(tasks, progressRate) {
  const taskList = tasks
    .map(t => `${t.completed ? '✅' : '⬜'} ${t.title}`)
    .join('\n');

  const prompt = `今日の作業結果です。進捗率は ${progressRate}% です。
振り返りと明日への前向きなアドバイスを日本語で2〜3文で生成してください。

${taskList}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    throw new Error('夜コメントの生成に失敗しました: ' + err.message, { cause: err });
  }
}

// 単体実行テスト用（node src/summarize.js で動作確認）
if (process.argv[1] && process.argv[1].endsWith('summarize.js')) {
  const testTasks = [
    { title: 'プロジェクト設計書のレビュー', completed: false },
    { title: 'API 接続テストの実装',         completed: true  },
    { title: 'Slack 通知の動作確認',          completed: false },
  ];

  console.log('=== 朝コメント生成テスト ===');
  const morningComment = await generateMorningComment(testTasks);
  console.log('朝コメント:', morningComment);

  console.log('\n=== 夜コメント生成テスト ===');
  const eveningComment = await generateEveningComment(testTasks, 33);
  console.log('夜コメント:', eveningComment);
}
