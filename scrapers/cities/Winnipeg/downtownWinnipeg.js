/**
 * Downtown Winnipeg BIZ Events Scraper
 * URL: https://downtownwinnipegbiz.com/events/list/
 * Clubs, concerts, and stadium events in Winnipeg
 * Uses Tribe Events Calendar (WordPress)
 * Fetches detail pages for real venue names and addresses
 */

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };
const BASE = 'https://downtownwinnipegbiz.com';

async function fetchDetailVenue(url) {
  try {
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const venueName = $('.tribe-venue').text().replace(/\s+/g, ' ').trim()
      || $('.tribe-events-single-section-title').first().text().replace(/\s+/g, ' ').trim();
    const rawAddr = $('address').text().replace(/\s+/g, ' ').replace(/\+ Google Map/gi, '').trim()
      || $('.tribe-venue-location address').text().replace(/\s+/g, ' ').replace(/\+ Google Map/gi, '').trim();
    return { venueName: venueName || null, address: rawAddr || null };
  } catch (e) {
    return { venueName: null, address: null };
  }
}

async function scrapeDowntownWinnipeg() {
  const events = [];
  const seen = new Set();

  try {
    const cards = [];

    // Scrape up to 5 pages
    for (let page = 1; page <= 5; page++) {
      const url = page === 1
        ? `${BASE}/events/list/`
        : `${BASE}/events/list/page/${page}/`;

      let html;
      try {
        const resp = await axios.get(url, { headers: HEADERS, timeout: 12000 });
        html = resp.data;
      } catch (e) {
        break;
      }

      const $ = cheerio.load(html);
      let found = 0;

      $('.type-tribe_events').each((i, el) => {
        try {
          const titleEl = $(el).find('a[title]').first();
          const title = titleEl.attr('title') || $(el).find('h3 a, h4 a').first().text().trim();
          const link = titleEl.attr('href') || $(el).find('h3 a, h4 a').first().attr('href');
          const dateStr = $(el).find('time').first().attr('datetime');

          if (!title || !link || !dateStr) return;

          const date = new Date(dateStr + 'T00:00:00').toISOString();

          const key = `${title}::${dateStr}`;
          if (seen.has(key)) return;
          seen.add(key);

          cards.push({ title, date, link });
          found++;
        } catch (e) {}
      });

      if (found === 0) break;
    }

    // Fetch detail pages for real venue + address
    for (const card of cards) {
      const { venueName, address } = await fetchDetailVenue(card.link);
      if (!address) continue; // Rule: skip events with no real address

      events.push({
        title: card.title,
        date: card.date,
        url: card.link,
        city: 'Winnipeg',
        venue: {
          name: venueName || address.split(',')[0].trim(),
          city: 'Winnipeg',
          address
        }
      });
    }

    console.log(`Downtown Winnipeg: found ${events.length} events`);
  } catch (error) {
    console.error('Downtown Winnipeg error:', error.message);
  }

  return events;
}

module.exports = scrapeDowntownWinnipeg;
