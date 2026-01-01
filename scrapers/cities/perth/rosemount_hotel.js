/**
 * Rosemount Hotel Perth Events Scraper
 * Perth's leading independent original music venue
 * URL: https://rosemounthotel.com.au/live-stuff/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRosemountHotel(city = 'Perth') {
  console.log('🎸 Scraping Rosemount Hotel Perth...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://rosemounthotel.com.au/live-stuff/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to load more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event containers
      const selectors = [
        '.event',
        '.gig',
        'article',
        '[class*="event"]',
        '.tribe-events-calendar-list__event',
        'a[href*="event"]'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const link = el.querySelector('a[href]') || (el.tagName === 'A' ? el : null);
            const url = link?.href;
            
            if (url && seen.has(url)) return;
            if (url) seen.add(url);

            let container = el.tagName === 'A' ? el.closest('div, article') : el;

            const titleEl = container?.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            let title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
            if (!title || title.length < 3 || title.length > 200) return;

            // Look for date
            let dateStr = null;
            const timeEl = container?.querySelector('time[datetime]');
            if (timeEl) {
              dateStr = timeEl.getAttribute('datetime');
            } else {
              const dateEl = container?.querySelector('.date, [class*="date"], time');
              if (dateEl) dateStr = dateEl.textContent?.trim();
            }

            // Try to extract date from text content
            if (!dateStr) {
              const text = container?.textContent || '';
              const dateMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
              if (dateMatch) {
                dateStr = dateMatch[0];
              }
            }

            const img = container?.querySelector('img:not([src*="logo"])');
            let imageUrl = img?.src || img?.getAttribute('data-src');

            results.push({ title, url, dateStr, imageUrl });
          } catch (e) {}
        });
        
        if (results.length > 0) break;
      }

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
          name: 'Rosemount Hotel',
          address: '459 Fitzgerald Street, North Perth, WA 6006',
          city: 'Perth'
        },
        latitude: -31.9290,
        longitude: 115.8525,
        city: 'Perth',
        category: 'Nightlife',
        source: 'Rosemount Hotel'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Rosemount Hotel events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Rosemount Hotel error:', error.message);
    return [];
  }
}

module.exports = scrapeRosemountHotel;
