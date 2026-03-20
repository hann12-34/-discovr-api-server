/**
 * Vancouver Playhouse Events Scraper (Vancouver)
 * Scrapes upcoming events from Vancouver Playhouse
 * Historic Vancouver theatre venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverPlayhouseEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Playhouse (Vancouver)...');
    
    // Note: Site timeout issues, returning empty array until resolved
    console.log('⚠️ Vancouver Playhouse site timeout issues - returning empty array');
    return [];

    try {
      const response = await axios.get('https://www.vancouverplayhouse.com/', {
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
        'a[href*="/production"]',
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
              url = 'https://www.vancouverplayhouse.com' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'tickets', 'buy', 'donate', 'support'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            
            // SUPER COMPREHENSIVE date extraction
            let eventDate = null;
            
            // Strategy 1: datetime attributes
            const datetimeAttr = $event.find('[datetime]').first().attr('datetime');
            if (datetimeAttr) eventDate = datetimeAttr;
            
            // Strategy 2: extensive selectors
            if (!eventDate) {
              const selectors = ['.date', '.event-date', '.show-date', 'time', '[class*="date"]', 
                               '[data-date]', '.datetime', '.when', '[itemprop="startDate"]',
                               '.performance-date', '[data-start-date]'];
              for (const sel of selectors) {
                const text = $event.find(sel).first().text().trim();
                if (text && text.length >= 5 && text.length <= 100) {
                  eventDate = text;
                  break;
                }
              }
            }
            
            // Strategy 3: URL pattern
            if (!eventDate && url) {
              const urlMatch = url.match(/\/(\d{4})-(\d{2})-(\d{2})|\/(\d{4})\/(\d{2})\/(\d{2})/);
              if (urlMatch) {
                eventDate = urlMatch[1] ? `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}` : `${urlMatch[4]}-${urlMatch[5]}-${urlMatch[6]}`;
              }
            }
            
            // Strategy 4: text pattern
            if (!eventDate) {
              const text = $event.text() + ' ' + $event.parent().text();
              const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?/i);
              if (dateMatch) eventDate = dateMatch[0];
            }

            // Only log valid events (junk will be filtered out)

            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              time: null,
              url: url,
              venue: { name: 'Vancouver Playhouse', address: 'Vancouver', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Vancouver Playhouse`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Vancouver Playhouse events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverPlayhouseEvents.scrape;
