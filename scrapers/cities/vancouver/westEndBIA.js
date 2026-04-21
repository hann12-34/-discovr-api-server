/**
 * West End BIA Events Scraper
 * Scrapes events from West End Business Improvement Association via Tribe Events API
 * Source: https://www.westendbia.com/events
 * API: https://www.westendbia.com/wp-json/tribe/events/v1/events
 * Covers: English Bay Night Market, Vancouver Sun Run, local West End events
 */

const { spawnSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-m', '15',
    '-sL',
    '-H', 'User-Agent: Mozilla/5.0',
    '-H', 'Accept: application/json',
    url,
  ], { timeout: 20000, encoding: 'utf8' });
  if (result.error) throw result.error;
  return JSON.parse(result.stdout);
}

const WestEndBIAEvents = {
  async scrape(city) {
    console.log('🌊 Scraping West End BIA events via Tribe API...');
    try {
      const events = [];
      const seenUrls = new Set();
      let page = 1;
      const maxPages = 5;

      while (page <= maxPages) {
        const url = `https://www.westendbia.com/wp-json/tribe/events/v1/events?per_page=50&page=${page}`;
        let data;
        try {
          data = curlFetch(url);
        } catch (err) {
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
            if (code === 8211) return '\u2013';
            if (code === 38) return '&';
            if (code === 8217) return "'";
            return m;
          }).trim();
          if (!title || title.length < 3) continue;

          // Skip FIFA events — covered by dedicated fifa2026.js scraper
          if (/\bfifa\b/i.test(title)) continue;

          const startDate = item.start_date || item.utc_start_date || null;

          const venue = Array.isArray(item.venue) ? {} : (item.venue || {});
          const venueName = (venue.venue || 'West End Vancouver').trim();
          const address = (venue.address || '').trim();
          const venueCity = (venue.city || 'Vancouver').trim();
          const fullAddress = address
            ? `${address}, ${venueCity}, BC`
            : `West End, ${venueCity}, BC`;

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
            source: 'west-end-bia',
          });
        }

        if (page >= (data.total_pages || 1)) break;
        page++;
      }

      console.log(`  Found ${events.length} West End BIA events`);
      const filtered = filterEvents(events);
      console.log(`  ✅ Returning ${filtered.length} valid West End BIA events`);
      return filtered;

    } catch (error) {
      console.error('  ⚠️ West End BIA error:', error.message);
      return [];
    }
  }
};

module.exports = WestEndBIAEvents.scrape;
