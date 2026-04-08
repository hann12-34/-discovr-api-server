/**
 * Downtown Winnipeg BIZ Events Scraper
 * URL: https://downtownwinnipegbiz.com/events/list/
 * Clubs, concerts, and stadium events in Winnipeg
 * Uses Tribe Events Calendar (WordPress)
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDowntownWinnipeg() {
  const events = [];
  const seen = new Set();
  const BASE = 'https://downtownwinnipegbiz.com';

  try {
    // Scrape up to 5 pages
    for (let page = 1; page <= 5; page++) {
      const url = page === 1
        ? `${BASE}/events/list/`
        : `${BASE}/events/list/page/${page}/`;

      let html;
      try {
        const resp = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          timeout: 12000
        });
        html = resp.data;
      } catch (e) {
        break; // No more pages
      }

      const $ = cheerio.load(html);
      let found = 0;

      $('.type-tribe_events').each((i, el) => {
        try {
          const titleEl = $(el).find('a[title]').first();
          const title = titleEl.attr('title') || $(el).find('h3 a, h4 a').first().text().trim();
          const link = titleEl.attr('href') || $(el).find('h3 a, h4 a').first().attr('href');
          const dateStr = $(el).find('time').first().attr('datetime');

          if (!title || !link) return;

          const date = dateStr ? new Date(dateStr + 'T00:00:00').toISOString() : new Date().toISOString();

          const venueText = $(el).find('.tribe-events-calendar-list__event-venue-title').text().trim();

          const key = `${title}::${dateStr || ''}`;
          if (seen.has(key)) return;
          seen.add(key);

          events.push({
            title,
            date,
            url: link,
            city: 'Winnipeg',
            venue: { name: venueText || 'Winnipeg Venue', city: 'Winnipeg', address: 'Winnipeg, MB, Canada' }
          });
          found++;
        } catch (e) {}
      });

      if (found === 0) break;
    }

    console.log(`Downtown Winnipeg: found ${events.length} events`);
  } catch (error) {
    console.error('Downtown Winnipeg error:', error.message);
  }

  return events;
}

module.exports = scrapeDowntownWinnipeg;
