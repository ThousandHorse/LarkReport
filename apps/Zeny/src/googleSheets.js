/**
 * googleSheets.js
 *
 * Google Sheets API の CRUD ラッパー。
 * Zeny データ（収支手動入力・futureExpenses）の保存・取得を担う。
 *
 * スプレッドシート構成:
 *   シート1「収支手動入力」: date | type | category | amount | method | comment | created_at
 *   シート2「futureExpenses」: label | year | month | amount | created_at
 *
 * 注意事項:
 *   GOOGLE_REFRESH_TOKEN は spreadsheets スコープを含む必要がある。
 *   ZENY_SPREADSHEET_ID は initSpreadsheet() を一度実行して取得し .env に設定する。
 */

import './env.js';
import { google } from 'googleapis';

/**
 * HTML 特殊文字をエスケープする（XSS 対策）
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// OAuth2 クライアントを生成する（fetchCalendar.js と同じパターン）
function createAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

/**
 * JST の現在日時を ISO 8601 形式で返す（例: 2026-05-06T23:00:00+09:00）
 * @returns {string}
 */
function nowJST() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T') + '+09:00';
}

// シート名の定数
const SHEET_MANUAL = '収支手動入力';
const SHEET_FUTURE = 'futureExpenses';

/**
 * 「Zeny Data」スプレッドシートを新規作成し、2つのシートを初期化する。
 * 初回のみ実行する。完了後に表示される Spreadsheet ID を ZENY_SPREADSHEET_ID に設定すること。
 *
 * @returns {Promise<string>} 作成したスプレッドシートの ID
 */
export async function initSpreadsheet() {
  const sheets = google.sheets({ version: 'v4', auth: createAuth() });

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Zeny Data' },
      sheets: [
        {
          properties: { title: SHEET_MANUAL },
          data: [{
            startRow: 0,
            startColumn: 0,
            rowData: [{
              values: ['date', 'type', 'category', 'amount', 'method', 'comment', 'created_at']
                .map(v => ({ userEnteredValue: { stringValue: v } })),
            }],
          }],
        },
        {
          properties: { title: SHEET_FUTURE },
          data: [{
            startRow: 0,
            startColumn: 0,
            rowData: [{
              values: ['label', 'year', 'month', 'amount', 'created_at']
                .map(v => ({ userEnteredValue: { stringValue: v } })),
            }],
          }],
        },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId;
  console.log(`✅ スプレッドシートを作成しました`);
  console.log(`   Spreadsheet ID: ${spreadsheetId}`);
  console.log(`   URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
  console.log(`   → .env の ZENY_SPREADSHEET_ID に上記 ID を設定してください`);
  return spreadsheetId;
}

/**
 * 収支の手動入力を「収支手動入力」シートに追記する。
 *
 * @param {{ date: string, type: 'payment'|'income', category: string, amount: number, method: string, comment?: string }} entry
 * @returns {Promise<void>}
 */
export async function appendManualEntry(entry) {
  const spreadsheetId = process.env.ZENY_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('環境変数 ZENY_SPREADSHEET_ID が設定されていません');

  const sheets = google.sheets({ version: 'v4', auth: createAuth() });
  const { date, type, category, amount, method, comment = '' } = entry;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_MANUAL}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[date, type, category, String(amount), method, comment, nowJST()]],
    },
  });
}

/**
 * 今後の支出予定を「futureExpenses」シートに追記する。
 *
 * @param {{ label: string, year: number, month: number, amount: number }} item
 * @returns {Promise<void>}
 */
export async function appendFutureExpense(item) {
  const spreadsheetId = process.env.ZENY_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('環境変数 ZENY_SPREADSHEET_ID が設定されていません');

  const sheets = google.sheets({ version: 'v4', auth: createAuth() });
  const { label, year, month, amount } = item;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_FUTURE}!A:E`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[label, String(year), String(month), String(amount), nowJST()]],
    },
  });
}

/**
 * 「futureExpenses」シートから全行を取得して配列で返す。
 * generateMoneyHTML の opts.futureExpenses に渡す形式に変換する。
 *
 * @returns {Promise<Array<{ label: string, year: number, month: number, amount: number }>>}
 */
export async function fetchFutureExpenses() {
  const spreadsheetId = process.env.ZENY_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('環境変数 ZENY_SPREADSHEET_ID が設定されていません');

  const sheets = google.sheets({ version: 'v4', auth: createAuth() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    // 2行目以降（1行目はヘッダー）を取得
    range: `${SHEET_FUTURE}!A2:D`,
    // 書式付き数値（例: "20,000"）を避け、生の数値文字列を取得する
    valueRenderOption: 'UNFORMATTED_VALUE',
  });

  const rows = res.data.values ?? [];
  return (rows || [])
    .filter(row => row.length >= 4)
    .map(([label, year, month, amount]) => ({
      label:  escapeHtml(label),
      year:   Number(year),
      month:  Number(month),
      amount: Number(amount),
    }))
    .filter(item =>
      !Number.isNaN(item.year) &&
      !Number.isNaN(item.month) &&
      !Number.isNaN(item.amount)
    );
}

// 単体実行: node apps/Zeny/src/googleSheets.js
if (process.argv[1] && process.argv[1].endsWith('googleSheets.js')) {
  (async () => {
    // ZENY_SPREADSHEET_ID 未設定の場合は initSpreadsheet を実行
    if (!process.env.ZENY_SPREADSHEET_ID) {
      console.log('=== initSpreadsheet ===');
      await initSpreadsheet();
      console.log('\n⚠️ ZENY_SPREADSHEET_ID を .env に設定してから再実行してください');
      process.exit(0);
    }

    console.log('=== appendFutureExpense テスト ===');
    await appendFutureExpense({ label: '🦷 歯医者（テスト）', year: 2026, month: 6, amount: 20000 });
    console.log('✅ futureExpenses に追記しました');

    console.log('\n=== fetchFutureExpenses テスト ===');
    const items = await fetchFutureExpenses();
    console.log('取得結果:', JSON.stringify(items, null, 2));

    console.log('\n=== appendManualEntry テスト ===');
    await appendManualEntry({
      date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
      type: 'payment',
      category: '食費',
      amount: 1200,
      method: 'PayPayカード',
      comment: 'テスト用データ',
    });
    console.log('✅ 収支手動入力に追記しました');
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
