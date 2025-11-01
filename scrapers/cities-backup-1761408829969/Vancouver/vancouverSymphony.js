/**
 * Vancouver Symphony Orchestra Events Scraper
 * Scrapes events from Vancouver Symphony Orchestra
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverSymphonyEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Symphony Orchestra...');

    try {
      const response = await axios.get('https://www.vancouversymphony.ca/', {
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
        'a[href*="/event/"]',
        'a[href*="tchaikovskys-first-piano-concerto"]',
        'a[href*="beethoven-piano-concertos"]',
        'a[href*="star-wars"]',
        'a[href*="twoset-violin"]',
        'a[href*="the-path-forward"]',
        'a[href*="gershwin-friends"]',
        'h3 a',
        'h2 a',
        '.event a',
        '.concert a',
        'a:contains("Event Details")',
        'a:contains("Tchaikovsky")',
        'a:contains("Beethoven")',
        'a:contains("Star Wars")',
        'a:contains("TwoSet Violin")',
        'a:contains("The Path Forward")',
        'a:contains("Gershwin")',
        'a:contains("Concert")',
        'a:contains("Masterworks")',
        'a:contains("Surrey Sundays")'
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
            url = 'https://www.vancouversymphony.ca' + url;
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
            venue: { name: 'Vancouver Symphony Orchestra', city: 'Vancouver' },
            city: city,
            date: null,
            source: 'Vancouver Symphony Orchestra'
          });
        });
      }

      console.log(`Found ${events.length} total events from Vancouver Symphony Orchestra`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Symphony Orchestra events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverSymphonyEvents.scrape;
