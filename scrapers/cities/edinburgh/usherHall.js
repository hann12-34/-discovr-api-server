/**
 * Usher Hall Edinburgh Events Scraper
 * URL: https://cultureedinburgh.com/our-venues/usher-hall
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeUsherHall(city = 'Edinburgh') {
  console.log('🏛️ Scraping Usher Hall Edinburgh...');

  try {
    const response = await axios.get('https://www.usherhall.co.uk/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/events/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/whats-on/') return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === 'What\'s on' || title === 'All Events') return;

        // Find date in surrounding text
        const parentText = $el.parent().text() + ' ' + $el.closest('div').text();
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        
        let isoDate = '2026-02-01'; // Default if no date found
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3] || '2026';
          isoDate = `${year}-${month}-${day}`;
        }

        const url = href.startsWith('http') ? href : `https://www.usherhall.co.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'Usher Hall', address: 'Lothian Road, Edinburgh EH1 2EA', city: 'Edinburgh' },
          latitude: 55.9474,
          longitude: -3.2059,
          city: 'Edinburgh',
          category: 'Music',
          source: 'Usher Hall'
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

    console.log(`  ✅ Found ${unique.length} Usher Hall events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Usher Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeUsherHall;
