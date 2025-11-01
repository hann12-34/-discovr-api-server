/**
 * Vanier Park Events Scraper
 * Scrapes upcoming events from Vanier Park venues
 * Including Museum of Vancouver, HR MacMillan Space Centre, Maritime Museum
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const VanierParkEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vanier Park venues...');

    const events = [];
    const seenUrls = new Set();

    const venues = [
      {
        name: 'Museum of Vancouver',
        url: 'https://museumofvancouver.ca/events',
        baseUrl: 'https://museumofvancouver.ca'
      },
      {
        name: 'Vancouver Maritime Museum', 
        url: 'https://www.vancouvermaritimemuseum.com/events',
        baseUrl: 'https://www.vancouvermaritimemuseum.com'
      }
    ];

    for (const venue of venues) {
      try {
        console.log(`Scraping ${venue.name}...`);
        
        const response = await axios.get(venue.url, {
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

        // Multiple selectors for different event layouts
        const eventSelectors = [
          '.event-item',
          '.event-card',
          '.event-listing',
          'article.event',
          '.upcoming-event',
          'a[href*="/event"]',
          'a[href*="/events/"]',
          '.card',
          '.post'
        ];

        for (const selector of eventSelectors) {
          const eventElements = $(selector);
          if (eventElements.length > 0) {
            console.log(`${venue.name}: Found ${eventElements.length} events with selector: ${selector}`);

            eventElements.each((i, element) => {
              const $event = $(element);
              
              // Extract event title
              let title = $event.find('h1, h2, h3, h4, .title, .event-title, .card-title, .post-title').first().text().trim() ||
                         $event.find('a').first().text().trim() ||
                         $event.text().trim().split('\n')[0];

              let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
              if (url && !url.startsWith('http')) {
                url = venue.baseUrl + url;
              }

              // Skip if no meaningful title or already seen
              if (!title || title.length < 3 || seenUrls.has(url)) {
                return;
              }

              // Filter out navigation and non-event links
              const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all'];
              if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
                return;
              }

              seenUrls.add(url);

              // Extract date information
              let eventDate = null;
              const dateText = $event.find('.date, .event-date, time, .datetime, .event-time').first().text().trim();
              if (dateText) {
                eventDate = dateText;
              }

              console.log(`✓ ${venue.name}: ${title}`);

              events.push({
                id: uuidv4(),
                title: title,
                date: eventDate,
                time: null,
                url: url,
                venue: venue.name,
                location: 'Vancouver, BC',
                description: null,
                image: null
              });
            });
          }
        }

      } catch (error) {
        console.error(`Error scraping ${venue.name}:`, error.message);
        continue;
      }
    }

    console.log(`Found ${events.length} total events from Vanier Park venues`);
    return events;
  }
};


module.exports = VanierParkEvents.scrape;
