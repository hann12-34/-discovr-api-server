/**
 * MTELUS Montreal (Puppeteer)
 * Major Montreal concert venue and nightclub
 * URL: https://mtelus.com/en/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Montreal') {
  console.log('🎵 Scraping MTELUS with Puppeteer...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('  📡 Loading MTELUS events...');
    await page.goto('https://mtelus.com/en/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait longer for content
    await new Promise(resolve => setTimeout(resolve, 8000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      const selectors = [
        '.event',
        'article',
        '[class*="event"]',
        '[class*="Event"]',
        '.card',
        '[class*="card"]',
        'a[href*="/event"]',
        'a[href*="/events/"]'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"], [class*="artist"]');
          let title = titleEl ? titleEl.textContent.trim() : '';
          
          if (!title || title.length < 3 || seenTitles.has(title)) return;
          
          const skipTerms = ['home', 'about', 'contact', 'menu', 'events', 'all events', 'tickets'];
          if (skipTerms.some(term => title.toLowerCase() === term)) return;
          
          seenTitles.add(title);

          const link = el.querySelector('a') || (el.tagName === 'A' ? el : null);
          let url = link ? link.href : '';

          const img = el.querySelector('img:not([src*="logo"]):not([src*="icon"])');
          let imageUrl = img ? (img.src || img.dataset.src) : null;

          let date = null;
          const timeEl = el.querySelector('time[datetime], [datetime]');
          if (timeEl) date = timeEl.getAttribute('datetime');
          
          if (!date) {
            const dateEl = el.querySelector('.date, [class*="date"], time, [class*="Date"]');
            if (dateEl) date = dateEl.textContent.trim();
          }

          if (!date) {
            const text = el.textContent;
            const patterns = [
              /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?/i,
              /\d{1,2}\/\d{1,2}\/\d{2,4}/,
              /\d{4}-\d{2}-\d{2}/
            ];
            for (const pattern of patterns) {
              const match = text.match(pattern);
              if (match) {
                date = match[0];
                break;
              }
            }
          }

          results.push({ title, url: url, imageUrl, date });
        });
        if (results.length > 0) break;
      }
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} MTELUS events`);

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
        venue: { name: 'MTELUS', address: '59 Rue Sainte-Catherine E, Montreal, QC', city: 'Montreal' },
        city: 'Montreal',
        category: 'Nightlife',
        source: 'MTELUS'
      };
    });

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  MTELUS error:', error.message);
    return [];
  }
}

module.exports = scrape;
