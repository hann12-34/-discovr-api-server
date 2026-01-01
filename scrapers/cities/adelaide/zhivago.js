/**
 * Zhivago Nightclub Adelaide Events Scraper
 * Popular basement nightclub
 * URL: https://www.zhivago.com.au/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeZhivago(city = 'Adelaide') {
  console.log('🎧 Scraping Zhivago Adelaide...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.zhivago.com.au/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Wix event structures
      document.querySelectorAll('[data-hook*="event"], .event-item, article, a[href*="event"]').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = link?.href; if (!url) return;

          const titleEl = el.querySelector('h1, h2, h3, h4, [data-hook*="title"], .title');
          const title = titleEl?.textContent?.trim() || link?.textContent?.trim()?.substring(0, 100);
          if (!title || title.length < 3 || title.length > 150) return;
          if (/^(View|More|Read|Click|Book|Buy)/i.test(title)) return;

          const key = title.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);

          const dateEl = el.querySelector('time, [data-hook*="date"], .date');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || el.textContent || '';

          const img = el.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({
            title,
            dateText,
            url,
            imageUrl
          });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;
      if (event.dateText) {
        const isoMatch = event.dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        } else {
          const match = event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (match) {
            const month = months[match[1].toLowerCase().substring(0, 3)];
            const day = match[2].padStart(2, '0');
            const year = match[3] || now.getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Zhivago',
          address: '54 Currie Street, Adelaide, SA 5000',
          city: 'Adelaide'
        },
        city: 'Adelaide',
        category: 'Nightlife',
        source: 'Zhivago'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Zhivago events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Zhivago error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeZhivago;
