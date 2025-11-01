/**
 * Museum of Anthropology Events Scraper (Vancouver)
 * Scrapes upcoming events from UBC Museum of Anthropology
 * Vancouver museum with cultural events and exhibitions
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const MuseumOfAnthropologyEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Museum of Anthropology (Vancouver)...');

    try {
      const response = await axios.get('https://moa.ubc.ca/events/', {
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
      const seenTitles = new Set();

      // Multiple selectors for different event layouts
      const eventSelectors = [
        '.event-item',
        '.event-card',
        '.exhibition-item',
        'article.event',
        'article.exhibition',
        '.upcoming-event',
        '.card',
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/exhibition"]',
        'a[href*="/exhibitions/"]',
        '.post',
        '.listing',
        '.event',
        '.exhibition'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            // Extract event title
            let title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .exhibition-title, .card-title, .post-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://moa.ubc.ca' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Skip duplicate titles
            if (seenTitles.has(title)) {
              return;
            }
            seenTitles.add(title);
            
            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'tickets', 'buy', 'donate', 'support', 'rental', 'shows', 'events', 'exhibitions'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // Extract date information
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, .exhibition-date, time, .datetime, .when').first().text().trim();
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
              venue: { name: 'Museum of Anthropology', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Museum of Anthropology`);
      return events;

    } catch (error) {
      console.error('Error scraping Museum of Anthropology events:', error.message);
      return [];
    }
  }
};


module.exports = MuseumOfAnthropologyEvents.scrape;
