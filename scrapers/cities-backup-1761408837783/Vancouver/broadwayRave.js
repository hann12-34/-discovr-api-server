/**
 * Broadway Rave Events Scraper
 * Scrapes electronic music and rave events from Broadway Rave
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BroadwayRaveEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Broadway Rave...');

    try {
      const response = await axios.get('https://broadwayrave.com/', {
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
        '.rave-event a',
        '.party-listing a',
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
        'a[href*="/party"]',
        'a[href*="/rave"]',
        'a[title]',
        '[data-testid*="event"] a',
        'a:contains("Event")',
        'a:contains("Rave")',
        'a:contains("Party")',
        'a:contains("DJ")',
        'a:contains("Electronic")',
        'a:contains("Dance")',
        'a:contains("Techno")',
        'a:contains("House")',
        'a:contains("Trance")',
        'a:contains("Bass")',
        'a:contains("Night")',
        'a:contains("Club")'
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
            url = 'https://broadwayrave.com' + url;
          }

          // Filter out navigation, social media, and promotional links
          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i, /\/subscribe/i,
            /\/newsletter/i, /\/advertise/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          // Clean up title
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or generic titles
          if (title.length < 3 || /^(home|about|contact|search|login|more|info|read more)$/i.test(title)) {
            console.log(`✗ Filtered out generic title: "${title}"`);
            return;
          }

          seenUrls.add(url);

          // Only log valid events (junk will be filtered out)
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Broadway Rave', address: 'Vancouver', city: 'Vancouver' },
            city: city,
            date: dateText || 'Date TBA',  // FIXED: Extract date from page
            source: 'Broadway Rave'
          });
        });
      }

      console.log(`Found ${events.length} total events from Broadway Rave`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Broadway Rave events:', error.message);
      return [];
    }
  }
};


module.exports = BroadwayRaveEvents.scrape;
