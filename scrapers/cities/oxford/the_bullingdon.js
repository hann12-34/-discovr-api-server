/**
 * The Bullingdon Oxford Events Scraper
 * URL: http://thebullingdon.co.uk/venue/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeBullingdon(city = 'Oxford') {
  console.log('🎸 Scraping The Bullingdon...');

  try {
    const response = await axios.get('http://thebullingdon.co.uk/venue/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    // Find event links - NO eventbrite (competitor)
    $('a[href*="event"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        // Skip competitor sites
        if (href.includes('eventbrite') || href.includes('songkick') || href.includes('allevents')) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;

        // Try to find date in surrounding text
        const parentText = $el.parent().text() + ' ' + $el.closest('div').text();
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        
        // No fallback date - skip if no date found
        if (!dateMatch) return;
        
        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
        const year = dateMatch[3] || new Date().getFullYear().toString();
        const isoDate = `${year}-${month}-${day}`;
        
        // Skip past dates
        if (new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url: href,
          venue: { name: 'The Bullingdon', address: '162 Cowley Rd, Oxford OX4 1UE', city: 'Oxford' },
          latitude: 51.7465,
          longitude: -1.2365,
          city: 'Oxford',
          category: 'Nightlife',
          source: 'The Bullingdon'
        });
      } catch (e) {}
    });

    // Dedupe
    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    console.log(`  ✅ Found ${unique.length} Bullingdon events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Bullingdon error:', error.message);
    return [];
  }
}

module.exports = scrapeBullingdon;
