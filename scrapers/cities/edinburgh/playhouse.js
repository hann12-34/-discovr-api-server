/**
 * Edinburgh Playhouse Events Scraper
 * URL: https://www.atgtickets.com/venues/edinburgh-playhouse/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapePlayhouse(city = 'Edinburgh') {
  console.log('🎭 Scraping Edinburgh Playhouse...');

  try {
    const response = await axios.get('https://www.atgtickets.com/venues/edinburgh-playhouse/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    $('a').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href.includes('/shows/') || !href.includes('edinburgh-playhouse')) return;
        if (href.includes('/calendar')) return;
        if (seen.has(href)) return;
        seen.add(href);

        // Extract show name from URL
        const showMatch = href.match(/\/shows\/([^\/]+)\//);
        if (!showMatch) return;
        const title = showMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!title || title.length < 3) return;

        const url = href.startsWith('http') ? href : `https://www.atgtickets.com${href}`;

        if (!isoDate) return; // Skip events without dates
        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          startDate: isoDate ? new Date(isoDate + 'T00:00:00.000Z') : null,
          url,
          venue: { name: 'Edinburgh Playhouse', address: '18-22 Greenside Pl, Edinburgh EH1 3AA', city: 'Edinburgh' },
          latitude: 55.9569,
          longitude: -3.1875,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Edinburgh Playhouse'
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

    // Fetch dates and images from event pages
    for (const event of unique) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }
        // Try to get date
        const dateText = $p('body').text();
        const dateMatch = dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
        if (dateMatch) {
          const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          event.date = `${dateMatch[3]}-${month}-${day}`;
        }
      } catch (e) {}
    }

      // Fetch descriptions from event detail pages
      for (const event of events) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }


    console.log(`  ✅ Found ${unique.length} Edinburgh Playhouse events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Edinburgh Playhouse error:', error.message);
    return [];
  }
}

module.exports = scrapePlayhouse;
