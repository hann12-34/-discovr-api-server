/**
 * Factory Theatre Sydney Events Scraper
 * URL: https://www.factorytheatre.com.au/?s&key=upcoming
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeFactoryTheatre(city = 'Sydney') {
  console.log('🎸 Scraping Factory Theatre Sydney...');

  try {
    const response = await axios.get('https://www.factorytheatre.com.au/?s&key=upcoming', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const currentYear = new Date().getFullYear();

    $('a[href*="/event/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href.includes('ticketek') || href.includes('ticketsearch') || href.includes('moshtix')) return;
        seen.add(href);

        const text = $el.text().trim();
        const dateMatch = text.match(/(?:MON|TUE|WED|THU|FRI|SAT|SUN)\s+(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase()];
        const eventMonth = parseInt(month);
        const year = eventMonth < new Date().getMonth() + 1 ? currentYear + 1 : currentYear;
        const isoDate = `${year}-${month}-${day}`;

        if (new Date(isoDate) < new Date()) return;

        const titleMatch = text.match(/(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(.+?)(?:\s{2,}|$)/i);
        let title = titleMatch ? titleMatch[1].trim() : null;
        if (!title || title.length < 3) return;
        title = title.split('\n')[0].trim();

        const url = href.startsWith('http') ? href : `https://www.factorytheatre.com.au${href}`;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          venue: { name: 'Factory Theatre', address: '105 Victoria Road, Marrickville NSW 2204', city: 'Sydney' },
          latitude: -33.9110,
          longitude: 151.1560,
          city: 'Sydney',
          category: 'Nightlife',
          source: 'Factory Theatre'
        });
      } catch (e) {}
    });

    const unique = [];
    const titleDateSet = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!titleDateSet.has(key)) {
        titleDateSet.add(key);
        unique.push(e);
      }
    }

    for (const event of unique.slice(0, 30)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http') && !ogImage.includes('placeholder')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${unique.length} Factory Theatre events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Factory Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeFactoryTheatre;
