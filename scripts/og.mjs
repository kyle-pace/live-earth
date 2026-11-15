// Renders the share cards: every design/og*.html becomes public/<slug>/og*.png at
// 1200×630 (the share-card skill). Run with `npm run og` after changing a card, then
// look at the PNGs before committing.
//
// If Chromium is missing, run `npx playwright install chromium` once.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const slug = JSON.parse(readFileSync('package.json', 'utf8')).name;
const cards = readdirSync('design').filter((f) => /^og.*\.html$/.test(f));
if (!cards.length) throw new Error('No design/og*.html files to render.');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const card of cards) {
  await page.goto(pathToFileURL(resolve('design', card)).href);
  await page.evaluate(() => document.fonts.ready);
  const out = `public/${slug}/${card.replace(/\.html$/, '.png')}`;
  await page.screenshot({ path: out });
  console.log(`Rendered ${out}`);
}
await browser.close();
