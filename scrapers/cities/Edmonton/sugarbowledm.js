/**
 * Sugarbowl Edmonton Events Scraper
 * URL: https://www.thesugarbowl.org/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSugarbowl(city = 'Edmonton') {
  console.log('☕ Scraping Sugarbowl Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thesugarbowl.org/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.event-item, .event-card, article, a[href*="event"], .show, .eventlist-event').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a');
          const url = link?.href; if (!url) return;
          if (seen.has(url)) return;
          seen.add(url);

          const title = el.querySelector('h2, h3, h4, .title, .eventlist-title')?.textContent?.trim() || link?.textContent?.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          const timeEl = el.querySelector('time[datetime]');
          const dateText = timeEl?.getAttribute('datetime') || el.textContent || '';
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i) ||
                           dateText.match(/(\d{4})-(\d{2})-(\d{2})/);

          const img = el.querySelector('img');
          results.push({
            title,
            dateStr: dateMatch ? (dateMatch[0].includes('-') ? dateMatch[0] : `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}`) : null,
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})?/i);
          if (match) {
            const month = months[match[1].toLowerCase().substring(0, 3)];
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Sugarbowl', address: '10922 88 Ave NW, Edmonton, AB T6G 0Z1', city: 'Edmonton' },
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Sugarbowl'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Sugarbowl events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Sugarbowl error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSugarbowl;
