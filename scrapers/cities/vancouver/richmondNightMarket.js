/**
 * Richmond Night Market Events Scraper
 * Scrapes upcoming events from Richmond Night Market
 * Vancouver's premier night market experience
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const RichmondNightMarketEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Richmond Night Market...');

    try {
      const response = await axios.get('https://richmondnightmarket.com/', {
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

      // Multiple selectors for different event layouts
      const eventSelectors = [
        '.event-item',
        '.market-event',
        '.event-card', 
        'article.event',
        '.upcoming-event',
        '.special-event',
        'a[href*="/event/"]',
        'a[href*="/special/"]',
        'a[href*="ticketmaster"]',
        'a[href*="eventbrite"]',
        '.event',
        '.performance'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            // Extract event details
            let title = $event.find('h1, h2, h3, .title, .event-title, .performance-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://richmondnightmarket.com' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // Extract date information
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, time, .market-date').first().text().trim();
            if (dateText) {
              eventDate = dateText;
            }

            // Only log valid events (junk will be filtered out)

            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              time: null,
              url: url,
              venue: { name: 'Richmond Night Market', address: '12631 Vulcan Way, Richmond, BC V6V 1J7', city: 'Vancouver' },
              location: 'Richmond, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Richmond Night Market`);
      return events;

    } catch (error) {
      console.error('Error scraping Richmond Night Market events:', error.message);
      return [];
    }
  }
};


module.exports = RichmondNightMarketEvents.scrape;
