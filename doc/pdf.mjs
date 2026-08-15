/* Conversion du guide HTML en PDF A4 pagine. */
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const html = path.resolve('guide.html');
const out = path.resolve('Guide-Invent-RTE.pdf');

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.goto('file:///' + html.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%;font-size:8pt;color:#9CA3AF;padding:0 14mm;
                  font-family:'Segoe UI',sans-serif;display:flex;justify-content:space-between;">
        <span>Invent'RTE — Guide d'utilisation</span>
        <span class="pageNumber"></span>
      </div>`,
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
});

await browser.close();
const ko = fs.statSync(out).size / 1024;
console.log(`PDF genere : ${out} (${ko.toFixed(0)} Ko)`);
