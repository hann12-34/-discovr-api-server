/**
 * Eventfinda Queenstown Events Scraper (RSS Feed)
 * URL: https://www.eventfinda.co.nz/feed/events/queenstown/whatson/upcoming.rss
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEventfindaQueenstown(city = 'Queenstown') {
  console.log('🎫 Scraping Eventfinda Queenstown RSS...');

  try {
    const response = await axios.get('https://www.eventfinda.co.nz/feed/events/queenstown/whatson/upcoming.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('item').each((i, el) => {
      try {
        const $item = $(el);
        const title = $item.find('title').text().trim();
        const url = $item.find('link').text().trim();
        const description = $item.find('description').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        
        if (!title || !url || seen.has(url)) return;
        seen.add(url);

        let isoDate = null;
        const dateMatch = (description + ' ' + pubDate).match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        } else {
          const urlMatch = url.match(/\/(\d{4})\//);
          if (urlMatch) {
            isoDate = `${urlMatch[1]}-01-15`;
          }
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          date: isoDate,
          url,
          description: description.substring(0, 200) || null,
          venue: { name: 'Queenstown Venues', address: 'Queenstown, New Zealand', city: 'Queenstown' },
          latitude: -45.0312,
          longitude: 168.6626,
          city: 'Queenstown',
          category: 'Events',
          source: 'Eventfinda Queenstown'
        });
      } catch (e) {}
    });

    // Fetch images
    for (const event of events) {
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


    console.log(`  ✅ Found ${events.length} Eventfinda Queenstown events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Eventfinda Queenstown error:', error.message);
    return [];
  }
}

module.exports = scrapeEventfindaQueenstown;
