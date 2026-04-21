/**
 * Theatre Calgary Events Scraper
 * URL: https://www.theatrecalgary.com/shows/
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS_LONG = { january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
  july:'07',august:'08',september:'09',october:'10',november:'11',december:'12' };

function parseDateLong(raw) {
  // "Wednesday, April 15" → need year inference; or "May 3, 2026"
  const withYear = raw.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (withYear) return `${withYear[3]}-${MONTHS_LONG[withYear[1].toLowerCase()]}-${withYear[2].padStart(2,'0')}`;
  const noYear = raw.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i);
  if (noYear) {
    const m = MONTHS_LONG[noYear[1].toLowerCase()];
    const d = noYear[2].padStart(2,'0');
    const now = new Date();
    const year = parseInt(m) < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    return `${year}-${m}-${d}`;
  }
  return null;
}

async function scrape(city = 'Calgary') {
  console.log('🎭 Scraping Theatre Calgary events...');

  try {
    const response = await axios.get('https://www.theatrecalgary.com/shows/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();
    const today = new Date().toISOString().slice(0, 10);

    // Shows are in the showtimes sidebar .show divs
    // Each .show has: .title span (name), a.cta (link), .date divs (showtimes)
    $('.show').each((i, el) => {
      const $e = $(el);
      const title = $e.find('.title span').first().text().trim();
      if (!title || title.length < 3) return;

      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      const relHref = $e.find('a.cta').first().attr('href') || '';
      const url = relHref.startsWith('http') ? relHref : `https://www.theatrecalgary.com${relHref}`;

      // First upcoming date from .date elements
      const dateRaw = $e.find('.date').first().text().trim();
      const dateStr = parseDateLong(dateRaw);
      if (!dateStr || dateStr < today) return;

      events.push({
        id: uuidv4(),
        title,
        url,
        date: dateStr,
        description: '',
        imageUrl: null,
        venue: {
          name: 'Theatre Calgary',
          address: '220 9 Ave SE, Calgary, AB T2G 5C4',
          city: 'Calgary',
        },
        city,
        source: 'theatre-calgary',
      });
    });

    console.log(`✅ Theatre Calgary: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('  ⚠️ Theatre Calgary error:', error.message);
    return [];
  }
}

module.exports = scrape;
