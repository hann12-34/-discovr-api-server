/**
 * Voodoo Rooms Edinburgh Events Scraper
 * URL: https://www.thevoodoorooms.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeVoodooRooms(city = 'Edinburgh') {
  console.log('🎸 Scraping Voodoo Rooms Edinburgh...');

  try {
    const response = await axios.get('https://www.thevoodoorooms.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    // URLs have dates like /events/event-name-DD-MM-YYYY
    $('a[href*="/events/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/events/' || href === 'https://www.thevoodoorooms.com/events') return;
        seen.add(href);

        // Extract date from URL like -04-07-2026
        const dateMatch = href.match(/(\d{2})-(\d{2})-(\d{4})$/);
        if (!dateMatch) return;

        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3];
        const isoDate = `${year}-${month}-${day}`;

        // Extract title from URL or link text
        let title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3) {
          // Try to extract from URL
          const urlParts = href.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          title = lastPart.replace(/-\d{2}-\d{2}-\d{4}$/, '').replace(/-/g, ' ').trim();
        }
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === "WHAT'S ON" || title === "What's On") return;

        const url = href.startsWith('http') ? href : `https://www.thevoodoorooms.com${href}`;

        events.push({
          id: uuidv4(),
          title: title.charAt(0).toUpperCase() + title.slice(1),
          date: isoDate,
          url,
          venue: { name: 'Voodoo Rooms', address: '19a West Register Street, Edinburgh EH2 2AA', city: 'Edinburgh' },
          latitude: 55.9534,
          longitude: -3.1908,
          city: 'Edinburgh',
          category: 'Nightlife',
          source: 'Voodoo Rooms'
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

    console.log(`  ✅ Found ${unique.length} Voodoo Rooms events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Voodoo Rooms error:', error.message);
    return [];
  }
}

module.exports = scrapeVoodooRooms;
