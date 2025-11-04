/**
 * BC Place Events Scraper
 * Scrapes upcoming events from BC Place Stadium
 * Vancouver's premier sports and entertainment venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const DataQualityFilter = require('../../../enhanced-data-quality-filter');

const BCPlaceEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from BC Place...');
    const filter = new DataQualityFilter();

    try {
      const response = await axios.get('https://www.bcplace.com/', {
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

      // Look for news/announcements about upcoming events and schedules
      const eventSelectors = [
        'a[href*="bc-lions"]',
        'a[href*="whitecaps"]',
        'a[href*="supercross"]',
        'a[href*="cricket"]',
        'a[href*="fifa"]',
        'a[href*="world-cup"]',
        'a[href*="schedule"]',
        'h2 a',
        'h3 a',
        '.news-item a',
        'a:contains("Schedule")',
        'a:contains("BC Lions")',
        'a:contains("Whitecaps")',
        'a:contains("Supercross")',
        'a:contains("Cricket")',
        'a:contains("FIFA")',
        'a:contains("World Cup")',
        'a:contains("2025")',
        'a:contains("2026")',
        'a:contains("INFO")',
        'a:contains("›")'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            
            const description = $event.find('.description, .excerpt, .summary, p').first().text().trim() ||
                              $(element).find('.description, .excerpt, .summary, p').first().text().trim();
            // Extract event title
            let title = $event.find('h1, h2, h3, h4, .title, .event-title, .card-title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0];

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.bcplace.com' + url;
            }

            // Skip if no meaningful title or already seen
            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'facebook', 'instagram', 'twitter', 'tickets', 'more info', 'info', 'learn more', 'faqs', 'schedule', 'starts september', 'bc lions', 'whitecaps fc', 'fifa world cup'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);

            // SUPER COMPREHENSIVE date extraction
            let eventDate = null;
            
            // Strategy 1: Try datetime attributes
            const datetimeAttr = $event.find('[datetime]').first().attr('datetime');
            if (datetimeAttr) eventDate = datetimeAttr;
            
            // Strategy 2: Try common selectors
            if (!eventDate) {
              const selectors = ['.date', '.event-date', 'time', '.datetime', '.when', '[class*="date"]'];
              for (const sel of selectors) {
                const text = $event.find(sel).first().text().trim();
                if (text && text.length >= 5 && text.length <= 100) {
                  eventDate = text;
                  break;
                }
              }
            }
            
            // Strategy 3: Extract from URL (e.g., /events/2025-01-15)
            if (!eventDate && url) {
              const urlMatch = url.match(/\/(\d{4})-(\d{2})-(\d{2})|\/(\d{4})\/(\d{2})\/(\d{2})/);
              if (urlMatch) {
                eventDate = urlMatch[1] ? `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}` : `${urlMatch[4]}-${urlMatch[5]}-${urlMatch[6]}`;
              }
            }
            
            // Strategy 4: Look in parent/sibling elements
            if (!eventDate) {
              const parentText = $event.parent().text();
              const dateMatch = parentText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?/i);
              if (dateMatch) eventDate = dateMatch[0];
            }

            // Only log valid events (junk will be filtered out)

            events.push({
              id: uuidv4(),
              title: title,
              description: description && description.length > 20 ? description : `${title} in Vancouver.`,
              date: eventDate,
              time: null,
              url: url,
              venue: { name: 'BC Place', address: '777 Pacific Boulevard, Vancouver, BC V6B 4Y8', city: 'Vancouver' },
              city: "Vancouver",
              source: "bc Place",
              location: 'Vancouver, BC',
              city: 'Vancouver',
              image: null
            });
          });
        }

        // Break after finding events with first successful selector
        if (events.length > 0) {
          break;
        }
      }

      console.log(`Found ${events.length} total events from BC Place`);
      
      // Apply data quality filtering
      const cleanedEvents = filter.filterEvents(events);
      return cleanedEvents;

    } catch (error) {
      console.error('Error scraping BC Place events:', error.message);
      return [];
    }
  }
};


module.exports = BCPlaceEvents.scrape;
