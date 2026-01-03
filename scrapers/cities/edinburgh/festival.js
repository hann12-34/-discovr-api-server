/**
 * Festival Theatre Edinburgh Events Scraper
 * URL: https://www.alledinburghtheatre.com/festival-theatre-listings/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeFestivalTheatre(city = 'Edinburgh') {
  console.log('🎭 Scraping Festival Theatre Edinburgh...');

  try {
    const response = await axios.get('https://www.alledinburghtheatre.com/festival-theatre-listings/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
                     january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="capitaltheatres.com"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === 'Book here' || title === 'More info') return;

        const parentText = $el.parent().text();
        const dateMatch = parentText.match(/(\d{1,2})(?:\s*[-–]\s*\w+\s+\d+)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\s*(\d{4})?/i);
        
        let isoDate = '2026-03-01';
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const monthKey = dateMatch[2].toLowerCase().substring(0, 3);
          const month = months[monthKey] || '03';
          const year = dateMatch[3] || '2026';
          isoDate = `${year}-${month}-${day}`;
        }

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url: href,
          venue: { name: 'Festival Theatre', address: '13-29 Nicolson St, Edinburgh EH8 9FT', city: 'Edinburgh' },
          latitude: 55.9469,
          longitude: -3.1863,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Festival Theatre'
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

    for (const event of unique.slice(0, 30)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Festival Theatre events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Festival Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeFestivalTheatre;
