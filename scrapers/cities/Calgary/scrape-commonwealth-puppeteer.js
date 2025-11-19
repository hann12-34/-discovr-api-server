/**
 * Commonwealth Bar & Stage Calgary (Puppeteer)
 * Major Calgary music venue and nightclub
 * URL: https://www.thecommonwealth.ca
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Calgary') {
  console.log('🎸 Scraping Commonwealth Bar & Stage with Puppeteer...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('  📡 Loading Commonwealth events...');
    await page.goto('https://www.thecommonwealth.ca/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      const selectors = ['.event', 'article', '[class*="event"]', '.card', 'a[href*="/event"]'];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          let title = titleEl ? titleEl.textContent.trim() : '';
          
          if (!title || title.length < 3 || seenTitles.has(title)) return;
          seenTitles.add(title);

          const link = el.querySelector('a') || (el.tagName === 'A' ? el : null);
          let url = link ? link.href : '';

          const img = el.querySelector('img:not([src*="logo"])');
          let imageUrl = img ? (img.src || img.dataset.src) : null;

          let date = null;
          const timeEl = el.querySelector('time[datetime], [datetime]');
          if (timeEl) date = timeEl.getAttribute('datetime');
          
          if (!date) {
            const dateEl = el.querySelector('.date, [class*="date"], time');
            if (dateEl) date = dateEl.textContent.trim();
          }

          results.push({ title, url: url || 'https://www.thecommonwealth.ca/events', imageUrl, date });
        });
        if (results.length > 0) break;
      }
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Commonwealth events`);

    const formattedEvents = events.map(event => {
      let dateStr = event.date;
      if (dateStr && !dateStr.match(/\d{4}/)) {
        dateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1');
        const now = new Date();
        const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (monthMatch) {
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const eventMonth = monthNames.indexOf(monthMatch[1].toLowerCase());
          const year = (eventMonth < now.getMonth()) ? now.getFullYear() + 1 : now.getFullYear();
          dateStr = `${dateStr} ${year}`;
        }
      }
      
      return {
        id: uuidv4(),
        title: event.title,
        date: dateStr,
        url: event.url,
        imageUrl: event.imageUrl,
        venue: { name: 'Commonwealth Bar & Stage', address: '731 10 Ave SW, Calgary, AB', city: 'Calgary' },
        city: 'Calgary',
        category: 'Nightlife',
        source: 'Commonwealth'
      };
    });

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Commonwealth error:', error.message);
    return [];
  }
}

module.exports = scrape;
