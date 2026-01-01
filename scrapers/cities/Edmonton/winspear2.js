/**
 * Winspear Centre Edmonton Events Scraper
 * URL: https://www.winspearcentre.com/tickets/calendar/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeWinspear2(city = 'Edmonton') {
  console.log('🎻 Scraping Winspear Centre Calendar...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.winspearcentre.com/tickets/calendar/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/event/"], a[href*="/tickets/"], .event-item, .calendar-event, article').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = link?.href;
          if (!url || seen.has(url) || url.endsWith('/calendar/')) return;
          seen.add(url);

          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl?.textContent?.trim() || link?.textContent?.trim()?.substring(0, 100);
          if (!title || title.length < 3 || title.length > 150) return;

          const dateText = el.textContent || '';
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);

          const img = el.querySelector('img');
          results.push({
            title,
            dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}` : null,
            url,
            imageUrl: img?.src
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


      if (!isoDate) continue;

      if (new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Winspear Centre', address: '4 Sir Winston Churchill Square, Edmonton, AB T5J 2C1', city: 'Edmonton' },
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Winspear Centre'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Winspear Calendar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Winspear Calendar error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeWinspear2;
