/**
 * The Stand Comedy Club Edinburgh Events Scraper
 * URL: https://www.thestand.co.uk/edinburgh
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheStand(city = 'Edinburgh') {
  console.log('🎤 Scraping The Stand Edinburgh...');

  try {
    const response = await axios.get('https://www.thestand.co.uk/edinburgh', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/performance/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Extract title from URL like /performance/19513/the-early-saturday-show/2026...
        const urlMatch = href.match(/\/performance\/\d+\/([^\/]+)\//);
        if (!urlMatch) return;
        const title = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!title || title.length < 3) return;

        // Extract date from URL (YYYYMMDD format at end)
        const dateMatch = href.match(/(\d{4})(\d{2})(\d{2})/);
        let isoDate = null;
        if (dateMatch) {
          isoDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }

        const url = href.startsWith('http') ? href : `https://www.thestand.co.uk${href}`;

        if (!isoDate) return; // Skip events without dates
        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          startDate: isoDate ? new Date(isoDate + 'T00:00:00.000Z') : null,
          url,
          venue: { name: 'The Stand Comedy Club', address: '5 York Place, Edinburgh EH1 3EB', city: 'Edinburgh' },
          latitude: 55.9560,
          longitude: -3.1900,
          city: 'Edinburgh',
          category: 'Comedy',
          source: 'The Stand'
        });
      } catch (e) {}
    });

    // Dedupe
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


    console.log(`  ✅ Found ${unique.length} The Stand events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ The Stand error:', error.message);
    return [];
  }
}

module.exports = scrapeTheStand;
