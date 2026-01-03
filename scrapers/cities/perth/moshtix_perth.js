/**
 * Moshtix Perth Events Scraper
 * URL: https://moshtix.com.au/v2/search?query=perth
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeMoshtixPerth(city = 'Perth') {
  console.log('🎫 Scraping Moshtix Perth...');

  try {
    const response = await axios.get('https://moshtix.com.au/v2/search?query=perth', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/v2/event/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const title = $el.text().trim();
        if (!title || title.length < 3 || title.length > 150) return;

        // Find date in surrounding text
        const $parent = $el.closest('div');
        const parentText = $parent.text();
        
        // Match date like "Sat 3 Jan 2026" or "Fri 9 Jan 2026"
        const dateMatch = parentText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase()];
        const year = dateMatch[3];
        const isoDate = `${year}-${month}-${day}`;

        if (new Date(isoDate) < new Date()) return;

        const url = href.startsWith('http') ? href : `https://moshtix.com.au${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          date: isoDate,
          url,
          venue: { name: 'Various Perth Venues', address: 'Perth WA', city: 'Perth' },
          latitude: -31.9505,
          longitude: 115.8605,
          city: 'Perth',
          category: 'Nightlife',
          source: 'Moshtix Perth'
        });
      } catch (e) {}
    });

    // Dedupe by title+date
    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    // Fetch images for top events
    for (const event of unique.slice(0, 30)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
        // Extract venue from page
        const venueLink = $p('a[href*="/v2/venues/"]').first().text().trim();
        if (venueLink) {
          event.venue.name = venueLink;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Moshtix Perth events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Moshtix Perth error:', error.message);
    return [];
  }
}

module.exports = scrapeMoshtixPerth;
