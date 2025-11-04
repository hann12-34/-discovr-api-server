/**
 * Malkin Bowl Events Scraper
 * Scrapes events from Malkin Bowl in Stanley Park
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MalkinBowlEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Malkin Bowl (Stanley Park)...');

    try {
      const response = await axios.get('https://www.malkinbowl.com/upcoming/', {
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

      // Get event containers and take ONE link per container to avoid duplicates
      const eventContainers = $('.eventlist-event');
      
      console.log(`Found ${eventContainers.length} events from Malkin Bowl`);
      
      eventContainers.each((index, container) => {
        const $container = $(container);
        // Get the first link from this event container
        const $link = $container.find('a[href*="/upcoming/"]').filter((i, el) => {
          const href = $(el).attr('href');
          return href && href.match(/\/upcoming\/\d{4}\/\d{1,2}\/\d{1,2}/) && !href.includes('?format=');
        }).first();
        
        if (!$link.length) return;
        
        let title = $container.find('.eventlist-title').text().trim();
        let url = $link.attr('href');

          if (!title || !url) return;

          // Skip if we've already seen this URL
          if (seenUrls.has(url)) return;

          // Convert relative URLs to absolute
          if (url.startsWith('/')) {
            url = 'https://www.malkinbowl.com' + url;
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

          // Extract date from the event container
          let dateText = null;
          const dateEl = $container.find('.event-date, .eventlist-meta-date, time, [class*="date"]').first();
          if (dateEl.length) {
            dateText = dateEl.text().trim();
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { 
              name: 'Malkin Bowl', 
              address: '610 Pipeline Road, Vancouver, BC V6G 1Z4', 
              city: 'Vancouver' 
            },
            city: city,
            date: dateText || null,
            source: 'Malkin Bowl',
            category: 'Concert'
          });
        });

      console.log(`Found ${events.length} total events from Malkin Bowl`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Malkin Bowl events:', error.message);
      return [];
    }
  }
};


module.exports = MalkinBowlEvents.scrape;
