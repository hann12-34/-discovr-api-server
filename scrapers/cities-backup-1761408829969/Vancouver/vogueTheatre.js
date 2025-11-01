/**
 * Vogue Theatre Events Scraper
 * Scrapes upcoming events from Vogue Theatre
 * Vancouver's historic theatre and live music venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const VogueTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vogue Theatre...');

    try {
      // Vogue Theatre uses external ticketing (AdmitOne) and doesn't list events directly on their site
      // Return empty array as they redirect to external ticket platforms
      console.log('Vogue Theatre uses external ticketing platform - no events available for scraping');
      return [];
      
      const response = await axios.get('https://admitone.com/search?venue=vogue-theatre', {
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
        '.show-listing',
        '.event-card', 
        'article.event',
        '.upcoming-event',
        '.concert-listing',
        '.theatre-event',
        'a[href*="/event/"]',
        'a[href*="/show/"]',
        'a[href*="/concert/"]',
        'a[href*="ticketmaster"]',
        'a[href*="eventbrite"]',
        '.event',
        '.show'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            // Extract event details
            let title = $event.find('h1, h2, h3, .title, .event-title, .show-title, .artist-name').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://voguetheatre.com' + url;
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
            const dateText = $event.find('.date, .event-date, .show-date, time').first().text().trim();
            if (dateText) {
              eventDate = dateText;
            }

            // Extract time information
            let eventTime = null;
            const timeText = $event.find('.time, .show-time, .door-time').first().text().trim();
            if (timeText) {
              eventTime = timeText;
            }

            // Only log valid events (junk will be filtered out)

            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              time: eventTime,
              url: url,
              venue: { name: 'Vogue Theatre', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Vogue Theatre`);
      return events;

    } catch (error) {
      console.error('Error scraping Vogue Theatre events:', error.message);
      return [];
    }
  }
};


module.exports = VogueTheatreEvents.scrape;
