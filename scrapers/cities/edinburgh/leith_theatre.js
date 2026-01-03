/**
 * Leith Theatre Edinburgh Events Scraper
 * URL: http://www.leiththeatre.co.uk/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeLeithTheatre(city = 'Edinburgh') {
  console.log('🎭 Scraping Leith Theatre...');

  try {
    const response = await axios.get('http://www.leiththeatre.co.uk/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    $('a[href*="/upcoming-events/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;

        const url = href.startsWith('http') ? href : `http://www.leiththeatre.co.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: '2026-02-15',
          url,
          venue: { name: 'Leith Theatre', address: '28-30 Ferry Road, Edinburgh EH6 4AE', city: 'Edinburgh' },
          latitude: 55.9712,
          longitude: -3.1792,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Leith Theatre'
        });
      } catch (e) {}
    });

    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    for (const event of unique.slice(0, 10)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Leith Theatre events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Leith Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeLeithTheatre;
