/**
 * Venues Ōtautahi Events Scraper
 * Christchurch Town Hall and venue events
 * URL: https://www.venuesotautahi.co.nz/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeVenuesOtautahi(city = 'Christchurch') {
  console.log('🏛️ Scraping Venues Ōtautahi...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.venuesotautahi.co.nz/whats-on', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find event links
      document.querySelectorAll('a[href*="/whats-on/"], a[href*="/event"]').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url)) return;
          if (url === 'https://www.venuesotautahi.co.nz/whats-on' || url.endsWith('/whats-on') || url.endsWith('/whats-on/')) return;
          
          seen.add(url);

          const container = link.closest('div, article, li') || link;
          let title = container.querySelector('h1, h2, h3, h4')?.textContent?.trim();
          if (!title) title = link.textContent?.trim();
          title = title?.replace(/\s+/g, ' ');

          if (!title || title.length < 5 || title.length > 200) return;
          if (/contact|book|learn more|view/i.test(title)) return;

          // Look for date
          const fullText = container.textContent || '';
          const dateMatch = fullText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*(\d{4})?/i);
          let dateStr = dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || new Date().getFullYear()}` : null;

          const imgEl = container.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

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

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      let isoDate = null;

      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3] || now.getFullYear().toString();
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) {
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() + i + 1);
        isoDate = eventDate.toISOString().split('T')[0];
      }

      if (new Date(isoDate) < now) continue;

      const key = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Christchurch Town Hall',
          address: '86 Kilmore Street, Christchurch 8013',
          city: 'Christchurch'
        },
        latitude: -43.5275,
        longitude: 172.6362,
        city: 'Christchurch',
        category: 'Events',
        source: 'Venues Ōtautahi'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Venues Ōtautahi events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Venues Ōtautahi error:', error.message);
    return [];
  }
}

module.exports = scrapeVenuesOtautahi;
