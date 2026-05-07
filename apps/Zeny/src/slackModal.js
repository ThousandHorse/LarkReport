/**
 * slackModal.js
 *
 * Slack Bolt（Socket Mode）アプリ本体。
 * /zeny スラッシュコマンドとボタンアクションでモーダルを開き、
 * 送信されたデータを Google Sheets と Zaim に保存する。
 *
 * モーダル遷移フロー:
 *   /zeny or ボタン「収支を入力」
 *     → typeSelectView（種別選択: 支出/収入）
 *     → 支出: paymentEntryView / 収入: incomeEntryView
 *     → 保存（Sheets + Zaim）
 *
 * 起動方法:
 *   node apps/Zeny/src/slackModal.js  または  npm run zeny-modal
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
import { typeSelectView, paymentEntryView, incomeEntryView, futureExpenseView } from './modalViews.js';

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
// スラッシュコマンド: /zeny → 種別選択モーダル
// ─────────────────────────────────────────
app.command('/zeny', async ({ ack, body, client, logger }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: typeSelectView(),
    });
  } catch (err) {
    logger.error('/zeny コマンドエラー:', err);
  }
});

// ─────────────────────────────────────────
// ボタンアクション: 収支を入力 → 種別選択モーダル
// ─────────────────────────────────────────
app.action('open_manual_entry', async ({ ack, body, client, logger }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: typeSelectView(),
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
// モーダル送信: 種別選択 → 支出/収入モーダルに遷移
// ─────────────────────────────────────────
app.view('type_select_submit', async ({ ack, view, client, logger }) => {
  const type = view.state.values.type_block.type.selected_option.value;
  const nextView = type === 'payment' ? paymentEntryView() : incomeEntryView();

  // ack に view を渡すことでモーダルを次の画面に更新する（push ではなく update で履歴を残さない）
  await ack({ response_action: 'update', view: nextView });
});

// ─────────────────────────────────────────
// モーダル送信: 支出/収入入力 → Sheets + Zaim に保存
// ─────────────────────────────────────────
app.view('manual_entry_submit', async ({ ack, view, logger }) => {
  await ack();

  const v    = view.state.values;
  const type = view.private_metadata; // 'payment' | 'income'

  const entry = {
    date:     v.date_block.date.selected_date,
    type,
    category: v.category_block.category.selected_option.value,
    amount:   Number(v.amount_block.amount.value),
    method:   type === 'payment'
      ? v.method_block.method.selected_option.value
      : '（収入）',
    comment:  v.comment_block?.comment?.value ?? '',
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
    const postZaim = type === 'payment' ? postZaimPayment : postZaimIncome;
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
// TODO: Railway / Render 等のクラウドサービスへのデプロイ対応（PR-17E）
//   現状はローカルマシンで `npm run zeny-modal` を常時起動する運用。
//   スマホからも常時利用できるよう、Railway または Render にデプロイして
//   プロセスを常駐させる。必要な対応:
//     1. Railway/Render のプロジェクト作成・環境変数設定
//     2. Procfile または start スクリプトの追加
//     3. GitHub リポジトリと連携して自動デプロイ設定
(async () => {
  await app.start();
  console.log('✅ Zeny Slack モーダルアプリが起動しました（Socket Mode）');
})();
