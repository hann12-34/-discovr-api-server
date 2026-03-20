/**
 * Oxford Playhouse Events Scraper
 * URL: https://www.oxfordplayhouse.com/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeOxfordPlayhouse(city = 'Oxford') {
  console.log('🎭 Scraping Oxford Playhouse...');

  try {
    const response = await axios.get('https://www.oxfordplayhouse.com/whats-on', {
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
        if (!href || seen.has(href) || href === '/events/') return;
        seen.add(href);

        const text = $el.text().trim().replace(/\s+/g, ' ');
        let title = text.split('Book now')[0].trim();
        if (!title || title.length < 3 || title.length > 200) return;
        title = title.replace(/\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d+.*$/i, '').trim();

        const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})(?:\s*[–-]\s*\w+\s+\d+)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (!dateMatch) return;

        const day = dateMatch[2].padStart(2, '0');
        const month = months[dateMatch[3].toLowerCase().substring(0, 3)];
        const isoDate = `2026-${month}-${day}`;

        const url = href.startsWith('http') ? href : `https://www.oxfordplayhouse.com${href}`;

        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: isoDate,
          url,
          venue: { name: 'Oxford Playhouse', address: '11-12 Beaumont St, Oxford OX1 2LW', city: 'Oxford' },
          latitude: 51.7573,
          longitude: -1.2620,
          city: 'Oxford',
          category: 'Arts',
          source: 'Oxford Playhouse'
        });
      } catch (e) {}
    });

    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    for (const event of unique) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
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


    console.log(`  ✅ Found ${unique.length} Oxford Playhouse events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Oxford Playhouse error:', error.message);
    return [];
  }
}

module.exports = scrapeOxfordPlayhouse;
