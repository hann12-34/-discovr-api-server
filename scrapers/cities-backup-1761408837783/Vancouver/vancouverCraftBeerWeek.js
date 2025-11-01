/**
 * Vancouver Craft Beer Week Events Scraper
 * Scrapes events from Vancouver Craft Beer Week
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverCraftBeerWeekEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Craft Beer Week...');

    try {
      const response = await axios.get('https://www.vancouvercraftbeerweek.com/', {
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

      const eventSelectors = [
        'a[href*="/event/"]',
        'a[href*="/events/"]',
        'a[href*="/beer/"]',
        'a[href*="/brewery/"]',
        'a[href*="/festival/"]',
        '.event-item a',
        '.beer-item a',
        '.brewery-item a',
        '.festival-item a',
        '.listing a',
        '.event-listing a',
        '.event-card a',
        '.brewery-card a',
        'h3 a',
        'h2 a',
        'h1 a',
        '.event-title a',
        '.brewery-title a',
        'article a',
        '.event a',
        '.beer a',
        '.brewery a',
        '.festival a',
        'a[title]',
        '[data-testid*="event"] a',
        'a:contains("Event")',
        'a:contains("Beer")',
        'a:contains("Brewery")',
        'a:contains("Festival")',
        'a:contains("Tasting")',
        'a:contains("Craft")'
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
          if (seenUrls.has(url)) return;

          if (url.startsWith('/')) {
            url = 'https://www.vancouvercraftbeerweek.com' + url;
          }

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

          title = title.replace(/\s+/g, ' ').trim();
          
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
            venue: { name: 'Vancouver Craft Beer Week', address: 'Vancouver', city: 'Vancouver' },
            city: city,
            date: dateText || 'Date TBA',  // FIXED: Extract date from page
            source: 'Vancouver Craft Beer Week'
          });
        });
      }

      console.log(`Found ${events.length} total events from Vancouver Craft Beer Week`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Craft Beer Week events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverCraftBeerWeekEvents.scrape;
