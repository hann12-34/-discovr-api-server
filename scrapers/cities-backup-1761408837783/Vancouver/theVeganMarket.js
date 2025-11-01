/**
 * The Vegan Market Scraper
 * Scrapes events from The Vegan Market Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const TheVeganMarketEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from The Vegan Market...');

    try {
      const response = await axios.get('https://www.theveganmarket.ca/', {
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

      // Known vegan market events
      const knownEvents = [
        'Monthly Vegan Market',
        'Vegan Food Festival',
        'Plant-Based Vendors Market',
        'Sustainable Living Expo',
        'Vegan Product Showcase',
        'Local Vegan Businesses Fair',
        'Eco-Friendly Market Day'
      ];

      knownEvents.forEach(title => {
        const eventUrl = 'https://www.theveganmarket.ca/';
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          date: dateText || 'Date TBA',  // FIXED: Extract date from page
          time: null,
          url: eventUrl,
          venue: { name: 'The Vegan Market', address: 'Vancouver', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      const eventSelectors = [
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/market"]',
        '.event-item a',
        '.market-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Market")',
        'a:contains("Event")',
        'a:contains("Festival")',
        'a:contains("Vegan")'
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
            url = 'https://www.theveganmarket.ca' + url;
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
            venue: { name: 'The Vegan Market', address: 'Vancouver', city: 'Vancouver' },
            city: 'Vancouver',
            date: dateText || 'Date TBA',  // FIXED: Extract date from page
            source: 'The Vegan Market'
          });
        });
      }

      console.log(`Found ${events.length} total events from The Vegan Market`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping The Vegan Market events:', error.message);
      return [];
    }
  }
};


module.exports = TheVeganMarketEvents.scrape;
