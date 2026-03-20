/**
 * Traverse Theatre Edinburgh Events Scraper
 * URL: https://www.traverse.co.uk/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTraverse(city = 'Edinburgh') {
  console.log('🎭 Scraping Traverse Theatre...');

  try {
    const response = await axios.get('https://www.traverse.co.uk/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    $('a[href*="/whats-on/event/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const title = $el.text().trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) return;
        if (title === "What's On" || title === 'View all') return;

        const url = href.startsWith('http') ? href : `https://www.traverse.co.uk${href}`;

        if (!isoDate) return; // Skip events without dates
        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          startDate: isoDate ? new Date(isoDate + 'T00:00:00.000Z') : null,
          url,
          venue: { name: 'Traverse Theatre', address: '10 Cambridge St, Edinburgh EH1 2ED', city: 'Edinburgh' },
          latitude: 55.9469,
          longitude: -3.2046,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Traverse Theatre'
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


    console.log(`  ✅ Found ${unique.length} Traverse Theatre events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Traverse Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeTraverse;
