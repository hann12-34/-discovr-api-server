const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectRA() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://ra.co/clubs/69282/events', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const html = await page.content();
  fs.writeFileSync('RA_PAGE.html', html);
  console.log('✅ Saved HTML to RA_PAGE.html');
  console.log(`📄 HTML length: ${html.length} chars`);
  
  // Check for key elements
  const hasEvents = html.includes('FROM THE CRYPT') || html.includes('IOU presents');
  console.log(`🎪 Has event text: ${hasEvents}`);
  
  await browser.close();
}

inspectRA().catch(console.error);
