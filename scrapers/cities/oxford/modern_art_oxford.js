/**
 * Modern Art Oxford Events Scraper
 * URL: https://modernartoxford.org.uk/whats-on/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeModernArtOxford(city = 'Oxford') {
  console.log('🎨 Scraping Modern Art Oxford...');

  try {
    const response = await axios.get('https://modernartoxford.org.uk/whats-on/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/whats-on/' || href.endsWith('/whats-on')) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === "What's On" || title === 'View all') return;

        // Extract date from URL or text (e.g., "13 January 2026")
        const textAndUrl = title + ' ' + href;
        const dateMatch = textAndUrl.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        
        let isoDate = '2026-02-01';
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase()];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }

        const url = href.startsWith('http') ? href : `https://modernartoxford.org.uk${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s*-\s*\d+\s+\w+\s+\d{4}/, '').trim(),
          date: isoDate,
          url,
          venue: { name: 'Modern Art Oxford', address: '30 Pembroke Street, Oxford OX1 1BP', city: 'Oxford' },
          latitude: 51.7509,
          longitude: -1.2577,
          city: 'Oxford',
          category: 'Arts',
          source: 'Modern Art Oxford'
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

    console.log(`  ✅ Found ${unique.length} Modern Art Oxford events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Modern Art Oxford error:', error.message);
    return [];
  }
}

module.exports = scrapeModernArtOxford;
