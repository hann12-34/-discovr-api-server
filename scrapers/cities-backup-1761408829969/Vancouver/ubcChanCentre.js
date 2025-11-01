/**
 * UBC Chan Centre Events Scraper (Vancouver)
 * Scrapes upcoming events from UBC Chan Centre for the Performing Arts
 * Vancouver university performing arts venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const UbcChanCentreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from UBC Chan Centre (Vancouver)...');

    try {
      const response = await axios.get('https://chancentre.com/events/', {
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
        '.show-item',
        'article.event',
        'article.show',
        '.upcoming-event',
        '.card',
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/show"]',
        'a[href*="/performance"]',
        '.post',
        '.listing',
        '.event',
        '.show'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            // Extract event title
            let title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .show-title, .card-title, .post-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://chancentre.com' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Skip if title IS the date/time - that's navigation, not an event
            const dateTimePatterns = [
              /(\w{3}\s+\w{3}\s+\d{1,2})\s*\/\s*(\d{4})\s*\/\s*\d{1,2}:\d{2}(am|pm)?/i, // "Sun Oct 19 / 2025 / 7pm"
              /(\w{3}\s+\d{1,2},\s+\w{3}\s+\d{1,2})\s*\/\s*(\d{4})/i, // "Sep 20, Sep 21 / 2025"
              /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i, // "October 2025"
              /^what's\s+on$/i
            ];
            
            if (dateTimePatterns.some(pattern => pattern.test(title))) {
              return; // This is just a date/time/navigation, not an event title
            }
            
            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'tickets', 'buy', 'donate', 'support', 'rental', 'past events', 'ubc school of music', 'chan centre presents', 'chan centre exp', 'chan centre', 'telus studio theatre', 'info', 'next', 'chan shun concert hall', 'old auditorium', 'roy barnett recital hall', 'inspired at the chan'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // Extract date information
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, .show-date, time, .datetime, .when').first().text().trim();
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
              venue: { name: 'UBC Chan Centre', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from UBC Chan Centre`);
      return events;

    } catch (error) {
      console.error('Error scraping UBC Chan Centre events:', error.message);
      return [];
    }
  }
};


module.exports = UbcChanCentreEvents.scrape;
