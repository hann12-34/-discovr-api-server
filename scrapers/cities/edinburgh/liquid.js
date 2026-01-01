/**
 * Liquid Room Edinburgh Events Scraper
 * Live music venue
 * URL: https://www.liquidroom.com/gigs
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeLiquidRoom(city = 'Edinburgh') {
  console.log('🎸 Scraping Liquid Room Edinburgh...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Try gigs page first, then clubs page
    const urls = ['https://www.liquidroom.com/gigs', 'https://www.liquidroom.com/clubs'];
    const allEvents = [];

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        const events = await page.evaluate(() => {
          const results = [];
          const seen = new Set();
          const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

          // Find all event containers
          document.querySelectorAll('a[href*="/gigs/"], a[href*="/clubs/"], [class*="event"], article').forEach(el => {
            try {
              const link = el.tagName === 'A' ? el : el.querySelector('a');
              const url = link?.href;
              if (!url || seen.has(url)) return;

              // Get title
              let title = el.querySelector('h1, h2, h3, h4, .title')?.textContent?.trim();
              if (!title) title = link?.textContent?.trim();
              if (!title || title.length < 3 || title.length > 150) return;

              // Get date text
              const dateEl = el.querySelector('time, .date, [class*="date"]');
              let dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
              
              // Also check for date in element text
              if (!dateStr) {
                const text = el.textContent || '';
                const dateMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{4}))?/i);
                if (dateMatch) dateStr = dateMatch[0];
              }

              // Get image
              const img = el.querySelector('img');
              const imageUrl = img?.src || img?.getAttribute('data-src');

              seen.add(url);
              results.push({ title, dateStr, url, imageUrl });
            } catch (e) {}
          });

          return results;
        });

        allEvents.push(...events);
      } catch (e) {}
    }

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of allEvents) {
      let isoDate = null;

      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
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
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Liquid Room', address: '9c Victoria Street, Edinburgh EH1 2HE', city: 'Edinburgh' },
        latitude: 55.9487,
        longitude: -3.1914,
        city: 'Edinburgh',
        category: 'Nightlife',
        source: 'Liquid Room'
      });
    }

    // Dedupe
    const seen = new Set();
    const unique = formattedEvents.filter(e => {
      const key = `${e.title}|${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`  ✅ Found ${unique.length} Liquid Room events`);
    return unique;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Liquid Room error:', error.message);
    return [];
  }
}

module.exports = scrapeLiquidRoom;
