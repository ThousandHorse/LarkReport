/**
 * main-money.js
 *
 * Zeny の日次収支レポートを生成して Slack に送信するメインスクリプト。
 * fetchZaimEntries → AI アドバイス生成 → generateMoneyHTML → htmlToPng → sendToSlack の順に実行する。
 *
 * 注意事項:
 *   opts.futureExpenses / monthlyExpenses は将来的に Google Sheets 等から取得する想定のため、
 *   現時点では空配列・0 を渡す。
 */

import './env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchZaimEntries } from './fetchZaim.js';
import { generateMoneyHTML } from './generateMoneyHTML.js';
import { htmlToPng } from '../../../shared/screenshot.js';
import { sendToSlack } from '../../../shared/sendSlack.js';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('環境変数 GEMINI_API_KEY が設定されていません');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 503（高負荷）のときだけ次のモデルへフォールバックする優先順位
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

/**
 * AI 生成テキストのマークダウン記号を除去してプレーンテキストに整形する。
 * @param {string} text
 * @returns {string}
 */
function sanitizeText(text) {
  return text
    .replace(/\\n/g, '\n')
    .replace(/^\s*[*\-]{3,}\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * フォールバック付きでテキストを生成する。
 * 503 Service Unavailable の場合のみ次のモデルを試す。
 *
 * @param {string} prompt
 * @param {string} label - エラーメッセージ用ラベル
 * @returns {Promise<string>}
 */
async function generateWithFallback(prompt, label) {
  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const modelName = FALLBACK_MODELS[i];
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      if (i > 0) {
        console.warn(`[main-money] ${modelName} で生成しました（フォールバック ${i}）`);
      }
      return sanitizeText(result.response.text());
    } catch (err) {
      const is503 = err.status === 503 || err.message?.includes('503');
      if (is503 && i < FALLBACK_MODELS.length - 1) {
        console.warn(`[main-money] ${modelName} が高負荷（503）のため ${FALLBACK_MODELS[i + 1]} にフォールバックします`);
        continue;
      }
      throw new Error(`${label}の生成に失敗しました: ${err.message}`, { cause: err });
    }
  }
}

/**
 * 収支データを元に AI アドバイスを生成する。
 *
 * @param {{ totalPayment: number, totalIncome: number, balance: number }} summary
 * @returns {Promise<string>}
 */
async function generateMoneyAdvice(summary) {
  const { totalPayment, totalIncome, balance } = summary;
  const balanceSign = balance >= 0 ? '+' : '';
  const prompt = `以下は本日の収支データです。節約や家計管理のアドバイスを日本語で2〜3文で生成してください。
支出合計: ¥${totalPayment.toLocaleString('ja-JP')} / 収入合計: ¥${totalIncome.toLocaleString('ja-JP')} / 差引: ${balanceSign}¥${balance.toLocaleString('ja-JP')}
マークダウン記法や記号（*, **, #, ---, ***など）は使わず、プレーンテキストで書いてください。`;

  return generateWithFallback(prompt, 'AIアドバイス');
}

/**
 * 収支レポートを生成して Slack に送信する。
 */
async function runMoneyReport() {
  const targetDate = new Date();

  // 1. Zaim から収支データを取得
  const zaimResult = await fetchZaimEntries(targetDate);

  // 2. AI アドバイスを生成（収支データがある場合のみ Gemini を呼ぶ）
  let aiAdvice = '本日の収支データを集計しました。';
  const { payments, incomes, summary } = zaimResult;
  if (payments.length > 0 || incomes.length > 0) {
    try {
      aiAdvice = await generateMoneyAdvice(summary);
    } catch (err) {
      throw new Error(`AIアドバイスの生成に失敗しました: ${err.message}`, { cause: err });
    }
  }

  // 3. HTML を生成
  const html = generateMoneyHTML(zaimResult, targetDate, {
    futureExpenses: [],
    monthlyExpenses: [],
    monthlyTotalIncome: 0,
    monthlyTotalExpense: 0,
    aiAdvice,
  });

  // 4. HTML → PNG に変換
  const png = await htmlToPng(html);

  // 5. JST 日付文字列を生成（例: 2026/05/06（水））
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const jstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(targetDate);
  const [jy, jmo, jd] = jstStr.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(`${jstStr}T12:00:00+09:00`).getDay()];
  const date = `${jy}/${String(jmo).padStart(2, '0')}/${String(jd).padStart(2, '0')}（${weekday}）`;

  // 6. Slack に送信
  await sendToSlack(png, 'money-report.png', `💴 ${date} 収支レポートが届きました！`);

  console.log('✅ 収支レポートを Slack に送信しました');
}

if (process.argv[1] && process.argv[1].endsWith('main-money.js')) {
  runMoneyReport().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
