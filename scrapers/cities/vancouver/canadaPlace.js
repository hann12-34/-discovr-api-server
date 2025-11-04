/**
 * Canada Place Events Scraper
 * Scrapes upcoming events from Canada Place
 * Vancouver's iconic waterfront venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const CanadaPlaceEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Canada Place...');

    try {
      const response = await axios.get('https://www.canadaplace.ca/events', {
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
        'article.event',
        '.upcoming-event',
        '.special-event',
        'a[href*="/event/"]',
        'a[href*="/special/"]',
        'a[href*="ticketmaster"]',
        'a[href*="eventbrite"]',
        '.event'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            let title = $event.find('h1, h2, h3, .title, .event-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.canadaplace.ca' + url;
            }

            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            let eventDate = null;
            const dateText = $event.find('.date, .event-date, time').first().text().trim();
            if (dateText) {
              eventDate = dateText;
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
              venue: { name: 'Canada Place', address: '999 Canada Place, Vancouver, BC V6C 3T4', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Canada Place`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Canada Place events:', error.message);
      return [];
    }
  }
};


module.exports = CanadaPlaceEvents.scrape;
