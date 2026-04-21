/**
 * Coastal Jazz Festival Scraper
 * Scrapes events from Coastal Jazz & Blues Society via Tribe Events API
 * Source: https://www.coastaljazz.ca/events/
 * API: https://www.coastaljazz.ca/wp-json/tribe/events/v1/events
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const CoastalJazzEvents = {
  async scrape(city) {
    console.log('🎷 Scraping Coastal Jazz Festival events via Tribe API...');
    try {
      const events = [];
      const seenUrls = new Set();
      let page = 1;
      const maxPages = 5;

      while (page <= maxPages) {
        const url = `https://www.coastaljazz.ca/wp-json/tribe/events/v1/events?per_page=50&page=${page}`;
        let data;
        try {
          const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
          data = response.data;
        } catch (err) {
          if (err.response?.status === 404) break;
          console.log(`  Page ${page} error: ${err.message}`);
          break;
        }

        if (!data.events || data.events.length === 0) break;

        for (const item of data.events) {
          const eventUrl = item.url || '';
          if (!eventUrl || seenUrls.has(eventUrl)) continue;
          seenUrls.add(eventUrl);

          const title = (item.title || '').replace(/&#[0-9]+;/g, (m) => {
            const code = parseInt(m.slice(2, -1));
            return code === 8211 ? '–' : code === 38 ? '&' : code === 8217 ? "'" : code === 8220 ? '"' : code === 8221 ? '"' : m;
          }).trim();
          if (!title || title.length < 3) continue;

          const startDate = item.start_date || item.utc_start_date || null;

          const venue = Array.isArray(item.venue) ? {} : (item.venue || {});
          const venueName = (venue.venue || 'Coastal Jazz Festival').trim();
          const address = (venue.address || '').trim();
          const venueCity = (venue.city || 'Vancouver').trim();
          const fullAddress = address ? `${address}, ${venueCity}, BC` : `${venueCity}, BC`;

          if (!fullAddress || fullAddress.length < 5) continue;

          let description = '';
          const rawDesc = item.description || '';
          const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanDesc.length >= 20) {
            description = cleanDesc.length > 1000 ? cleanDesc.slice(0, 1000) + '...' : cleanDesc;
          }

          const imageUrl = (item.image || {}).url || null;

          events.push({
            id: uuidv4(),
            title,
            url: eventUrl,
            date: startDate,
            venue: { name: venueName, address: fullAddress, city: 'Vancouver' },
            city: 'Vancouver',
            description,
            imageUrl,
            source: 'coastal-jazz',
          });
        }

        if (page >= (data.total_pages || 1)) break;
        page++;
        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`  Found ${events.length} Coastal Jazz events`);
      const filtered = filterEvents(events);
      console.log(`  ✅ Returning ${filtered.length} valid Coastal Jazz events`);
      return filtered;

    } catch (error) {
      console.error('  ⚠️ Coastal Jazz error:', error.message);
      return [];
    }
  }
};

module.exports = CoastalJazzEvents.scrape;
