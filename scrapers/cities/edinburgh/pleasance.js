/**
 * Pleasance Theatre Edinburgh Events Scraper
 * URL: https://www.whatsoninedinburgh.co.uk/listings/the-pleasance-edinburgh/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapePleasance(city = 'Edinburgh') {
  console.log('🎭 Scraping Pleasance Edinburgh...');

  try {
    const response = await axios.get('https://www.whatsoninedinburgh.co.uk/listings/the-pleasance-edinburgh/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="/event/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === 'READ MORE' || title === 'Music' || title === 'Comedy') return;

        const parentText = $el.closest('div').text();
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        
        let isoDate = '2026-03-15';
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase()];
          isoDate = `2026-${month}-${day}`;
        }

        const url = href.startsWith('http') ? href : `https://www.whatsoninedinburgh.co.uk${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'Pleasance Theatre', address: '60 Pleasance, Edinburgh EH8 9TJ', city: 'Edinburgh' },
          latitude: 55.9478,
          longitude: -3.1811,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Pleasance Theatre'
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

    console.log(`  ✅ Found ${unique.length} Pleasance events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Pleasance error:', error.message);
    return [];
  }
}

module.exports = scrapePleasance;
