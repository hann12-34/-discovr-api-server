/**
 * Vancouver Art Gallery Events Scraper
 * Scrapes upcoming events from Vancouver Art Gallery
 * Vancouver's premier art museum and cultural institution
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverArtGalleryEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Art Gallery...');

    try {
      const response = await axios.get('https://www.vanartgallery.bc.ca/events', {
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
        '.program-item',
        '.card',
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/program"]',
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
            let title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .card-title, .post-title, .program-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.vanartgallery.bc.ca' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'read more', 'view all', 'shop', 'visit', 'donate'];
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
              venue: { name: 'Vancouver Art Gallery', address: 'Vancouver', city: 'Vancouver' },
              city: "Vancouver",
              source: "vancouver Art Gallery",
              location: 'Vancouver, BC',
              description: null,
              image: null,
              source: 'Vancouver Art Gallery',
              city: 'Vancouver'
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Vancouver Art Gallery`);
      
      // Fetch dates for events without dates
      const eventsWithoutDates = events.filter(e => !e.date);
      if (eventsWithoutDates.length > 0) {
        console.log(`Fetching dates for ${eventsWithoutDates.length} events...`);
        for (const event of eventsWithoutDates) {
          try {
            if (!event.url || !event.url.startsWith('http')) continue;
            const eventPage = await axios.get(event.url, {headers: {'User-Agent': 'Mozilla/5.0'}, timeout: 10000});
            const $ = cheerio.load(eventPage.data);
            const dateText = $('.date, .event-date, time, [datetime]').first().text().trim();
            if (dateText) {
              event.date = dateText;
              console.log(`✓ Found date for "${event.title}": ${dateText}`);
            }
          } catch (err) {}
        }
      }
      
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Vancouver Art Gallery events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverArtGalleryEvents.scrape;
