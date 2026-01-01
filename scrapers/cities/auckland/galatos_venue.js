/**
 * Galatos Auckland Events Scraper
 * Live music venue off K Road with 3 floors
 * URL: https://galatos.co.nz/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeGalatosVenue(city = 'Auckland') {
  console.log('🎸 Scraping Galatos Auckland...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://galatos.co.nz/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event/ticket links
      document.querySelectorAll('a[href*="ticket"], a[href*="event"], .product, .event, article').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = link?.href;
          
          if (!url || seen.has(url)) return;
          if (url.includes('cart') || url.includes('account')) return;
          seen.add(url);

          let container = el.closest('div, article, li') || el;

          const titleEl = container.querySelector('h1, h2, h3, h4, .title, .product-title, [class*="title"]');
          let title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 200) return;

          // Look for date
          let dateStr = null;
          const text = container.textContent || '';
          const dateMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            dateStr = dateMatch[0];
          }

          const img = container.querySelector('img:not([src*="logo"])');
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
        const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = dateMatch[3] || now.getFullYear().toString();
          if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Galatos',
          address: '17 Galatos Street, Auckland 1010',
          city: 'Auckland'
        },
        latitude: -36.8565,
        longitude: 174.7555,
        city: 'Auckland',
        category: 'Nightlife',
        source: 'Galatos'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Galatos events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Galatos error:', error.message);
    return [];
  }
}

module.exports = scrapeGalatosVenue;
