const puppeteer = require('puppeteer-core');

async function scrapeCommodore() {
  console.log('🕵️‍♂️ Starting Commodore scraper in Authorization Key discovery mode...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    channel: 'chrome', // Use the installed Chrome browser
  });

  try {
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);

    const headersPromise = new Promise((resolve, reject) => {
      page.on('request', (request) => {
        if (request.url().includes('api.livenation.com/graphql') && request.method() === 'POST') {
          console.log('📡 Found GraphQL request. Logging headers...');
          const headers = request.headers();
          console.log('✅ GraphQL Request Headers:', JSON.stringify(headers, null, 2));
          resolve(headers);
        }
        request.continue();
      });

      setTimeout(() => {
        reject(new Error('Timeout: Did not find GraphQL request after 30 seconds.'));
      }, 30000);
    });

    console.log('📄 Loading Commodore Ballroom page to find Authorization Key...');
    await page.goto('https://www.commodoreballroom.com/shows', {
      waitUntil: 'networkidle2',
    });

    await headersPromise;

    console.log('✅ Authorization key has been logged.');
    return [];

  } catch (error) {
    console.error('❌ Error during Authorization Key discovery:', error.message);
    return [];
  } finally {
    console.log('Closing browser.');
    await browser.close();
  }
}

module.exports = { scrapeCommodore };
