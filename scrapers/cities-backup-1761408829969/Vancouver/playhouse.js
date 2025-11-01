/**
 * Vancouver Playhouse Events Scraper
 * Scrapes upcoming events from Vancouver Playhouse Theatre Centre
 * Major performing arts venue in Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const VancouverPlayhouseEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Playhouse...');

    try {
      const response = await axios.get('https://vancouvercivictheatres.com/venues/vancouver-playhouse/events', {
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
      const seenSlugs = new Set();

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
              url = 'https://vancouvercivictheatres.com' + url;
            }

            // Extract slug for deduplication
            let slug = '';
            if (url) {
              const urlParts = url.split('/');
              slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url) || seenSlugs.has(slug)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'book now', 'tickets'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);
            seenSlugs.add(slug);

            // Extract date information
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, time, .datetime, .when').first().text().trim();
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
              venue: { name: 'Vancouver Playhouse', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Vancouver Playhouse`);
      return events;

    } catch (error) {
      console.error('Error scraping Vancouver Playhouse events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverPlayhouseEvents.scrape;
