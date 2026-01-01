/**
 * Metro City Perth Events Scraper
 * Perth's #1 concert, live music & clubbing venue
 * URL: https://www.metroconcertclub.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMetroCity(city = 'Perth') {
  console.log('🏙️ Scraping Metro City Perth...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.metroconcertclub.com/events-2', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Squarespace event items
      const selectors = [
        '.eventlist-event',
        '.summary-item',
        '[data-item-id]',
        'article',
        '.collection-item',
        '.event-item'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const link = el.querySelector('a[href]');
            const url = link?.href;
            
            if (url && seen.has(url)) return;
            if (url) seen.add(url);

            const titleEl = el.querySelector('h1, h2, h3, h4, .eventlist-title, .summary-title, .event-title');
            const title = titleEl?.textContent?.trim();
            if (!title || title.length < 3 || title.length > 200) return;

            // Look for date
            let dateStr = null;
            const timeEl = el.querySelector('time[datetime]');
            if (timeEl) {
              dateStr = timeEl.getAttribute('datetime');
            } else {
              const dateEl = el.querySelector('.eventlist-meta-date, .event-date, .date');
              if (dateEl) dateStr = dateEl.textContent?.trim();
            }

            // Look for image
            const img = el.querySelector('img:not([src*="logo"])');
            let imageUrl = img?.src || img?.getAttribute('data-src');

            results.push({ title, url, dateStr, imageUrl });
          } catch (e) {}
        });
        
        if (results.length > 0) break;
      }

      // If no events found, try looking for any event-like content
      if (results.length === 0) {
        document.querySelectorAll('a[href*="event"], a[href*="ticket"]').forEach(el => {
          try {
            const url = el.href;
            if (seen.has(url)) return;
            seen.add(url);

            let container = el.closest('div') || el.parentElement;
            const titleEl = container?.querySelector('h1, h2, h3, h4') || el;
            const title = titleEl?.textContent?.trim();
            if (!title || title.length < 3 || title.length > 200) return;

            const img = container?.querySelector('img');
            const imageUrl = img?.src;

            results.push({ title, url, dateStr: null, imageUrl });
          } catch (e) {}
        });
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
        // Try ISO format first
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          // Try various date patterns
          let dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            let year = dateMatch[3] || now.getFullYear().toString();
            if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
              year = (now.getFullYear() + 1).toString();
            }
            isoDate = `${year}-${month}-${day}`;
          }
          
          if (!isoDate) {
            dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
            if (dateMatch) {
              const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
              const day = dateMatch[2].padStart(2, '0');
              let year = dateMatch[3] || now.getFullYear().toString();
              if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
                year = (now.getFullYear() + 1).toString();
              }
              isoDate = `${year}-${month}-${day}`;
            }
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
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Metro City',
          address: '146 Roe Street, Northbridge, WA 6003',
          city: 'Perth'
        },
        latitude: -31.9465,
        longitude: 115.8575,
        city: 'Perth',
        category: 'Nightlife',
        source: 'Metro City'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Metro City events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Metro City error:', error.message);
    return [];
  }
}

module.exports = scrapeMetroCity;
