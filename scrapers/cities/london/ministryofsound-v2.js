/**
 * Ministry of Sound London Events Scraper
 * Legendary superclub
 * URL: https://www.ministryofsound.com/club/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeMinistryOfSound(city = 'London') {
  console.log('🎧 Scraping Ministry of Sound London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('  📡 Loading Ministry of Sound events...');
    await page.goto('https://www.ministryofsound.com/club/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      // Try multiple selector strategies
      const selectors = ['.event-card', '.event', 'article', '[class*="event"]', '.card', 'a[href*="/event"]'];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], .name');
            let title = titleEl ? titleEl.textContent.trim() : '';
            
            if (!title || title.length < 3 || seenTitles.has(title)) return;
            seenTitles.add(title);

            const link = el.querySelector('a') || (el.tagName === 'A' ? el : null);
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

      // Return only real scraped events - no fallback

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Ministry of Sound events`);

    const formattedEvents = events.map(event => {
      let dateStr = event.dateStr;
      let isoDate = null;
      
      if (dateStr) {
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = dateStr.substring(0, 10);
        } else {
          // Try to parse various date formats
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          const dayMatch = dateStr.match(/\b(\d{1,2})\b/);
          
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
      
      // Skip events without valid dates
      if (!isoDate) return null;
      
      return {
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Ministry of Sound', address: '103 Gaunt Street, London SE1 6DP', city: 'London' },
        latitude: 51.4937,
        longitude: -0.1005,
        city: 'London',
        category: 'Nightlife',
        source: 'Ministry of Sound'
      };
    });

    return filterEvents(formattedEvents.filter(e => e !== null));

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Ministry of Sound error:', error.message);
    return [];
  }
}

module.exports = scrapeMinistryOfSound;
