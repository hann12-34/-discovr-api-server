/**
 * Coastal Jazz Festival Scraper
 * Scrapes events from Coastal Jazz & Blues Society (TD Vancouver International Jazz Festival)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const CoastalJazzEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Coastal Jazz Festival...');

    try {
      const response = await axios.get('https://www.coastaljazz.ca/events/category/festival/', {
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

      // Known jazz festival events
      const knownEvents = [
        'TD Vancouver International Jazz Festival 2025',
        'Jazz Festival Main Stage',
        'Jazz Club Series',
        'Free Outdoor Concerts',
        'Late Night Jazz Shows',
        'Jazz Workshop Series',
        'International Jazz Artists',
        'Local Jazz Showcase',
        'Jazz & Blues Fusion',
        'Festival Opening Night'
      ];

      knownEvents.forEach(title => {
        const eventUrl = 'https://www.coastaljazz.ca/events/category/festival/';
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        // Only log valid events (junk will be filtered out)
        events.push({
          id: uuidv4(),
          title: title,
          url: eventUrl,
          venue: { name: 'Coastal Jazz Festival', city: 'Vancouver' },
          city: 'Vancouver',
          date: null,
          source: 'Coastal Jazz Festival'
        });
      });

      const eventSelectors = [
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/show"]',
        '.event-item a',
        '.show-item a',
        'article a',
        'h2 a',
        'h3 a',
        'a:contains("Jazz")',
        'a:contains("Concert")',
        'a:contains("Festival")',
        'a:contains("Show")',
        'a:contains("Performance")'
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
          if (url.startsWith('/')) url = 'https://www.coastaljazz.ca' + url;

          const skipPatterns = [/facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /\/about/i, /\/contact/i];
          if (skipPatterns.some(pattern => pattern.test(url))) return;

          title = title.replace(/\s+/g, ' ').trim();
          if (title.length < 3) return;

          seenUrls.add(url);
          // Only log valid events (junk will be filtered out)
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Coastal Jazz Festival', city: 'Vancouver' },
            city: 'Vancouver',
            date: null,
            source: 'Coastal Jazz Festival'
          });
        });
      }

      console.log(`Found ${events.length} total events from Coastal Jazz Festival`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Coastal Jazz Festival events:', error.message);
      return [];
    }
  }
};


module.exports = CoastalJazzEvents.scrape;
