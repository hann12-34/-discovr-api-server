/**
 * Vogue Theatre Events Scraper
 * Scrapes upcoming events from Vogue Theatre via AdmitOne
 * Vancouver's historic theatre and live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VogueTheatreEvents = {
  async scrape(city) {
    console.log('🎭 Scraping events from Vogue Theatre (via AdmitOne)...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      console.log('  📡 Loading Vogue Theatre events...');
      await page.goto('https://admitone.com/search?venue=vogue-theatre', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for events to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract events with REAL POSTER IMAGES
      const events = await page.evaluate(() => {
        const results = [];
        const seenUrls = new Set();

        // Try multiple selectors for AdmitOne layout
        const selectors = [
          '[data-testid="event-card"]',
          '.event-card',
          '.event-item',
          'article',
          '[class*="Event"]',
          'a[href*="/events/"]'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach(el => {
            // Extract title
            let title = '';
            const titleEl = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"], [class*="name"]');
            if (titleEl) {
              title = titleEl.textContent.trim();
            } else {
              const link = el.querySelector('a');
              if (link) title = link.textContent.trim();
            }

            // Extract URL
            const linkEl = el.querySelector('a') || (el.tagName === 'A' ? el : null);
            let url = linkEl ? linkEl.href : '';

            // Extract REAL POSTER IMAGE
            let imageUrl = null;
            const img = el.querySelector('img:not([alt*="logo"]):not([src*="logo"])');
            if (img) {
              const src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0];
              if (src && !src.includes('logo') && !src.includes('icon')) {
                imageUrl = src;
              }
            }

            // Extract date
            let date = null;
            const dateEl = el.querySelector('[datetime], time, [class*="date"], [class*="Date"]');
            if (dateEl) {
              date = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
            } else {
              // Try text pattern
              const text = el.textContent;
              const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?/i);
              if (dateMatch) date = dateMatch[0];
            }

            // Filter junk
            if (!title || title.length < 3) return;
            const skipTerms = ['search', 'filter', 'sort', 'menu', 'contact', 'about'];
            if (skipTerms.some(term => title.toLowerCase().includes(term))) return;

            // Avoid duplicates
            const key = url || title;
            if (seenUrls.has(key)) return;
            seenUrls.add(key);

            results.push({
              title,
              url,
              imageUrl, // Real poster image or null
              date
            });
          });

          if (results.length > 0) break; // Found events
        }

        return results;
      });

      await browser.close();

      console.log(`  ✅ Found ${events.length} Vogue Theatre events`);

      // Format events
      const formattedEvents = events.map(event => ({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        time: null,
        url: event.url,
        imageUrl: event.imageUrl || null, // REAL POSTER IMAGE or null
        venue: {
          name: 'Vogue Theatre',
          address: '918 Granville St, Vancouver, BC V6Z 1L2',
          city: 'Vancouver'
        },
        location: 'Vancouver, BC',
        city: 'Vancouver',
        category: 'Concert',
        description: null
      }));

      console.log(`  🎉 Returning ${formattedEvents.length} Vogue Theatre events`);
      return filterEvents(formattedEvents);

    } catch (error) {
      if (browser) await browser.close();
      console.error('  ⚠️  Vogue Theatre error:', error.message);
      return [];
    }
  }
};

module.exports = VogueTheatreEvents.scrape;
