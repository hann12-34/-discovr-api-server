/**
 * Tourism Saskatoon Events Scraper
 * URL: https://www.tourismsaskatoon.com/events/
 * Clubs, concerts, and stadium events in Saskatoon
 * Fetches detail pages for real venue addresses
 */

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };
const BASE = 'https://www.tourismsaskatoon.com';

async function fetchDetailAddress(url) {
  try {
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const addr = $('.address, .street-address, .field-name-field-address, address')
      .first().text().replace(/\s+/g, ' ').trim();
    return addr || null;
  } catch (e) {
    return null;
  }
}

async function scrapeTourismSaskatoon() {
  const events = [];
  const seen = new Set();

  try {
    const { data: html } = await axios.get(`${BASE}/events/`, {
      headers: HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const cards = [];

    $('.event.card').each((i, el) => {
      try {
        const linkPath = $(el).find('a').first().attr('href') || '';
        const url = linkPath.startsWith('http') ? linkPath : BASE + linkPath;
        const allText = $(el).text().replace(/\s+/g, ' ').trim();

        // Extract title from URL slug
        const slug = (linkPath.match(/calendar-events\/(.+)/) || [])[1] || '';
        const title = slug
          .replace(/-\d+$/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
          .trim();

        if (!title || !url) return;

        // Extract venue name from card
        const venueName = $(el).find('.location, .venue, .field-name-field-location').first().text().trim();

        // Parse date
        let date = null;
        const dateMatch = allText.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/);
        if (dateMatch) {
          const months = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };
          const m = months[dateMatch[1].toLowerCase()];
          if (m !== undefined) {
            date = new Date(parseInt(dateMatch[3]), m, parseInt(dateMatch[2])).toISOString();
          }
        }
        if (!date) {
          const shortMatch = allText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          if (shortMatch) {
            const shortMonths = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
            const m = shortMonths[shortMatch[2].toLowerCase()];
            if (m !== undefined) {
              date = new Date(new Date().getFullYear(), m, parseInt(shortMatch[1])).toISOString();
            }
          }
        }

        if (!date) return; // Rule: no fallback date

        const key = `${title}::${date}`;
        if (seen.has(key)) return;
        seen.add(key);

        cards.push({ title, date, url, venueName });
      } catch (e) {}
    });

    // Fetch detail pages for real addresses (batched)
    for (const card of cards) {
      const address = await fetchDetailAddress(card.url);
      if (!address) continue; // Rule: skip events with no real address

      events.push({
        title: card.title,
        date: card.date,
        url: card.url,
        city: 'Saskatoon',
        venue: {
          name: card.venueName || address.split(',')[0].trim(),
          city: 'Saskatoon',
          address
        }
      });
    }

    console.log(`Tourism Saskatoon: found ${events.length} events`);
  } catch (error) {
    console.error('Tourism Saskatoon error:', error.message);
  }

  return events;
}

module.exports = scrapeTourismSaskatoon;
