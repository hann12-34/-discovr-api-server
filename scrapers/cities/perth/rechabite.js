/**
 * The Rechabite Perth Events Scraper
 * URL: https://www.therechabite.com.au/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeRechabite(city = 'Perth') {
  console.log('🎭 Scraping The Rechabite Perth...');

  try {
    const response = await axios.get('https://www.therechabite.com.au/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const currentYear = new Date().getFullYear();

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/whats-on' || href === '/whats-on/' || href.includes('fringe-at-the-rechabite')) return;
        seen.add(href);

        const title = $el.text().trim();
        if (!title || title.length < 3 || title.length > 150 || title === 'Tickets' || title.includes('FRINGE WORLD')) return;

        const url = href.startsWith('http') ? href : `https://www.therechabite.com.au${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          url,
          venue: { name: 'The Rechabite', address: '224 William St, Northbridge WA 6003', city: 'Perth' },
          latitude: -31.9465,
          longitude: 115.8572,
          city: 'Perth',
          category: 'Nightlife',
          source: 'The Rechabite'
        });
      } catch (e) {}
    });

    // Dedupe by title
    const unique = [];
    const titleSet = new Set();
    for (const e of events) {
      if (!titleSet.has(e.title)) {
        titleSet.add(e.title);
        unique.push(e);
      }
    }

    // Fetch dates and images from event pages
    for (const event of unique.slice(0, 40)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
        const $p = cheerio.load(page.data);
        
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
        
        // Try to find date in page content
        const pageText = $p('body').text();
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const dateMatch = pageText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3] || currentYear.toString();
          event.date = `${year}-${month}-${day}`;
        }
      } catch (e) {}
    }

    // Filter events with valid dates
    const withDates = unique.filter(e => e.date && new Date(e.date) >= new Date());

    console.log(`  ✅ Found ${withDates.length} Rechabite events`);
    return withDates;

  } catch (error) {
    console.error('  ⚠️ Rechabite error:', error.message);
    return [];
  }
}

module.exports = scrapeRechabite;
