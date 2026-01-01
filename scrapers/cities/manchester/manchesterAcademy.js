/**
 * Manchester Academy Events Scraper
 * Major live music venue
 * URL: https://www.manchesteracademy.net/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeManchesterAcademy(city = 'Manchester') {
  console.log('🎸 Scraping Manchester Academy...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('  📡 Loading Manchester Academy events...');
    await page.goto('https://www.manchesteracademy.net/whats-on', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      // Academy venues typically use event listings
      const selectors = ['.event-listing', '.event-card', '.event', 'article', '[class*="event"]', '.show', '.gig'];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], .artist, .headliner');
            let title = titleEl ? titleEl.textContent.trim() : '';
            
            if (!title || title.length < 3 || seenTitles.has(title)) return;
            seenTitles.add(title);

            const link = el.querySelector('a[href*="/event"], a[href*="/show"]') || el.querySelector('a');
            let url = link ? link.href : '';

            const img = el.querySelector('img:not([src*="logo"]):not([src*="icon"])');
            let imageUrl = img ? (img.src || img.dataset.src || img.getAttribute('data-lazy-src')) : null;

            let dateStr = null;
            const timeEl = el.querySelector('time[datetime], [datetime]');
            if (timeEl) dateStr = timeEl.getAttribute('datetime');
            
            if (!dateStr) {
              const dateEl = el.querySelector('.date, [class*="date"], time, .when, .event-date');
              if (dateEl) dateStr = dateEl.textContent.trim();
            }

            const descEl = el.querySelector('.description, .support, p');
            const description = descEl ? descEl.textContent.trim().substring(0, 300) : null;

            results.push({ 
              title, 
              url: url, 
              imageUrl, 
              dateStr,
              description 
            });
          } catch (e) {}
        });
        if (results.length > 0) break;
      }

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Manchester Academy events`);

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
          const yearMatch = event.dateStr.match(/\b(202[4-9])\b/);
          
          if (monthMatch && dayMatch) {
            const month = (monthNames.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
            const day = dayMatch[1].padStart(2, '0');
            const now = new Date();
            let year = yearMatch ? yearMatch[1] : now.getFullYear();
            if (!yearMatch && parseInt(month) < now.getMonth() + 1) year = now.getFullYear() + 1;
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Live at Manchester Academy`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Manchester Academy', address: 'Oxford Road, Manchester M13 9PR', city: 'Manchester' },
        latitude: 53.4631,
        longitude: -2.2310,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Manchester Academy'
      });
    }

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Manchester Academy error:', error.message);
    return [];
  }
}

module.exports = scrapeManchesterAcademy;
