/**
 * slackModal.js
 *
 * Slack Bolt（Socket Mode）アプリ本体。
 * /zeny スラッシュコマンドとボタンアクションでモーダルを開き、
 * 送信されたデータを Google Sheets と Zaim に保存する。
 *
 * 起動方法:
 *   node apps/Zeny/src/slackModal.js
 *
 * 必要な環境変数:
 *   SLACK_BOT_TOKEN       — xoxb- で始まる Bot Token
 *   SLACK_APP_TOKEN       — xapp- で始まる App-Level Token（Socket Mode 用）
 *   SLACK_SIGNING_SECRET  — Slack App の Signing Secret
 *   ZENY_SPREADSHEET_ID   — Google Sheets のスプレッドシート ID
 */

import './env.js';
import { App } from '@slack/bolt';
import { appendManualEntry, appendFutureExpense } from './googleSheets.js';
import { postZaimPayment, postZaimIncome } from './postZaim.js';
import { manualEntryView, futureExpenseView } from './modalViews.js';

// 環境変数チェック
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
}

const app = new App({
  token:          process.env.SLACK_BOT_TOKEN,
  appToken:       process.env.SLACK_APP_TOKEN,
  signingSecret:  process.env.SLACK_SIGNING_SECRET,
  socketMode:     true,
});

// ─────────────────────────────────────────
// スラッシュコマンド: /zeny
// ─────────────────────────────────────────
app.command('/zeny', async ({ ack, body, client, logger }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: manualEntryView(),
    });
  } catch (err) {
    logger.error('/zeny コマンドエラー:', err);
  }
});

// ─────────────────────────────────────────
// ボタンアクション: 収支を入力
// ─────────────────────────────────────────
app.action('open_manual_entry', async ({ ack, body, client, logger }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: manualEntryView(),
    });
  } catch (err) {
    logger.error('open_manual_entry エラー:', err);
  }
});

// ─────────────────────────────────────────
// ボタンアクション: 支出予定を登録
// ─────────────────────────────────────────
app.action('open_future_expense', async ({ ack, body, client, logger }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: futureExpenseView(),
    });
  } catch (err) {
    logger.error('open_future_expense エラー:', err);
  }
});

// ─────────────────────────────────────────
// モーダル送信: 収支手動入力
// ─────────────────────────────────────────
app.view('manual_entry_submit', async ({ ack, view, logger }) => {
  await ack();

  const v = view.state.values;
  const entry = {
    date:     v.date_block.date.selected_date,
    type:     v.type_block.type.selected_option.value,
    category: v.category_block.category.selected_option.value,
    amount:   Number(v.amount_block.amount.value),
    method:   v.method_block.method.value,
    comment:  v.comment_block.comment.value ?? '',
  };

  // 1. Google Sheets に保存（確実に記録する）
  try {
    await appendManualEntry(entry);
  } catch (err) {
    logger.error('Sheets 保存エラー:', err);
    return; // Sheets が失敗した場合は Zaim も書かない（二重登録防止）
  }

  // 2. Zaim に書き込み（ベストエフォート: 失敗しても Sheets の記録は残る）
  // TODO: method（支払方法）→ Zaim の from_account_id へのマッピングは将来対応
  try {
    const postZaim = entry.type === 'payment' ? postZaimPayment : postZaimIncome;
    await postZaim({ ...entry, name: entry.category });
    logger.info(`✅ 収支を保存しました（Sheets + Zaim）: ${JSON.stringify(entry)}`);
  } catch (err) {
    logger.error('Zaim 書き込みエラー（Sheets への保存は完了済み）:', err);
  }
});

// ─────────────────────────────────────────
// モーダル送信: 支出予定登録
// ─────────────────────────────────────────
app.view('future_expense_submit', async ({ ack, view, logger }) => {
  await ack();

  const v = view.state.values;
  const item = {
    label:  v.label_block.label.value,
    year:   Number(v.year_block.year.value),
    month:  Number(v.month_block.month.value),
    amount: Number(v.amount_block.amount.value),
  };

  try {
    await appendFutureExpense(item);
    logger.info(`✅ 支出予定を保存しました: ${JSON.stringify(item)}`);
  } catch (err) {
    logger.error('支出予定保存エラー:', err);
  }
});

// ─────────────────────────────────────────
// アプリ起動
// ─────────────────────────────────────────
(async () => {
  await app.start();
  console.log('✅ Zeny Slack モーダルアプリが起動しました（Socket Mode）');
})();
