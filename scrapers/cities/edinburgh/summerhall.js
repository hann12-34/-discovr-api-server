/**
 * Summerhall Edinburgh Events Scraper
 * URL: https://www.summerhallarts.co.uk/whats-on/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeSummerhall(city = 'Edinburgh') {
  console.log('🎭 Scraping Summerhall Edinburgh...');

  try {
    const response = await axios.get('https://www.summerhallarts.co.uk/whats-on/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    $('a[href*="/event/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;

        // Extract date from URL like /event/name/2026-01-09/
        const dateMatch = href.match(/\/(\d{4}-\d{2}-\d{2})\/?$/);
        let isoDate = null;
        if (dateMatch) {
          isoDate = dateMatch[1];
        } else {
          // Try to find date in URL path
          const altMatch = href.match(/\/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
          if (altMatch) {
            isoDate = `${altMatch[1]}-${altMatch[2]}-${altMatch[3]}`;
          }
        }
        if (!isoDate) return;

        const url = href.startsWith('http') ? href : `https://www.summerhallarts.co.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'Summerhall', address: '1 Summerhall, Edinburgh EH9 1PL', city: 'Edinburgh' },
          latitude: 55.9397,
          longitude: -3.1822,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Summerhall'
        });
      } catch (e) {}
    });

    // Dedupe
    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    // Fetch images
    for (const event of unique.slice(0, 15)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Summerhall events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Summerhall error:', error.message);
    return [];
  }
}

module.exports = scrapeSummerhall;
