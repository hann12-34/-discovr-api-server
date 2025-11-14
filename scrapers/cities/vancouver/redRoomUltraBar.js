/**
 * Red Room Ultra Bar Events Scraper (Vancouver)
 * Scrapes upcoming events from Red Room Ultra Bar
 * Vancouver nightclub and live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RedRoomUltraBarEvents = {
  async scrape(city) {
    console.log('🔴 Scraping events from Red Room Ultra Bar (Vancouver)...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      console.log('  📡 Loading Red Room events page...');
      await page.goto('https://www.redroomvancouver.com/events/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for events to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      const events = [];

      // Extract events from page
      const pageEvents = await page.evaluate(() => {
        const results = [];
        const seenUrls = new Set();

        // Try multiple selectors
        const selectors = [
          '.event-item',
          '.event-card',
          '.show-item',
          'article.event',
          'article.show',
          '.upcoming-event',
          '.card',
          'a[href*="/event"]',
          'a[href*="/events/"]',
          '.post',
          '.event',
          '.show'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach(el => {
            // Extract title
            let title = '';
            const titleEl = el.querySelector('h1, h2, h3, h4, h5, .title, .event-title, .show-title');
            if (titleEl) {
              title = titleEl.textContent.trim();
            } else {
              const link = el.querySelector('a');
              title = link ? link.textContent.trim() : el.textContent.trim().split('\n')[0];
            }

            // Extract URL
            const linkEl = el.querySelector('a') || (el.tagName === 'A' ? el : null);
            let url = linkEl ? linkEl.href : '';

            // Extract IMAGE (REAL POSTER)
            let imageUrl = null;
            const img = el.querySelector('img:not([src*="logo"]):not([src*="icon"])');
            if (img) {
              imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            }

            // Extract date - comprehensive search
            let date = null;
            
            // Try datetime attribute
            const datetimeEl = el.querySelector('[datetime], time[datetime]');
            if (datetimeEl) {
              date = datetimeEl.getAttribute('datetime');
            }
            
            // Try date selectors
            if (!date) {
              const dateSelectors = [
                '.date', '.event-date', '.show-date', 'time', 
                '[class*="date"]', '[data-date]', '.datetime', 
                '.when', '[itemprop="startDate"]', '.day',
                '.event-time', '.schedule'
              ];
              for (const sel of dateSelectors) {
                const dateEl = el.querySelector(sel);
                if (dateEl) {
                  date = dateEl.textContent.trim();
                  if (date && date.length >= 5 && date.length <= 100) break;
                  date = null;
                }
              }
            }
            
            // Try text pattern in element and parent
            if (!date) {
              const text = el.textContent + ' ' + (el.parentElement ? el.parentElement.textContent : '');
              const patterns = [
                /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?/i,
                /\d{1,2}\/\d{1,2}\/\d{2,4}/,
                /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
              ];
              for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                  date = match[0];
                  break;
                }
              }
            }

            // Filter out junk
            if (!title || title.length < 3) return;
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'read more', 'view all'];
            if (skipTerms.some(term => title.toLowerCase().includes(term))) return;

            // Avoid duplicates
            const key = url || title;
            if (seenUrls.has(key)) return;
            seenUrls.add(key);

            results.push({
              title,
              url,
              imageUrl,
              date
            });
          });

          if (results.length > 0) break; // Found events, no need to try more selectors
        }

        return results;
      });

      await browser.close();

      console.log(`  ✅ Found ${pageEvents.length} events from Red Room Ultra Bar`);

      // Format events
      const formattedEvents = pageEvents.map(event => ({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        time: null,
        url: event.url || 'https://www.redroomvancouver.com/events/',
        imageUrl: event.imageUrl || null, // REAL POSTER IMAGE or null
        venue: { 
          name: 'Red Room Ultra Bar', 
          address: '398 Richards Street, Vancouver, BC V6B 3A7', 
          city: 'Vancouver' 
        },
        location: 'Vancouver, BC',
        city: 'Vancouver',
        category: 'Nightlife',
        description: null
      }));

      console.log(`  🎉 Returning ${formattedEvents.length} Red Room events`);
      return filterEvents(formattedEvents);

    } catch (error) {
      if (browser) await browser.close();
      console.error('  ⚠️  Red Room Ultra Bar error:', error.message);
      return [];
    }
  }
};


module.exports = RedRoomUltraBarEvents.scrape;
