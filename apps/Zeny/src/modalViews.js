/**
 * modalViews.js
 *
 * Slack Block Kit モーダルの View 定義。
 * slackModal.js から呼び出してモーダルを開く際に使用する。
 *
 * モーダル一覧:
 *   typeSelectView()      — 種別選択モーダル（支出 or 収入）
 *   paymentEntryView()    — 支出入力モーダル（カテゴリ: 支出のみ）
 *   incomeEntryView()     — 収入入力モーダル（カテゴリ: 収入のみ、支払方法なし）
 *   futureExpenseView()   — 支出予定登録モーダル
 */

// 支払方法の選択肢（支出のみ）
const METHOD_OPTIONS = [
  { text: { type: 'plain_text', text: '現金'           }, value: '現金'           },
  { text: { type: 'plain_text', text: 'Amazon Master カード' }, value: 'Amazon Master カード' },
  { text: { type: 'plain_text', text: 'PayPayカード'   }, value: 'PayPayカード'   },
  { text: { type: 'plain_text', text: 'JCBカード'      }, value: 'JCBカード'      },
  { text: { type: 'plain_text', text: '東急カード'     }, value: '東急カード'     },
  { text: { type: 'plain_text', text: '交通系ICカード' }, value: '交通系ICカード' },
];

// 支出カテゴリ（Zaim のカテゴリ名に合わせる）
const PAYMENT_CATEGORY_OPTIONS = [
  { text: { type: 'plain_text', text: '食費'       }, value: '食費'       },
  { text: { type: 'plain_text', text: '日用雑貨'   }, value: '日用雑貨'   },
  { text: { type: 'plain_text', text: '交通'       }, value: '交通'       },
  { text: { type: 'plain_text', text: '交際費'     }, value: '交際費'     },
  { text: { type: 'plain_text', text: 'エンタメ'   }, value: 'エンタメ'   },
  { text: { type: 'plain_text', text: '衣服・美容' }, value: '衣服・美容' },
  { text: { type: 'plain_text', text: '健康・医療' }, value: '健康・医療' },
  { text: { type: 'plain_text', text: '住宅'       }, value: '住宅'       },
  { text: { type: 'plain_text', text: 'その他'     }, value: 'その他'     },
];

// 収入カテゴリ（Zaim のカテゴリ名に合わせる）
const INCOME_CATEGORY_OPTIONS = [
  { text: { type: 'plain_text', text: '給与所得'   }, value: '給与所得'   },
  { text: { type: 'plain_text', text: '賞与'       }, value: '賞与'       },
  { text: { type: 'plain_text', text: '事業所得'   }, value: '事業所得'   },
  { text: { type: 'plain_text', text: '臨時収入'   }, value: '臨時収入'   },
  { text: { type: 'plain_text', text: '立替金返済' }, value: '立替金返済' },
];

/**
 * 種別選択モーダルの View を返す。
 * 支出 or 収入を選ぶと専用モーダルに遷移する。
 *
 * @returns {Object} Block Kit View オブジェクト
 */
export function typeSelectView() {
  return {
    type: 'modal',
    callback_id: 'type_select_submit',
    title: { type: 'plain_text', text: '収支を手動入力' },
    submit: { type: 'plain_text', text: '次へ' },
    close:  { type: 'plain_text', text: 'キャンセル' },
    blocks: [
      {
        type: 'input',
        block_id: 'type_block',
        label: { type: 'plain_text', text: '種別を選択してください' },
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
    ],
  };
}

/**
 * 支出入力モーダルの View を返す。
 * カテゴリは支出カテゴリのみ表示。支払方法あり。
 *
 * @returns {Object} Block Kit View オブジェクト
 */
export function paymentEntryView() {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  return {
    type: 'modal',
    callback_id: 'manual_entry_submit',
    title: { type: 'plain_text', text: '💸 支出を入力' },
    submit: { type: 'plain_text', text: '保存' },
    close:  { type: 'plain_text', text: 'キャンセル' },
    private_metadata: 'payment',
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
        block_id: 'category_block',
        label: { type: 'plain_text', text: 'カテゴリ' },
        element: {
          type: 'static_select',
          action_id: 'category',
          placeholder: { type: 'plain_text', text: 'カテゴリを選択' },
          options: PAYMENT_CATEGORY_OPTIONS,
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
          type: 'static_select',
          action_id: 'method',
          placeholder: { type: 'plain_text', text: '選択してください' },
          options: METHOD_OPTIONS,
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
 * 収入入力モーダルの View を返す。
 * カテゴリは収入カテゴリのみ表示。支払方法なし。
 *
 * @returns {Object} Block Kit View オブジェクト
 */
export function incomeEntryView() {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  return {
    type: 'modal',
    callback_id: 'manual_entry_submit',
    title: { type: 'plain_text', text: '💰 収入を入力' },
    submit: { type: 'plain_text', text: '保存' },
    close:  { type: 'plain_text', text: 'キャンセル' },
    private_metadata: 'income',
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
        block_id: 'category_block',
        label: { type: 'plain_text', text: 'カテゴリ' },
        element: {
          type: 'static_select',
          action_id: 'category',
          placeholder: { type: 'plain_text', text: 'カテゴリを選択' },
          options: INCOME_CATEGORY_OPTIONS,
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
          placeholder: { type: 'plain_text', text: '例: 350000' },
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
          placeholder: { type: 'plain_text', text: '例: 5月分給与' },
        },
      },
    ],
  };
}

/**
 * 支出予定登録モーダルの View を返す。
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
