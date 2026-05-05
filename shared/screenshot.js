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
    // deviceScaleFactor: 2 = Retina 相当の解像度でレンダリング
    // レイアウトは 800px 固定のまま PNG の実ピクセルが 2 倍になり Slack で見やすくなる
    const context = await browser.newContext({ deviceScaleFactor: 2 });
    const page = await context.newPage();

    // 初期高さを十分大きく設定してスクロールバーの発生を防ぐ
    // スクロールバーが出るとコンテンツ幅が減り scrollHeight が不正確になるため
    await page.setViewportSize({ width: 800, height: 3000 });

    // HTML 文字列を直接ページにセットする
    // waitUntil: 'networkidle' = Tailwind CDN など全リソースの読み込み完了まで待つ
    await page.setContent(html, { waitUntil: 'networkidle' });

    // body の実寸を取得してビューポートを合わせる
    // documentElement.scrollHeight はビューポート高さに追従するため body を使用
    const contentHeight = await page.evaluate(
      () => document.body.scrollHeight
    );
    await page.setViewportSize({ width: 800, height: contentHeight });

    // ビューポート変更後に再度高さを確認（リサイズによる再レイアウトに対応）
    const finalHeight = await page.evaluate(
      () => document.body.scrollHeight
    );
    if (finalHeight !== contentHeight) {
      await page.setViewportSize({ width: 800, height: finalHeight });
    }

    return await page.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}

// PNG バッファの高さを読み取る（PNG ヘッダの固定オフセット）
function pngHeight(buf) {
  return buf.readUInt32BE(20);
}

// 単体実行テスト用（node shared/screenshot.js で動作確認）
// 出力先: test-output/png/ フォルダ（実行時の CWD 基準）
if (process.argv[1] && process.argv[1].endsWith('screenshot.js')) {
  (async () => {
    const { writeFileSync, mkdirSync } = await import('fs');

    // generateHTML.js には依存せずシンプルな mock HTML で動的高さのみ検証する
    const generateMorningHTML = (data) => `<html><body style="margin:0;font-family:sans-serif;width:800px"><h1>Morning</h1><p style="white-space:pre-wrap">${data.aiComment}</p></body></html>`;
    const generateEveningHTML = (data) => `<html><body style="margin:0;font-family:sans-serif;width:800px"><h1>Evening</h1><p style="white-space:pre-wrap">${data.aiComment}</p></body></html>`;

    mkdirSync('test-output/png', { recursive: true });

    const comments2  = 'テスト行1\nテスト行2';
    const comments5  = Array.from({ length: 5  }, (_, i) => `テスト行${i + 1}`).join('\n');
    const comments10 = Array.from({ length: 10 }, (_, i) => `テスト行${i + 1}`).join('\n');

    const cases = [
      { label: '朝 2行',  file: 'test-output/png/morning-2lines.png',  html: generateMorningHTML({ aiComment: comments2  }) },
      { label: '朝 5行',  file: 'test-output/png/morning-5lines.png',  html: generateMorningHTML({ aiComment: comments5  }) },
      { label: '朝 10行', file: 'test-output/png/morning-10lines.png', html: generateMorningHTML({ aiComment: comments10 }) },
      { label: '夜 2行',  file: 'test-output/png/evening-2lines.png',  html: generateEveningHTML({ aiComment: comments2  }) },
      { label: '夜 5行',  file: 'test-output/png/evening-5lines.png',  html: generateEveningHTML({ aiComment: comments5  }) },
      { label: '夜 10行', file: 'test-output/png/evening-10lines.png', html: generateEveningHTML({ aiComment: comments10 }) },
    ];

    console.log('--- 動的高さ確認テスト ---');
    for (const c of cases) {
      const buf = await htmlToPng(c.html);
      writeFileSync(c.file, buf);
      console.log(`✅ ${c.file} (${c.label}) → 高さ: ${pngHeight(buf)}px`);
    }
    console.log('\nすべて異なる高さで生成されていれば動的高さ対応OK');
  })().catch(console.error);
}
