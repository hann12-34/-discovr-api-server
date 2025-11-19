/**
 * Red Room Ultra Bar Events Scraper (Vancouver)
 * Scrapes upcoming events from Red Room Ultra Bar
 * Vancouver nightclub and live music venue
 * URL: https://www.redroomvancouver.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RedRoomUltraBarEvents = {
  async scrape(city) {
    console.log('🔴 Scraping Red Room Ultra Bar with Puppeteer...');

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

      console.log('  📡 Loading Red Room events page...');
      await page.goto('https://www.redroomvancouver.com/events/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 8000));

      const events = await page.evaluate(() => {
        const results = [];
        const seenTitles = new Set();

        // Find all potential event containers
        const eventSelectors = [
          'article',
          '.event',
          '.show',
          '[class*="event"]',
          '[class*="show"]',
          'a[href*="/event"]',
          '.card',
          '[data-event]'
        ];

        for (const selector of eventSelectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach(el => {
            // Extract title
            let title = '';
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            if (titleEl) {
              title = titleEl.textContent.trim();
            } else {
              const text = el.textContent.trim();
              const lines = text.split('\n').filter(l => l.trim().length > 0);
              title = lines[0] ? lines[0].trim() : '';
            }

            // Skip if no title or duplicate
            if (!title || title.length < 3 || seenTitles.has(title)) return;

            // Skip navigation/junk
            const skipTerms = ['home', 'contact', 'about', 'menu', 'view event', 'events', 'tickets'];
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

            // Extract date - comprehensive search
            let date = null;
            
            // Try datetime attribute
            const timeEl = el.querySelector('time[datetime], [datetime]');
            if (timeEl) {
              date = timeEl.getAttribute('datetime');
            }
            
            // Try date-specific elements
            if (!date) {
              const dateSelectors = [
                '.date',
                '.event-date',
                '.show-date',
                '[class*="date"]',
                '[class*="Date"]',
                '[data-date]',
                'time',
                '.datetime',
                '.when',
                '[class*="when"]',
                '[class*="time"]'
              ];
              
              for (const sel of dateSelectors) {
                const dateEl = el.querySelector(sel);
                if (dateEl) {
                  const dateText = dateEl.textContent.trim();
                  if (dateText.length >= 3 && dateText.length <= 50) {
                    date = dateText;
                    break;
                  }
                }
              }
            }

            // Try parent element for date
            if (!date && el.parentElement) {
              const parentText = el.parentElement.textContent;
              const datePatterns = [
                /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?/i,
                /\d{1,2}\/\d{1,2}\/\d{2,4}/,
                /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i,
                /\d{4}-\d{2}-\d{2}/
              ];
              
              for (const pattern of datePatterns) {
                const match = parentText.match(pattern);
                if (match) {
                  date = match[0];
                  break;
                }
              }
            }
            
            // Try finding date in element's own text
            if (!date) {
              const text = el.textContent;
              const datePatterns = [
                /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?/i,
                /\d{1,2}\/\d{1,2}\/\d{2,4}/,
                /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i,
                /\d{4}-\d{2}-\d{2}/
              ];
              
              for (const pattern of datePatterns) {
                const match = text.match(pattern);
                if (match) {
                  date = match[0];
                  break;
                }
              }
            }

            results.push({
              title,
              url: url || 'https://www.redroomvancouver.com/events/',
              imageUrl,
              date
            });
          });

          if (results.length > 0) break; // Found events
        }

        return results;
      });

      await browser.close();

      console.log(`  ✅ Found ${events.length} Red Room events`);

      const formattedEvents = events.map(event => ({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Red Room Ultra Bar',
          address: '398 Richards Street, Vancouver, BC V6B 3A7',
          city: 'Vancouver'
        },
        city: 'Vancouver',
        category: 'Nightlife',
        source: 'Red Room Ultra Bar'
      }));

      return filterEvents(formattedEvents);

    } catch (error) {
      if (browser) await browser.close();
      console.error('  ⚠️  Red Room error:', error.message);
      return [];
    }
  }
};

module.exports = RedRoomUltraBarEvents.scrape;
