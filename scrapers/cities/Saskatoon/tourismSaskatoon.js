/**
 * Tourism Saskatoon Events Scraper
 * URL: https://www.tourismsaskatoon.com/events/
 * Clubs, concerts, and stadium events in Saskatoon
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTourismSaskatoon() {
  const events = [];
  const seen = new Set();
  const BASE = 'https://www.tourismsaskatoon.com';

  try {
    const { data: html } = await axios.get(`${BASE}/events/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000
    });

    const $ = cheerio.load(html);

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

        // Extract venue from card text
        const venueEl = $(el).find('.location, .venue, .field--name-field-location').first().text().trim();
        const venue = venueEl || '';

        // Extract date text
        const dateText = $(el).find('.date, time, .field--name-field-date').first().text().replace(/\s+/g, ' ').trim();

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
          // Try simpler pattern: "Apr 8"
          const shortMatch = allText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          if (shortMatch) {
            const shortMonths = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
            const m = shortMonths[shortMatch[2].toLowerCase()];
            const year = new Date().getFullYear();
            if (m !== undefined) {
              date = new Date(year, m, parseInt(shortMatch[1])).toISOString();
            }
          }
        }

        const key = `${title}::${date || ''}`;
        if (seen.has(key)) return;
        seen.add(key);

        events.push({
          title,
          date: date || new Date().toISOString(),
          url,
          city: 'Saskatoon',
          venue: { name: venue || 'Saskatoon Venue', city: 'Saskatoon', address: 'Saskatoon, SK, Canada' }
        });
      } catch (e) {}
    });

    console.log(`Tourism Saskatoon: found ${events.length} events`);
  } catch (error) {
    console.error('Tourism Saskatoon error:', error.message);
  }

  return events;
}

module.exports = scrapeTourismSaskatoon;
