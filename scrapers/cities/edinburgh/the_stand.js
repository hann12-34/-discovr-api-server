/**
 * The Stand Comedy Club Edinburgh Events Scraper
 * URL: https://www.thestand.co.uk/edinburgh
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheStand(city = 'Edinburgh') {
  console.log('🎤 Scraping The Stand Edinburgh...');

  try {
    const response = await axios.get('https://www.thestand.co.uk/edinburgh', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/performance/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Extract title from URL like /performance/19513/the-early-saturday-show/2026...
        const urlMatch = href.match(/\/performance\/\d+\/([^\/]+)\//);
        if (!urlMatch) return;
        const title = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!title || title.length < 3) return;

        // Extract date from URL (YYYYMMDD format at end)
        const dateMatch = href.match(/(\d{4})(\d{2})(\d{2})/);
        let isoDate = '2026-02-01';
        if (dateMatch) {
          isoDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }

        const url = href.startsWith('http') ? href : `https://www.thestand.co.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'The Stand Comedy Club', address: '5 York Place, Edinburgh EH1 3EB', city: 'Edinburgh' },
          latitude: 55.9560,
          longitude: -3.1900,
          city: 'Edinburgh',
          category: 'Comedy',
          source: 'The Stand'
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

    console.log(`  ✅ Found ${unique.length} The Stand events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ The Stand error:', error.message);
    return [];
  }
}

module.exports = scrapeTheStand;
