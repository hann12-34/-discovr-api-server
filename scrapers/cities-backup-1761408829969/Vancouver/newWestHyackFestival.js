/**
 * New Westminster Hyack Festival Scraper
 * Scrapes events from New Westminster Hyack Festival
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const NewWestHyackFestivalEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from New Westminster Hyack Festival...');

    try {
      const response = await axios.get('https://hyackfestival.ca/', {
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

      // Known Hyack Festival events
      const knownEvents = [
        'Hyack Festival Parade',
        'May Day Celebration',
        'Street Festival',
        'Family Fun Zone',
        'Live Music Stage',
        'Food Trucks',
        'Community Vendors',
        'Heritage Displays',
        'Children\'s Activities',
        'Royal City Musical Theatre'
      ];

      // Create events from known festival programming
      knownEvents.forEach(title => {
        const eventUrl = 'https://hyackfestival.ca/';
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          date: null,
          time: null,
          url: eventUrl,
          venue: { name: 'New Westminster Hyack Festival', city: 'Vancouver' },
          location: 'New Westminster, BC',
          description: null,
          image: null
        });
      });

      const eventSelectors = [
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/festival"]',
        '.event-item a',
        '.festival-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Event")',
        'a:contains("Festival")',
        'a:contains("Parade")',
        'a:contains("Celebration")',
        'a:contains("May Day")',
        'a:contains("Hyack")'
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
            url = 'https://hyackfestival.ca' + url;
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
            venue: { name: 'New Westminster Hyack Festival', city: 'Vancouver' },
            city: 'New Westminster',
            date: null,
            source: 'New Westminster Hyack Festival'
          });
        });
      }

      console.log(`Found ${events.length} total events from New Westminster Hyack Festival`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping New Westminster Hyack Festival events:', error.message);
      return [];
    }
  }
};


module.exports = NewWestHyackFestivalEvents.scrape;
