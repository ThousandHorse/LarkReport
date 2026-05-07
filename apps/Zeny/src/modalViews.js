/**
 * modalViews.js
 *
 * Slack Block Kit モーダルの View 定義。
 * slackModal.js から呼び出してモーダルを開く際に使用する。
 *
 * モーダル一覧:
 *   manualEntryView()   — 収支手動入力モーダル
 *   futureExpenseView() — 支出予定登録モーダル
 */

/**
 * 収支手動入力モーダルの View を返す。
 *
 * フィールド:
 *   date     - 日付（DatePicker）
 *   type     - 種別（支出/収入）
 *   category - カテゴリ（テキスト入力）
 *   amount   - 金額（数値入力）
 *   method   - 支払方法（テキスト入力）
 *   comment  - メモ（任意）
 *
 * @returns {Object} Block Kit View オブジェクト
 */
export function manualEntryView() {
  // JST の今日の日付を YYYY-MM-DD 形式で取得
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  return {
    type: 'modal',
    callback_id: 'manual_entry_submit',
    title: { type: 'plain_text', text: '収支を手動入力' },
    submit: { type: 'plain_text', text: '保存' },
    close:  { type: 'plain_text', text: 'キャンセル' },
    blocks: [
      {
        type: 'input',
        block_id: 'date_block',
        label: { type: 'plain_text', text: '日付' },
        element: {
          type: 'datepicker',
          action_id: 'date',
          initial_date: today,
        },
      },
      {
        type: 'input',
        block_id: 'type_block',
        label: { type: 'plain_text', text: '種別' },
        element: {
          type: 'static_select',
          action_id: 'type',
          placeholder: { type: 'plain_text', text: '選択してください' },
          options: [
            { text: { type: 'plain_text', text: '💸 支出' }, value: 'payment' },
            { text: { type: 'plain_text', text: '💰 収入' }, value: 'income'  },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'category_block',
        label: { type: 'plain_text', text: 'カテゴリ' },
        element: {
          type: 'static_select',
          action_id: 'category',
          placeholder: { type: 'plain_text', text: 'カテゴリを選択' },
          option_groups: [
            {
              label: { type: 'plain_text', text: '💸 支出' },
              options: [
                { text: { type: 'plain_text', text: '食費'       }, value: '食費'       },
                { text: { type: 'plain_text', text: '日用雑貨'   }, value: '日用雑貨'   },
                { text: { type: 'plain_text', text: '交通'       }, value: '交通'       },
                { text: { type: 'plain_text', text: '交際費'     }, value: '交際費'     },
                { text: { type: 'plain_text', text: 'エンタメ'   }, value: 'エンタメ'   },
                { text: { type: 'plain_text', text: '衣服・美容' }, value: '衣服・美容' },
                { text: { type: 'plain_text', text: '健康・医療' }, value: '健康・医療' },
                { text: { type: 'plain_text', text: '住宅'       }, value: '住宅'       },
                { text: { type: 'plain_text', text: 'その他'     }, value: 'その他'     },
              ],
            },
            {
              label: { type: 'plain_text', text: '💰 収入' },
              options: [
                { text: { type: 'plain_text', text: '給与所得'   }, value: '給与所得'   },
                { text: { type: 'plain_text', text: '賞与'       }, value: '賞与'       },
                { text: { type: 'plain_text', text: '事業所得'   }, value: '事業所得'   },
                { text: { type: 'plain_text', text: '臨時収入'   }, value: '臨時収入'   },
                { text: { type: 'plain_text', text: '立替金返済' }, value: '立替金返済' },
              ],
            },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'amount_block',
        label: { type: 'plain_text', text: '金額（円）' },
        element: {
          type: 'number_input',
          action_id: 'amount',
          is_decimal_allowed: false,
          placeholder: { type: 'plain_text', text: '例: 1200' },
        },
      },
      {
        type: 'input',
        block_id: 'method_block',
        label: { type: 'plain_text', text: '支払方法' },
        element: {
          type: 'plain_text_input',
          action_id: 'method',
          placeholder: { type: 'plain_text', text: '例: PayPayカード、現金' },
        },
      },
      {
        type: 'input',
        block_id: 'comment_block',
        optional: true,
        label: { type: 'plain_text', text: 'メモ（任意）' },
        element: {
          type: 'plain_text_input',
          action_id: 'comment',
          placeholder: { type: 'plain_text', text: '例: ランチ代' },
        },
      },
    ],
  };
}

/**
 * 支出予定登録モーダルの View を返す。
 *
 * フィールド:
 *   label  - 項目名（テキスト入力）
 *   year   - 年（数値入力）
 *   month  - 月（数値入力）
 *   amount - 金額（数値入力）
 *
 * @returns {Object} Block Kit View オブジェクト
 */
export function futureExpenseView() {
  const now = new Date();
  const jstYear  = Number(new Intl.DateTimeFormat('en', { year:  'numeric', timeZone: 'Asia/Tokyo' }).format(now));
  const jstMonth = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Asia/Tokyo' }).format(now));

  return {
    type: 'modal',
    callback_id: 'future_expense_submit',
    title: { type: 'plain_text', text: '支出予定を登録' },
    submit: { type: 'plain_text', text: '保存' },
    close:  { type: 'plain_text', text: 'キャンセル' },
    blocks: [
      {
        type: 'input',
        block_id: 'label_block',
        label: { type: 'plain_text', text: '項目名' },
        element: {
          type: 'plain_text_input',
          action_id: 'label',
          placeholder: { type: 'plain_text', text: '例: 🦷 歯医者、🏠 引越し費用' },
        },
      },
      {
        type: 'input',
        block_id: 'year_block',
        label: { type: 'plain_text', text: '年' },
        element: {
          type: 'number_input',
          action_id: 'year',
          is_decimal_allowed: false,
          initial_value: String(jstYear),
        },
      },
      {
        type: 'input',
        block_id: 'month_block',
        label: { type: 'plain_text', text: '月' },
        element: {
          type: 'number_input',
          action_id: 'month',
          is_decimal_allowed: false,
          initial_value: String(jstMonth),
        },
      },
      {
        type: 'input',
        block_id: 'amount_block',
        label: { type: 'plain_text', text: '金額（円）' },
        element: {
          type: 'number_input',
          action_id: 'amount',
          is_decimal_allowed: false,
          placeholder: { type: 'plain_text', text: '例: 20000' },
        },
      },
    ],
  };
}
