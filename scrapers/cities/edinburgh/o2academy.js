/**
 * Edinburgh Corn Exchange (formerly O2 Academy Edinburgh) Events Scraper
 * URL: https://www.edinburghcornexchange.co.uk/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeO2AcademyEdinburgh(city = 'Edinburgh') {
  console.log('🎸 Scraping Edinburgh Corn Exchange...');

  try {
    const response = await axios.get('https://www.edinburghcornexchange.co.uk/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="/all-events/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const text = $el.text().trim();
        const dateMatch = text.match(/(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})?/i);
        if (!dateMatch) return;

        // Extract title from URL
        const urlMatch = href.match(/\/all-events\/([^\/]+)-tickets/);
        if (!urlMatch) return;
        const title = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!title || title.length < 3) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase()];
        let year = dateMatch[3]; if (!year) { const _n = new Date(); year = (parseInt(month) < _n.getMonth() + 1) ? String(_n.getFullYear() + 1) : String(_n.getFullYear()); }
        const isoDate = `${year}-${month}-${day}`;

        const url = href.startsWith('http') ? href : `https://www.edinburghcornexchange.co.uk${href}`;

        if (!isoDate) return; // Skip events without dates
        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          startDate: isoDate ? new Date(isoDate + 'T00:00:00.000Z') : null,
          url,
          venue: { name: 'Edinburgh Corn Exchange', address: '11 New Market Road, Edinburgh EH14 1RJ', city: 'Edinburgh' },
          latitude: 55.9267,
          longitude: -3.2378,
          city: 'Edinburgh',
          category: 'Music',
          source: 'Edinburgh Corn Exchange'
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


    console.log(`  ✅ Found ${unique.length} Edinburgh Corn Exchange events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Edinburgh Corn Exchange error:', error.message);
    return [];
  }
}

module.exports = scrapeO2AcademyEdinburgh;
