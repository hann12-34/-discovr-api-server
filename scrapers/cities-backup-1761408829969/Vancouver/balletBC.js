/**
 * Ballet BC Events Scraper
 * Scrapes events from Ballet BC
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const DataQualityFilter = require('../../../enhanced-data-quality-filter');

const BalletBCEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Ballet BC...');
    const filter = new DataQualityFilter();

    try {
      const response = await axios.get('https://www.balletbc.com/season/', {
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
        'a[href*="/performance/"]',
        'a[href*="/performances/"]',
        'a[href*="/ballet/"]',
        'a[href*="/show/"]',
        'a[href*="/shows/"]',
        'a[href*="/event/"]',
        'a[href*="/events/"]',
        '.performance-item a',
        '.ballet-item a',
        '.show-item a',
        '.event-item a',
        '.listing a',
        '.performance-listing a',
        '.ballet-listing a',
        '.event-listing a',
        '.performance-card a',
        '.ballet-card a',
        '.event-card a',
        'h3 a',
        'h2 a',
        'h1 a',
        '.performance-title a',
        '.ballet-title a',
        '.event-title a',
        'article a',
        '.performance a',
        '.ballet a',
        '.event a',
        'a[title]',
        '[data-testid*="performance"] a',
        '[data-testid*="ballet"] a',
        '[data-testid*="event"] a',
        'a:contains("Ballet")',
        'a:contains("Performance")',
        'a:contains("Show")',
        'a:contains("Event")',
        'a:contains("Dance")',
        'a:contains("Season")',
        'a:contains("Program")'
      ];

      let foundCount = 0;
      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
          foundCount += links.length;
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url) return;
          if (seenUrls.has(url)) return;

          if (url.startsWith('/')) {
            url = 'https://www.balletbc.com' + url;
          }

          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          title = title.replace(/\s+/g, ' ').trim();
          
          if (title.length < 2 || /^(home|about|contact|search|login|more|info|buy|tickets?)$/i.test(title)) {
            console.log(`✗ Filtered out generic title: "${title}"`);
            return;
          }

          seenUrls.add(url);

          // Only log valid events (junk will be filtered out)
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Ballet BC', city: 'Vancouver' },
            city: city,
            date: null,
            source: 'Ballet BC'
          });
        });
      }

      console.log(`Found ${events.length} total events from Ballet BC`);
      
      // Apply data quality filtering
      const cleanedEvents = filter.filterEvents(events);
      return cleanedEvents;

    } catch (error) {
      console.error('Error scraping Ballet BC events:', error.message);
      return [];
    }
  }
};


module.exports = BalletBCEvents.scrape;
