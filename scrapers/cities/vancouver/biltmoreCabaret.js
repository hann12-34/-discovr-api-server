/**
 * Biltmore Cabaret Events Scraper (Vancouver)
 * Scrapes upcoming events from Biltmore Cabaret
 * Vancouver live music venue and cabaret
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const BiltmoreCabaretEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Biltmore Cabaret (Vancouver)...');

    try {
      // Try main page instead of /event/ which 404s
      const response = await axios.get('https://www.biltmorecabaret.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 60000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Multiple selectors for different event layouts
      const eventSelectors = [
        '.event_card',
        '.eec_event_card',
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
              url = 'https://biltmorecabaret.com' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'tickets', 'buy', 'table', 'bottle', 'vip'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // Extract date information
            let eventDate = null;
            const dateText = $event.find('.date, .event-date, .show-date, time, .datetime, .when, .eec_event_date').first().text().trim();
            if (dateText) {
              // Try to parse date
              const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i);
              if (dateMatch) {
                const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
                const month = months[dateMatch[1].toLowerCase().substring(0,3)];
                const day = dateMatch[2].padStart(2, '0');
                const year = dateMatch[3];
                eventDate = `${year}-${month}-${day}`;
              }
            }

            // Only log valid events (junk will be filtered out)

            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              time: null,
              url: url,
              venue: { name: 'Biltmore Cabaret', address: '2755 Prince Edward Street, Vancouver, BC V5T 3L5', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Biltmore Cabaret`);
      return events;

    } catch (error) {
      console.error('Error scraping Biltmore Cabaret events:', error.message);
      return [];
    }
  }
};


module.exports = BiltmoreCabaretEvents.scrape;
