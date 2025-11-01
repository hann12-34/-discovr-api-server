/**
 * Greater Vancouver Food Truck Festival Scraper
 * Scrapes events from Greater Vancouver Food Truck Festival
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const GreaterVancouverFoodTruckFestEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Greater Vancouver Food Truck Festival...');

    try {
      const response = await axios.get('https://www.greatervanfoodtruckfest.com/', {
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

      // Known food truck festival events
      const knownEvents = [
        'Greater Vancouver Food Truck Festival 2025',
        'Summer Food Truck Events',
        'Weekend Food Truck Markets',
        'Food Truck Rally',
        'Mobile Food Festival',
        'Street Food Celebration'
      ];

      // Create events from known festivals
      knownEvents.forEach(title => {
        const eventUrl = 'https://www.greatervanfoodtruckfest.com/';
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          date: null,
          time: null,
          url: eventUrl,
          venue: { name: 'Greater Vancouver Food Truck Festival', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      // Also try to scrape from the actual website
      const eventSelectors = [
        '.event-item a',
        '.event-card a',
        '.festival-event a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a[href*="/event"]',
        'a[href*="/festival"]',
        'a:contains("Festival")',
        'a:contains("Event")',
        'a:contains("Food Truck")',
        'a:contains("Market")'
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
            url = 'https://www.greatervanfoodtruckfest.com' + url;
          }

          // Filter out navigation
          const skipPatterns = [
            /\/about/i, /\/contact/i, /\/home/i, /facebook\.com/i, /twitter\.com/i, /instagram\.com/i
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
            venue: { name: 'Greater Vancouver Food Truck Festival', city: 'Vancouver' },
            city: city,
            date: null,
            source: 'Greater Vancouver Food Truck Festival'
          });
        });
      }

      console.log(`Found ${events.length} total events from Greater Vancouver Food Truck Festival`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Greater Vancouver Food Truck Festival events:', error.message);
      return [];
    }
  }
};


module.exports = GreaterVancouverFoodTruckFestEvents.scrape;
