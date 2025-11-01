/**
 * Museum of Vancouver Events Scraper
 * Scrapes events from Museum of Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MuseumOfVancouverEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Museum of Vancouver...');
    
    // Note: Site redirect domain issues
    console.log('⚠️ Museum of Vancouver site redirect issues - returning empty array');
    return [];

    try {
      const response = await axios.get('https://www.museumofvancouver.ca/', {
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

      // Multiple selectors to find event links
      const eventSelectors = [
        'a[href*="/event/"]',
        'a[href*="/events/"]',
        'a[href*="/exhibition/"]',
        'a[href*="/exhibitions/"]',
        'a[href*="/program/"]',
        'a[href*="/programs/"]',
        '.event-item a',
        '.exhibition-item a',
        '.program-item a',
        '.listing a',
        '.event-listing a',
        '.exhibition-listing a',
        '.event-card a',
        '.exhibition-card a',
        'h3 a',
        'h2 a',
        'h1 a',
        '.event-title a',
        '.exhibition-title a',
        '.program-title a',
        'article a',
        '.event a',
        '.exhibition a',
        '.program a',
        'a[title]',
        '[data-testid*="event"] a',
        '[data-testid*="exhibition"] a',
        'a:contains("Exhibition")',
        'a:contains("Program")',
        'a:contains("Workshop")',
        'a:contains("Tour")',
        'a:contains("Event")',
        'a:contains("Show")',
        'a:contains("Learn")',
        'a:contains("Experience")',
        'a:contains("Discover")'
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
            url = 'https://www.museumofvancouver.ca' + url;
          }

          // Filter out navigation, social media, and promotional links
          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          // Clean up title
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or generic titles
          if (title.length < 2 || /^(home|about|contact|search|login|more|info|buy|tickets?)$/i.test(title)) {
            console.log(`✗ Filtered out generic title: "${title}"`);
            return;
          }

          seenUrls.add(url);

          // Only log valid events (junk will be filtered out)
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Museum of Vancouver', city: 'Vancouver' },
            city: city,
            date: null,
            source: 'Museum of Vancouver'
          });
        });
      }

      console.log(`Found ${events.length} total events from Museum of Vancouver`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Museum of Vancouver events:', error.message);
      return [];
    }
  }
};


module.exports = MuseumOfVancouverEvents.scrape;
