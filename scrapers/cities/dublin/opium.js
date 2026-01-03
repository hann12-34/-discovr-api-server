/**
 * Opium Dublin Events Scraper
 * URL: https://opium.ie/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeOpium(city = 'Dublin') {
  console.log('🎧 Scraping Opium Dublin...');

  try {
    const response = await axios.get('https://opium.ie/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    // Find h3 event titles
    $('h3').each((i, el) => {
      try {
        const $h3 = $(el);
        let title = $h3.text().trim();
        if (!title || title.length < 3 || title === 'CANCELLED' || title === 'Follow Us') return;

        // Find nearby event link by traversing up
        let $parent = $h3.parent();
        let href = null;
        for (let j = 0; j < 5; j++) {
          const $link = $parent.find('a[href*="/events/"]').first();
          href = $link.attr('href');
          if (href && href !== '/events/' && href !== 'https://opium.ie/events/') break;
          $parent = $parent.parent();
        }
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Extract date from surrounding text
        const parentText = $parent.text();
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
        const year = dateMatch[3] || new Date().getFullYear().toString();
        const isoDate = `${year}-${month}-${day}`;

        if (new Date(isoDate) < new Date()) return;

        const url = href.startsWith('http') ? href : `https://opium.ie${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          date: isoDate,
          url,
          venue: { name: 'Opium Live', address: '26 Wexford Street, Dublin D02 R276', city: 'Dublin' },
          latitude: 53.3389,
          longitude: -6.2656,
          city: 'Dublin',
          category: 'Nightlife',
          source: 'Opium'
        });
      } catch (e) {}
    });

    // Dedupe by title+date
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

    console.log(`  ✅ Found ${unique.length} Opium events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Opium error:', error.message);
    return [];
  }
}

module.exports = scrapeOpium;
