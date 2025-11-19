/**
 * Webster Hall Events Scraper (Puppeteer)
 * Iconic NYC music venue
 * URL: https://www.websterhall.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'New York') {
  console.log('🎪 Scraping Webster Hall with Puppeteer...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('  📡 Loading Webster Hall events...');
    await page.goto('https://www.websterhall.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      const eventSelectors = [
        '.event',
        '.show',
        'article',
        '[class*="event"]',
        '[class*="Event"]',
        '[data-event]',
        '.card',
        'a[href*="/event"]'
      ];

      for (const selector of eventSelectors) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
          // Extract title
          let title = '';
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="artist"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          } else {
            const text = el.textContent.trim();
            const lines = text.split('\n').filter(l => l.trim().length > 0);
            title = lines[0] ? lines[0].trim() : '';
          }

          if (!title || title.length < 3 || seenTitles.has(title)) return;

          const skipTerms = ['home', 'about', 'contact', 'menu', 'events', 'tickets'];
          if (skipTerms.some(term => title.toLowerCase() === term)) return;

          seenTitles.add(title);

          // Extract URL
          let url = '';
          const link = el.querySelector('a') || (el.tagName === 'A' ? el : null);
          if (link) {
            url = link.href;
          }

          // Extract image
          let imageUrl = null;
          const img = el.querySelector('img:not([src*="logo"]):not([src*="icon"])');
          if (img) {
            imageUrl = img.src || img.dataset.src;
          }

          // Extract date
          let date = null;
          const timeEl = el.querySelector('time[datetime], [datetime]');
          if (timeEl) {
            date = timeEl.getAttribute('datetime');
          }
          
          if (!date) {
            const dateEl = el.querySelector('.date, [class*="date"], time');
            if (dateEl) {
              date = dateEl.textContent.trim();
            }
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

          results.push({
            title,
            url: url || 'https://www.websterhall.com/events',
            imageUrl,
            date
          });
        });

        if (results.length > 0) break;
      }

      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Webster Hall events`);

    const formattedEvents = events.map(event => {
      let dateStr = event.date;
      
      // Add year if missing
      if (dateStr && !dateStr.match(/\d{4}/)) {
        dateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1');
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (monthMatch) {
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const eventMonth = monthNames.indexOf(monthMatch[1].toLowerCase());
          const year = (eventMonth < currentMonth) ? currentYear + 1 : currentYear;
          dateStr = `${dateStr} ${year}`;
        }
      }
      
      return {
        id: uuidv4(),
        title: event.title,
        date: dateStr,
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Webster Hall',
          address: '125 E 11th St, New York, NY 10003',
          city: 'New York'
        },
        city: 'New York',
        category: 'Nightlife',
        source: 'Webster Hall'
      };
    });

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Webster Hall error:', error.message);
    return [];
  }
}

module.exports = scrape;
