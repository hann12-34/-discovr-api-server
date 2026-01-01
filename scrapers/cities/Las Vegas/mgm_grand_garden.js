/**
 * MGM Grand Garden Arena Las Vegas Events Scraper
 * URL: https://www.mgmgrand.com/en/entertainment.html
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMgmGrandGarden(city = 'Las Vegas') {
  console.log('🎰 Scraping MGM Grand Garden Arena...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.mgmgrand.com/en/entertainment.html', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="entertainment"], .event-card, article, [class*="event"], [class*="show"]').forEach(el => {
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
          name: 'MGM Grand Garden Arena',
          address: '3799 S Las Vegas Blvd, Las Vegas, NV 89109',
          city: 'Las Vegas'
        },
        latitude: 36.1025,
        longitude: -115.1695,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'MGM Grand Garden Arena'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} MGM Grand events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ MGM Grand error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMgmGrandGarden;
