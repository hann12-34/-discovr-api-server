/**
 * Fringe World Festival Perth Events Scraper
 * URL: https://fringeworld.com.au/whats-on
 * 600+ events annually Jan-Feb
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeFringeWorld(city = 'Perth') {
  console.log('🎭 Scraping Fringe World Perth...');

  try {
    const response = await axios.get('https://fringeworld.com.au/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const currentYear = new Date().getFullYear();

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href) || href === '/whats-on' || href.includes('shortlist')) return;
        seen.add(href);

        const text = $el.text().trim();
        
        // Extract date range like "21 Jan - 12 Feb" or "31 Jan"
        const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase()];
        const year = currentYear; // Fringe World is Jan-Feb 2026
        const isoDate = `${year}-${month}-${day}`;

        if (new Date(isoDate) < new Date()) return;

        // Extract title - usually the h3 content
        const $container = $el.closest('div').length ? $el.closest('div') : $el;
        let title = $container.find('h3').first().text().trim();
        if (!title) {
          const lines = text.split('\n').filter(l => l.trim().length > 3);
          title = lines.find(l => !l.match(/^\d/) && !l.includes('Jan') && !l.includes('Feb') && l.length > 3 && l.length < 100);
        }
        if (!title || title.length < 3 || title.length > 150) return;

        const url = href.startsWith('http') ? href : `https://fringeworld.com.au${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          date: isoDate,
          url,
          venue: { name: 'Fringe World Venues', address: 'Northbridge, Perth WA', city: 'Perth' },
          latitude: -31.9472,
          longitude: 115.8561,
          city: 'Perth',
          category: 'Festival',
          source: 'Fringe World'
        });
      } catch (e) {}
    });

    // Dedupe by title
    const unique = [];
    const titleSet = new Set();
    for (const e of events) {
      if (!titleSet.has(e.title)) {
        titleSet.add(e.title);
        unique.push(e);
      }
    }

    // Fetch images for top events
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


    console.log(`  ✅ Found ${unique.length} Fringe World events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Fringe World error:', error.message);
    return [];
  }
}

module.exports = scrapeFringeWorld;
