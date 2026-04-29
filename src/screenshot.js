import { chromium } from '@playwright/test';

/**
 * HTML 文字列を Playwright でレンダリングして PNG 画像のバイナリデータを返す
 *
 * @param {string} html - レンダリングする HTML 文字列
 * @returns {Buffer} PNG 画像のバイナリデータ
 */
export async function htmlToPng(html) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    // 幅 800px・高さは仮値で初期化（後でコンテンツ高さに合わせる）
    await page.setViewportSize({ width: 800, height: 600 });

    // HTML 文字列を直接ページにセットする
    // waitUntil: 'networkidle' = Tailwind CDN など全リソースの読み込み完了まで待つ
    await page.setContent(html, { waitUntil: 'networkidle' });

    // レンダリング後のコンテンツ実寸を取得してビューポートを合わせる
    // これにより PNG の高さがカードサイズにぴったり一致する
    const contentHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
    await page.setViewportSize({ width: 800, height: contentHeight });

    return await page.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}

// PNG バッファの高さを読み取る（PNG ヘッダの固定オフセット）
function pngHeight(buf) {
  return buf.readUInt32BE(20);
}

// 単体実行テスト用（node src/screenshot.js で動作確認）
if (process.argv[1] && process.argv[1].endsWith('screenshot.js')) {
  (async () => {
    const { writeFileSync } = await import('fs');
    const { generateMorningHTML } = await import('./generateHTML.js');

    const base = {
      date: '2026年4月29日（水）',
      tasks: [{ title: 'API 接続テストの実装' }, { title: 'Slack 通知の動作確認' }],
      overdueTasks: [{ title: 'プロジェクト設計書のレビュー', overdueDays: 2 }],
      completedCount: 1,
      overdueCount: 1,
    };

    const cases = [
      {
        label: '2行',
        file: 'test-screenshot-2lines.png',
        aiComment: 'おはようございます！今日も充実した一日にしましょう。\nまずは期限切れのタスクから片付けましょう。',
      },
      {
        label: '5行',
        file: 'test-screenshot-5lines.png',
        aiComment: [
          'おはようございます！今日も充実した一日にしましょう。',
          'まずは期限切れになっている設計書のレビューから着手することをお勧めします。',
          '全体像を把握してから実装に進むとスムーズです。',
          'API 接続テストも重要なので午後に時間を確保してください。',
          'Slack 通知の確認は最後に行うと効率的です。',
        ].join('\n'),
      },
      {
        label: '10行',
        file: 'test-screenshot-10lines.png',
        aiComment: [
          'おはようございます！今日も充実した一日にしましょう。',
          'まずは期限切れになっている設計書のレビューから着手することをお勧めします。',
          '全体像を把握することで、実装フェーズがスムーズに進みます。',
          '設計書に不明点があれば早めに確認を取りましょう。',
          'API 接続テストは実装の中核となる重要なタスクです。',
          'テスト駆動で進めることで品質が高まります。',
          'エラーハンドリングも忘れずに実装してください。',
          'Slack 通知の動作確認は最後のステップとして位置づけましょう。',
          '今日中に完了できるよう、集中して取り組みましょう。',
          '充実した一日になることを願っています！',
        ].join('\n'),
      },
    ];

    console.log('--- 動的高さ確認テスト ---');
    for (const c of cases) {
      const html = generateMorningHTML({ ...base, aiComment: c.aiComment });
      const buf = await htmlToPng(html);
      writeFileSync(c.file, buf);
      console.log(`✅ ${c.file} (aiComment ${c.label}) → 高さ: ${pngHeight(buf)}px`);
    }
    console.log('すべて異なる高さで生成されていれば動的高さ対応OK');
  })().catch(console.error);
}
