/**
 * Brooklyn Bowl Events Scraper (Puppeteer)
 * Popular Brooklyn music venue and bowling alley
 * URL: https://www.brooklynbowl.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'New York') {
  console.log('🎳 Scraping Brooklyn Bowl with Puppeteer...');

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

    console.log('  📡 Loading Brooklyn Bowl events...');
    await page.goto('https://www.brooklynbowl.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      // Find all event elements
      const eventSelectors = [
        '.event',
        '.show',
        'article',
        '[class*="event"]',
        '[class*="Event"]',
        '[data-event]',
        'a[href*="/event"]'
      ];

      for (const selector of eventSelectors) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
          // Extract title
          let title = '';
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="artist"], .name');
          if (titleEl) {
            title = titleEl.textContent.trim();
          } else {
            const text = el.textContent.trim();
            const lines = text.split('\n').filter(l => l.trim().length > 0);
            title = lines[0] ? lines[0].trim() : '';
          }

          // Skip invalid
          if (!title || title.length < 3 || seenTitles.has(title)) return;

          // Skip junk
          const skipTerms = ['home', 'about', 'contact', 'menu', 'events', 'tickets', 'buy', 'view'];
          if (skipTerms.some(term => title.toLowerCase() === term)) return;
          
          // Skip CLOSED/CANCELED events
          const titleLower = title.toLowerCase();
          if (titleLower.includes('closed') || titleLower.includes('canceled') || 
              titleLower.includes('cancelled') || titleLower.includes('postponed')) return;

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
          
          // Try datetime
          const timeEl = el.querySelector('time[datetime], [datetime]');
          if (timeEl) {
            date = timeEl.getAttribute('datetime');
          }
          
          // Try date selectors
          if (!date) {
            const dateEl = el.querySelector('.date, [class*="date"], time, [class*="Date"]');
            if (dateEl) {
              date = dateEl.textContent.trim();
            }
          }
          
          // Try regex on text
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
            url: url,
            imageUrl,
            date
          });
        });

        if (results.length > 0) break;
      }

      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Brooklyn Bowl events`);

    const formattedEvents = events.map(event => {
      let dateStr = event.date;
      
      // Add year if missing (e.g., "Nov 23rd" -> "Nov 23 2025")
      if (dateStr && !dateStr.match(/\d{4}/)) {
        // Remove ordinal suffixes (st, nd, rd, th)
        dateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1');
        
        // Determine year based on month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Parse month from date string
        const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (monthMatch) {
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const eventMonth = monthNames.indexOf(monthMatch[1].toLowerCase());
          
          // If event month is before current month, assume next year
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
          name: 'Brooklyn Bowl',
          address: '61 Wythe Ave, Brooklyn, NY 11249',
          city: 'New York'
        },
        city: 'New York',
        category: 'Nightlife',
        source: 'Brooklyn Bowl'
      };
    });

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }


    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Brooklyn Bowl error:', error.message);
    return [];
  }
}

module.exports = scrape;
