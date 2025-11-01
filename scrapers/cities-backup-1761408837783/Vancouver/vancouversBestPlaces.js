/**
 * Vancouver's Best Places Events Scraper
 * Scrapes events from Vancouver's Best Places event calendar
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouversBestPlacesEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver\'s Best Places...');

    try {
      const response = await axios.get('https://vancouversbestplaces.com/events-calendar/', {
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
        '.event-item a',
        '.event-card a',
        '.event-listing a',
        '.calendar-event a',
        '.event a',
        'article a',
        '.post a',
        '.listing a',
        '.card a',
        'h2 a',
        'h3 a',
        '.title a',
        '.event-title a',
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[title]',
        '[data-testid*="event"] a',
        'a:contains("Event")',
        'a:contains("Festival")',
        'a:contains("Concert")',
        'a:contains("Show")',
        'a:contains("Performance")',
        'a:contains("Exhibition")',
        'a:contains("Market")',
        'a:contains("Fair")'
      ];

      let foundCount = 0;
      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
          foundCount += links.length;
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url) return;

          // Skip if we've already seen this URL
          if (seenUrls.has(url)) return;

          // Convert relative URLs to absolute
          if (url.startsWith('/')) {
            url = 'https://vancouversbestplaces.com' + url;
          }

          // Filter out navigation, social media, and promotional links
          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i, /\/subscribe/i,
            /\/newsletter/i, /\/advertise/i, /\/category/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          // Clean up title
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or generic titles
          if (title.length < 3 || /^(home|about|contact|search|login|more|info|read more|continue reading)$/i.test(title)) {
            console.log(`✗ Filtered out generic title: "${title}"`);
            return;
          }

          seenUrls.add(url);

          // Only log valid events (junk will be filtered out)
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: "Vancouver's Best Places", city: 'Vancouver' },
            city: 'Vancouver',
            date: dateText || 'Date TBA',  // FIXED: Extract date from page
            source: "Vancouver's Best Places"
          });
        });
      }

      console.log(`Found ${events.length} total events from Vancouver's Best Places`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver\'s Best Places events:', error.message);
      return [];
    }
  }
};


module.exports = VancouversBestPlacesEvents.scrape;
