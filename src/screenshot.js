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

// 単体実行テスト用（node src/screenshot.js で動作確認）
if (process.argv[1] && process.argv[1].endsWith('screenshot.js')) {
  const testHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="p-8 bg-blue-50"><h1 class="text-2xl font-bold text-blue-800">スクショテスト</h1></body></html>`;
  import('fs').then(({ writeFileSync }) => {
    htmlToPng(testHtml).then(buf => {
      writeFileSync('test-screenshot.png', buf);
      console.log('✅ test-screenshot.png を生成しました');
    }).catch(console.error);
  });
}
