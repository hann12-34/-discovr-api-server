/**
 * The Old Fire Station Oxford Events Scraper
 * URL: https://oldfirestation.org.uk/whats-on/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeOldFireStation(city = 'Oxford') {
  console.log('🚒 Scraping The Old Fire Station...');

  try {
    const response = await axios.get('https://oldfirestation.org.uk/whats-on/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('h3').each((i, el) => {
      try {
        const $h3 = $(el);
        const title = $h3.text().trim();
        if (!title || title.length < 3 || seen.has(title)) return;
        seen.add(title);

        const $parent = $h3.parent();
        const parentText = $parent.text();
        
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const monthName = dateMatch[2].toLowerCase().substring(0, 3);
        const month = months[monthName];
        const year = dateMatch[3];
        const isoDate = `${year}-${month}-${day}`;

        const $link = $parent.find('a[href*="oldfirestation"]').first();
        const href = $link.attr('href');
        if (!href) return;
        const url = href.startsWith('http') ? href : `https://oldfirestation.org.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'The Old Fire Station', address: '40 George St, Oxford OX1 2AQ', city: 'Oxford' },
          latitude: 51.7530,
          longitude: -1.2580,
          city: 'Oxford',
          category: 'Arts',
          source: 'The Old Fire Station'
        });
      } catch (e) {}
    });

    // Fetch images
    for (const event of events.slice(0, 15)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${events.length} Old Fire Station events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Old Fire Station error:', error.message);
    return [];
  }
}

module.exports = scrapeOldFireStation;
