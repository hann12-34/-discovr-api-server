/**
 * T-Mobile Arena Las Vegas Events Scraper
 * URL: https://www.t-mobilearena.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTmobileArena(city = 'Las Vegas') {
  console.log('🏟️ Scraping T-Mobile Arena Las Vegas...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.t-mobilearena.com/events', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/event"], .event-card, article, [class*="event"]').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          const title = el.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || linkEl?.textContent.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          const dateEl = el.querySelector('time, .date, [class*="date"]');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || el.textContent || '';
          const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i) ||
                          dateText.match(/(\d{4})-(\d{2})-(\d{2})/);

          const img = el.querySelector('img');
          const imageUrl = img?.src || null;

          let dateStr = null;
          if (dateMatch) {
            if (dateMatch[0].includes('-')) {
              dateStr = dateMatch[0];
            } else {
              dateStr = `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || new Date().getFullYear()}`;
            }
          }

          results.push({ title, url, dateStr, imageUrl });
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{4})/i);
          if (match) {
            const month = months[match[1].toLowerCase()];
            const day = match[2].padStart(2, '0');
            isoDate = `${match[3]}-${month}-${day}`;
          }
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'T-Mobile Arena',
          address: '3780 S Las Vegas Blvd, Las Vegas, NV 89158',
          city: 'Las Vegas'
        },
        latitude: 36.1028,
        longitude: -115.1784,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'T-Mobile Arena'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} T-Mobile Arena events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ T-Mobile Arena error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTmobileArena;
