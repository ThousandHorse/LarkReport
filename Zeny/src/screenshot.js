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

if (process.argv[1] && process.argv[1].endsWith('screenshot.js')) {
  (async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { generateMoneyHTML } = await import('./generateMoneyHTML.js');

    mkdirSync('test-output/png', { recursive: true });

    const html = generateMoneyHTML({
      date: new Date('2026-05-03'),
      incomeList: [{ category: 'エンジニア収入', paymentMethod: '振込', amount: 50000 }],
      expenseList: [
        { category: '食費', paymentMethod: '現金', amount: 800 },
        { category: 'カフェ', paymentMethod: 'JCBカード', amount: 500 },
      ],
      futureExpenses: [],
      monthlyExpenses: [
        { label: '食費', amount: 8000, color: '#f87171' },
        { label: 'カフェ', amount: 5000, color: '#fb923c' },
      ],
      monthlyIncome: 50000,
      aiComment: '今日もお疲れ様でした！支出をうまくコントロールできていますね 💪',
    });

    const buf = await htmlToPng(html);
    writeFileSync('test-output/png/money-report.png', buf);
    console.log(`✅ test-output/png/money-report.png → 高さ: ${pngHeight(buf)}px`);
  })().catch(console.error);
}
