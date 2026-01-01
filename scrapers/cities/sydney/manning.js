/**
 * Manning Bar Sydney Events Scraper
 * Live music venue at Sydney Uni
 * URL: https://manningbar.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeManningBar(city = 'Sydney') {
  console.log('🎸 Scraping Manning Bar Sydney...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://manningbar.com/', {
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
            
            if (!title || title.length < 3 || seenTitles.has(title)) return;
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
    console.log(`  ✅ Found ${events.length} Manning Bar events`);

    const formattedEvents = [];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          const dayMatch = event.dateStr.match(/\b(\d{1,2})\b/);
          
          if (monthMatch && dayMatch) {
            const month = (monthNames.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
            const day = dayMatch[1].padStart(2, '0');
            const now = new Date();
            let year = now.getFullYear();
            if (parseInt(month) < now.getMonth() + 1) year++;
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Manning Bar', address: 'Manning Road, University of Sydney NSW 2006', city: 'Sydney' },
        latitude: -33.8886,
        longitude: 151.1873,
        city: 'Sydney',
        category: 'Nightlife',
        source: 'Manning Bar'
      });
    }

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Manning Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeManningBar;
