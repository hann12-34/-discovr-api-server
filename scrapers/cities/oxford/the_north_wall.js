/**
 * The North Wall Oxford Events Scraper
 * URL: https://www.thenorthwall.com/whats-on/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeNorthWall(city = 'Oxford') {
  console.log('🎨 Scraping The North Wall...');

  try {
    const response = await axios.get('https://www.thenorthwall.com/whats-on/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/whats-on/' || href.endsWith('/whats-on')) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === "What's On" || title === 'View all') return;

        const parentText = $el.parent().text() + ' ' + $el.closest('div').text();
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        
        let isoDate = null;
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3] || '2026';
          isoDate = `${year}-${month}-${day}`;
        }

        const url = href.startsWith('http') ? href : `https://www.thenorthwall.com${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'The North Wall', address: 'South Parade, Oxford OX2 7JN', city: 'Oxford' },
          latitude: 51.7615,
          longitude: -1.2685,
          city: 'Oxford',
          category: 'Arts',
          source: 'The North Wall'
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

    for (const event of unique) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} North Wall events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ North Wall error:', error.message);
    return [];
  }
}

module.exports = scrapeNorthWall;
