/**
 * Rickshaw Theatre Events Scraper
 * Scrapes upcoming events from Rickshaw Theatre
 * Vancouver's historic live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RickshawTheatreEvents = {
  async scrape(city) {
    console.log('🎸 Scraping Rickshaw Theatre with headless browser...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      console.log('Loading Rickshaw Theatre page...');
      await page.goto('https://www.rickshawtheatre.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract event data from the page
      const eventData = await page.evaluate(() => {
        const events = [];
        const links = document.querySelectorAll('a[href*="eventbrite"]');

        links.forEach(link => {
          const container = link.closest('div, article, section');
          if (!container) return;

          let title = '';
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }

          // Get date
          let date = '';
          const dateEl = container.querySelector('.date, time, [class*="date"]');
          if (dateEl) {
            date = dateEl.textContent.trim();
          }

          if (title && title.length > 3 && !title.toLowerCase().includes('get tickets')) {
            events.push({
              title,
              date,
              url: link.href
            });
          }
        });

        return events;
      });

      console.log(`Found ${eventData.length} events from Rickshaw Theatre`);

      const events = [];
      const seen = new Set();

      eventData.forEach(({ title, date, url }) => {
        if (seen.has(url)) return;
        seen.add(url);

        console.log(`✓ ${title} | ${date || 'TBD'}`);

        events.push({
          id: uuidv4(),
          title: title,
          date: date || null,
          time: null,
          url: url,
          venue: { name: 'Rickshaw Theatre', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: `${title} at Rickshaw Theatre.`,
          category: 'Concert',
          city: 'Vancouver',
          image: null,
          source: 'Rickshaw Theatre'
        });
      });

      console.log(`\n✅ Found ${events.length} Rickshaw Theatre events`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Rickshaw Theatre events:', error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};


module.exports = RickshawTheatreEvents.scrape;
