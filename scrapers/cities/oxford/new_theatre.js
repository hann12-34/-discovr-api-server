/**
 * New Theatre Oxford Events Scraper
 * URL: https://www.atgtickets.com/venues/new-theatre-oxford/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeNewTheatre(city = 'Oxford') {
  console.log('🎭 Scraping New Theatre Oxford...');

  try {
    const response = await axios.get('https://www.atgtickets.com/venues/new-theatre-oxford/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/new-theatre-oxford/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href.includes('/calendar')) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === 'Buy tickets' || title === 'More info' || title === 'New Theatre Oxford') return;

        // Find date in surrounding text
        const parentText = $el.parent().text() + ' ' + $el.closest('div').text();
        const dateMatch = parentText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})?/i);
        
        let isoDate = '2026-03-01';
        if (dateMatch) {
          const day = dateMatch[2].padStart(2, '0');
          const month = months[dateMatch[3].toLowerCase().substring(0, 3)];
          const year = dateMatch[4] || '2026';
          isoDate = `${year}-${month}-${day}`;
        }

        const url = href.startsWith('http') ? href : `https://www.atgtickets.com${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'New Theatre Oxford', address: 'George Street, Oxford OX1 2AG', city: 'Oxford' },
          latitude: 51.7535,
          longitude: -1.2585,
          city: 'Oxford',
          category: 'Arts',
          source: 'New Theatre Oxford'
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

    console.log(`  ✅ Found ${unique.length} New Theatre Oxford events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ New Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeNewTheatre;
