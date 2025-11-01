/**
 * Laowai Bar Scraper
 * Scrapes events from Laowai (hidden bar/speakeasy)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const LaowaiBarEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Laowai Bar...');

    try {
      const response = await axios.get('https://laowai.ca/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      const eventSelectors = [
        'a[href*="/event"]',
        'a[href*="/events/"]',
        '.event-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Event")',
        'a:contains("Night")',
        'a:contains("Party")',
        'a:contains("DJ")',
        'a:contains("Live")',
        'a:contains("Music")',
        'a:contains("Cocktail")',
        'a:contains("Special")'
      ];

      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url || seenUrls.has(url)) return;

          if (url.startsWith('/')) {
            url = 'https://laowai.ca' + url;
          }

          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i,
            /\/about/i, /\/contact/i, /\/home/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) return;

          title = title.replace(/\s+/g, ' ').trim();
          if (title.length < 3) return;

          seenUrls.add(url);
          // Only log valid events (junk will be filtered out)
          
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Laowai Bar', city: 'Vancouver' },
            city: 'Vancouver',
            date: null,
            source: 'Laowai Bar'
          });
        });
      }

      console.log(`Found ${events.length} total events from Laowai Bar`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Laowai Bar events:', error.message);
      return [];
    }
  }
};


module.exports = LaowaiBarEvents.scrape;
