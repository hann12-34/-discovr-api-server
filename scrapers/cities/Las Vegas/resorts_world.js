/**
 * Resorts World Las Vegas Events Scraper
 * URL: https://www.rwlasvegas.com/entertainment
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeResortsWorld(city = 'Las Vegas') {
  console.log('🏨 Scraping Resorts World Las Vegas...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.rwlasvegas.com/entertainment', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="entertainment"], a[href*="event"], .event-card, article').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          const title = el.querySelector('h2, h3, h4, .title')?.textContent.trim() || linkEl?.textContent.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          const dateText = el.textContent || '';
          const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);

          const img = el.querySelector('img');
          const imageUrl = img?.src || null;

          results.push({
            title,
            url,
            dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}` : null,
            imageUrl
          });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        const match = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{4})/i);
        if (match) {
          const month = months[match[1].toLowerCase()];
          const day = match[2].padStart(2, '0');
          isoDate = `${match[3]}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Resorts World',
          address: '3000 S Las Vegas Blvd, Las Vegas, NV 89109',
          city: 'Las Vegas'
        },
        latitude: 36.1352,
        longitude: -115.1685,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'Resorts World'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Resorts World events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Resorts World error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeResortsWorld;
