/**
 * The Gov Adelaide Events Scraper (via Moshtix)
 * Adelaide's leading live music venue
 * URL: https://www.moshtix.com.au/v2/venues/the-gov-adelaide/923
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheGovMoshtix(city = 'Adelaide') {
  console.log('🎸 Scraping The Gov Adelaide (Moshtix)...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.moshtix.com.au/v2/venues/the-gov-adelaide/923', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event links on Moshtix
      document.querySelectorAll('a[href*="/v2/event/"]').forEach(el => {
        try {
          const url = el.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          // Find parent container
          let container = el.closest('.event-listing, .event-item, article, div');
          for (let i = 0; i < 5 && container; i++) {
            if (container.textContent?.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
              break;
            }
            container = container.parentElement;
          }

          // Get title
          let title = el.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 200) return;
          if (title.toLowerCase().includes('get tickets') || title.toLowerCase().includes('more »')) return;

          // Get date from surrounding text
          let dateStr = null;
          const text = container?.textContent || '';
          const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
          if (dateMatch) {
            dateStr = `${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4]}`;
          }

          // Get image
          const img = container?.querySelector('img:not([src*="logo"])');
          let imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({ title, url, dateStr, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();

    for (const event of events) {
      if (!event.url) continue;

      let isoDate = null;
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < new Date(now.toISOString().split('T')[0])) continue;

      const key = event.title.toLowerCase() + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'The Gov',
          address: '59 Port Road, Hindmarsh, SA 5007',
          city: 'Adelaide'
        },
        latitude: -34.9070,
        longitude: 138.5755,
        city: 'Adelaide',
        category: 'Nightlife',
        source: 'The Gov'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} The Gov events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ The Gov error:', error.message);
    return [];
  }
}

module.exports = scrapeTheGovMoshtix;
