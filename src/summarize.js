import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('環境変数 GEMINI_API_KEY が設定されていません');
}
const genAI = new GoogleGenerativeAI(apiKey);

// 503（高負荷）のときだけ次のモデルへフォールバックする優先順位
// gemini-flash-latest は ListModels API で確認済みの有効エイリアス（最新 flash を自動追従）
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

/**
 * フォールバック付きでテキストを生成する
 * 503 Service Unavailable の場合のみ次のモデルを試す
 *
 * @param {string} prompt
 * @param {string} label - エラーメッセージ用ラベル（例: '朝コメント'）
 * @returns {Promise<string>}
 */
async function generateWithFallback(prompt, label) {
  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const modelName = FALLBACK_MODELS[i];
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      if (i > 0) {
        console.warn(`[summarize] ${modelName} で生成しました（フォールバック ${i}）`);
      }
      return result.response.text();
    } catch (err) {
      const is503 = err.status === 503 || err.message?.includes('503');
      if (is503 && i < FALLBACK_MODELS.length - 1) {
        console.warn(`[summarize] ${modelName} が高負荷（503）のため ${FALLBACK_MODELS[i + 1]} にフォールバックします`);
        continue;
      }
      throw new Error(`${label}の生成に失敗しました: ${err.message}`, { cause: err });
    }
  }
}

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

  return generateWithFallback(prompt, '朝コメント');
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

  return generateWithFallback(prompt, '夜コメント');
}

// 単体実行テスト用（node src/summarize.js で動作確認）
if (process.argv[1] && process.argv[1].endsWith('summarize.js')) {
  const testTasks = [
    { title: 'プロジェクト設計書のレビュー', completed: false },
    { title: 'API 接続テストの実装',         completed: true  },
    { title: 'Slack 通知の動作確認',          completed: false },
  ];

  (async () => {
    console.log('=== 朝コメント生成テスト ===');
    const morningComment = await generateMorningComment(testTasks);
    console.log('朝コメント:', morningComment);

    console.log('\n=== 夜コメント生成テスト ===');
    const eveningComment = await generateEveningComment(testTasks, 33);
    console.log('夜コメント:', eveningComment);
  })().catch(console.error);
}
