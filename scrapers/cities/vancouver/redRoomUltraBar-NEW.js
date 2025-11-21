/**
 * Red Room Ultra Bar Events Scraper (Vancouver) - IMPROVED
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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      console.log('  📡 Loading Red Room events page...');
      await page.goto('https://www.redroomvancouver.com/events/', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait longer for dynamic content
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Try to find actual event cards/elements
      const events = await page.evaluate(() => {
        const results = [];
        const seen = new Set();

        // Look for links that might be events
        const eventLinks = Array.from(document.querySelectorAll('a[href*="/event/"], a[href*="/events/"]'));
        
        eventLinks.forEach(link => {
          const href = link.href;
          if (seen.has(href) || href.endsWith('/events/')) return;
          seen.add(href);

          // Get title from link or nearby heading
          let title = link.textContent.trim();
          if (!title || title.length < 3) {
            const parent = link.closest('div, article, section');
            if (parent) {
              const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
              if (heading) title = heading.textContent.trim();
            }
          }

          if (!title || title.length < 3) return;

          // Get image
          let imageUrl = null;
          const parent = link.closest('div, article, section');
          if (parent) {
            const img = parent.querySelector('img');
            if (img && img.src && !img.src.includes('logo')) {
              imageUrl = img.src;
            }
          }

          // Get date from parent container
          let date = null;
          if (parent) {
            const dateEl = parent.querySelector('time, .date, [class*="date"], [class*="time"]');
            if (dateEl) {
              date = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
            }
          }

          results.push({ title, url: href, imageUrl, date });
        });

        return results;
      });

      await browser.close();

      console.log(`  ✅ Found ${events.length} Red Room event links`);

      if (events.length === 0) {
        console.log('  ⚠️  No events found - site may have changed structure');
        return [];
      }

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
