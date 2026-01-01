/**
 * Edmonton Opera Events Scraper
 * URL: https://www.edmontonopera.com/season/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEdmontonOpera(city = 'Edmonton') {
  console.log('🎭 Scraping Edmonton Opera...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.edmontonopera.com/season/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.opera-card, .event-card, article, a[href*="opera"], [class*="production"], .card').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          const titleEl = el.querySelector('h2, h3, h4, .title, [class*="title"]');
          const title = titleEl?.textContent?.trim() || linkEl?.textContent?.trim()?.substring(0, 100);
          if (!title || title.length < 3) return;

          const text = el.textContent || '';
          const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);

          const img = el.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({
            title,
            dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}` : null,
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

    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})?/i);
        if (match) {
          const month = months[match[1].toLowerCase().substring(0, 3)];
          const day = match[2].padStart(2, '0');
          const year = match[3] || new Date().getFullYear();
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Northern Alberta Jubilee Auditorium', address: '11455 87 Ave NW, Edmonton, AB T6G 2T2', city: 'Edmonton' },
        city: 'Edmonton',
        category: 'Variety',
        source: 'Edmonton Opera'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Opera events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Opera error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeEdmontonOpera;
