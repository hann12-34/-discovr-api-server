/**
 * Granville Island Events Scraper
 * Scrapes upcoming events from Granville Island
 * Vancouver's cultural district and artisan community
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const GranvilleIslandEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Granville Island...');

    try {
      const response = await axios.get('https://granvilleisland.com/events', {
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
        '.event-card',
        '.event-listing',
        'article.event',
        '.upcoming-event',
        '.card',
        'a[href*="/event"]',
        'a[href*="/events/"]',
        '.post',
        '.listing'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            // Extract event title
            let title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .card-title, .post-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://granvilleisland.com' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'shop', 'dining'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // Extract date information
            // Extract REAL date or skip event
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, time, .when, [datetime]').first().text().trim();
            if (dateText && dateText.length > 0) {
              eventDate = dateText;
            }
            
            // Skip events without real dates
            if (!eventDate) {
              return;
            }

            // Only log valid events (junk will be filtered out)

            if (eventDate) {
              eventDate = eventDate
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
                .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
                .trim();
              
              if (!/\d{4}/.test(eventDate)) {
                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth();
                const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const dateLower = eventDate.toLowerCase();
                const monthIndex = months.findIndex(m => dateLower.includes(m));
                if (monthIndex !== -1) {
                  const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                  eventDate = `${eventDate}, ${year}`;
                } else {
                  eventDate = `${eventDate}, ${currentYear}`;
                }
              }
            }

            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              time: null,
              url: url,
              venue: { name: 'Granville Island', address: '1661 Duranleau Street, Vancouver, BC V6H 3S3', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Granville Island`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Granville Island events:', error.message);
      return [];
    }
  }
};


module.exports = GranvilleIslandEvents.scrape;
