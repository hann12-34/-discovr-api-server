/**
 * Greta Bar Events Scraper
 * Scrapes events from Greta Bar's Tribe Events WordPress API
 * URL: https://gretabar.com/wp-json/tribe/events/v1/events
 * Address: 50 W Cordova St, Vancouver, BC V6B 1C6
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const GretaBarEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Greta Bar...');

    try {
      const events = [];
      const seenUrls = new Set();
      let page = 1;
      const maxPages = 5;

      while (page <= maxPages) {
        const url = `https://gretabar.com/wp-json/tribe/events/v1/events?per_page=50&page=${page}`;

        let data;
        try {
          const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
          data = response.data;
        } catch (err) {
          if (err.response && err.response.status === 404) break;
          console.log(`  Page ${page} error: ${err.message}`);
          break;
        }

        if (!data.events || data.events.length === 0) break;

        for (const item of data.events) {
          const venue = item.venue || {};
          const venueCity = (venue.city || '').toLowerCase();

          if (venueCity !== 'vancouver') continue;

          const eventUrl = item.url || '';
          if (!eventUrl || seenUrls.has(eventUrl)) continue;
          seenUrls.add(eventUrl);

          const title = (item.title || '').replace(/&#8211;/g, '–').replace(/&#038;/g, '&').replace(/&#8217;/g, "'").trim();
          if (!title || title.length < 3) continue;

          const venueName = (venue.venue || '').trim() || 'Greta Bar';
          const address = (venue.address || '').trim();
          const fullAddress = address ? `${address}, ${venue.city || 'Vancouver'}, BC` : '50 W Cordova St, Vancouver, BC V6B 1C6';

          const startDate = item.start_date || item.utc_start_date || null;

          let description = '';
          const rawDesc = item.description || '';
          const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanDesc.length >= 20 && cleanDesc.length <= 2000) {
            description = cleanDesc.length > 1000 ? cleanDesc.substring(0, 1000) + '...' : cleanDesc;
          }

          const imageUrl = (item.image || {}).url || null;

          events.push({
            id: uuidv4(),
            title,
            url: eventUrl,
            date: startDate,
            venue: {
              name: venueName,
              address: fullAddress,
              city: 'Vancouver',
            },
            city: 'Vancouver',
            description,
            imageUrl: imageUrl || null,
            source: 'greta-bar',
          });
        }

        if (page >= (data.total_pages || 1)) break;
        page++;
        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`Found ${events.length} Greta Bar Vancouver events`);

      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid Greta Bar events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Greta Bar events:', error.message);
      return [];
    }
  }
};

module.exports = GretaBarEvents.scrape;
