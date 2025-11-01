/**
 * Coquitlam Park Theatre Scraper
 * Scrapes events from Coquitlam Park Theatre
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const CoqParkTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Coquitlam Park Theatre...');

    try {
      const response = await axios.get('https://www.coquitlam.ca/recreation-culture/arts-and-culture', {
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
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/show"]',
        'a[href*="/performance"]',
        '.event-item a',
        '.show-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Show")',
        'a:contains("Performance")',
        'a:contains("Theatre")',
        'a:contains("Play")',
        'a:contains("Concert")',
        'a:contains("Musical")',
        'a:contains("Comedy")',
        'a:contains("Dance")'
      ];

      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url || seenUrls.has(url)) return;

          if (url.startsWith('/')) {
            url = 'https://www.coquitlam.ca' + url;
          }

          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i,
            /\/about/i, /\/contact/i, /\/home/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) return;

          title = title.replace(/\s+/g, ' ').trim();
          if (title.length < 3) return;

          seenUrls.add(url);
          // Only log valid events (junk will be filtered out)
          
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Coquitlam Park Theatre', address: 'Vancouver', city: 'Vancouver' },
            city: 'Coquitlam',
            date: dateText || 'Date TBA',  // FIXED: Extract date from page
            source: 'Coquitlam Park Theatre'
          });
        });
      }

      console.log(`Found ${events.length} total events from Coquitlam Park Theatre`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Coquitlam Park Theatre events:', error.message);
      return [];
    }
  }
};


module.exports = CoqParkTheatreEvents.scrape;
