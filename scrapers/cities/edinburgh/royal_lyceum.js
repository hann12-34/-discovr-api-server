/**
 * Royal Lyceum Theatre Edinburgh Events Scraper
 * URL: https://lyceum.org.uk/whats-on/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeRoyalLyceum(city = 'Edinburgh') {
  console.log('🎭 Scraping Royal Lyceum Theatre...');

  try {
    const response = await axios.get('https://lyceum.org.uk/whats-on/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/whats-on/' || href.endsWith('/whats-on')) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === "What's on" || title === 'List of Events') return;

        const url = href.startsWith('http') ? href : `https://lyceum.org.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: '2026-02-15',
          url,
          venue: { name: 'Royal Lyceum Theatre', address: '30b Grindlay St, Edinburgh EH3 9AX', city: 'Edinburgh' },
          latitude: 55.9470,
          longitude: -3.2050,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Royal Lyceum Theatre'
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

    for (const event of unique.slice(0, 25)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Royal Lyceum events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Royal Lyceum error:', error.message);
    return [];
  }
}

module.exports = scrapeRoyalLyceum;
