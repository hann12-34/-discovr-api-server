/**
 * Brooklyn Bowl Las Vegas Events Scraper
 * Live music venue at The Linq
 * URL: https://www.brooklynbowl.com/las-vegas
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeBrooklynBowl(city = 'Las Vegas') {
  console.log('🎳 Scraping Brooklyn Bowl Las Vegas...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.brooklynbowl.com/las-vegas', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      const selectors = ['.event', '.event-card', 'article', '[class*="event"]', '.show'];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            let title = titleEl ? titleEl.textContent.trim() : '';
            
            // Filter out generic labels that aren't actual event titles
            const junkTitles = ['just announced', 'on sale', 'sold out', 'buy tickets', 'more info', 'view all', 'upcoming', 'events', 'shows'];
            if (!title || title.length < 3 || seenTitles.has(title)) return;
            if (junkTitles.some(junk => title.toLowerCase() === junk || title.toLowerCase().startsWith(junk + ' '))) return;
            seenTitles.add(title);

            const link = el.querySelector('a[href]') || (el.tagName === 'A' ? el : null);
            let url = link ? link.href : '';

            const img = el.querySelector('img:not([src*="logo"])');
            let imageUrl = img ? (img.src || img.dataset.src) : null;

            let dateStr = null;
            const timeEl = el.querySelector('time[datetime], [datetime]');
            if (timeEl) dateStr = timeEl.getAttribute('datetime');
            
            if (!dateStr) {
              const dateEl = el.querySelector('.date, [class*="date"], time');
              if (dateEl) dateStr = dateEl.textContent.trim();
            }

            results.push({ title, url: url, imageUrl, dateStr });
          } catch (e) {}
        });
        if (results.length > 0) break;
      }

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Brooklyn Bowl events`);

    const formattedEvents = [];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Handle ISO format
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          // Handle "Sat Dec 27th" format - extract month and day with ordinal suffix
          const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          const dayMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?/i);
          
          if (monthMatch && dayMatch) {
            const month = (monthNames.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
            const day = dayMatch[1].padStart(2, '0');
            let year = now.getFullYear();
            // Year inference: if month is before current month, assume next year
            if (parseInt(month) < now.getMonth() + 1) year++;
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      // Include today's events
      if (new Date(isoDate) < today) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: { name: 'Brooklyn Bowl', address: '3545 S Las Vegas Blvd, Las Vegas NV 89109', city: 'Las Vegas' },
        latitude: 36.1175,
        longitude: -115.1704,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'Brooklyn Bowl'
      });
    }

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Brooklyn Bowl error:', error.message);
    return [];
  }
}

module.exports = scrapeBrooklynBowl;
