/**
 * Eventfinda Auckland Events Scraper (RSS Feed)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEventfindaAuckland(city = 'Auckland') {
  console.log('🎫 Scraping Eventfinda Auckland RSS...');

  try {
    const feeds = [
      'https://www.eventfinda.co.nz/feed/events/auckland/whatson/upcoming.rss',
      'https://www.eventfinda.co.nz/feed/events/auckland/concerts-gig-guide/upcoming.rss'
    ];
    
    const events = [];
    const seen = new Set();

    for (const feedUrl of feeds) {
      try {
        const response = await axios.get(feedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000
        });
        const $ = cheerio.load(response.data, { xmlMode: true });

        $('item').each((i, el) => {
          try {
            const $item = $(el);
            const title = $item.find('title').text().trim();
            const url = $item.find('link').text().trim();
            const description = $item.find('description').text().trim();
            
            if (!title || !url || seen.has(url)) return;
            seen.add(url);

            const urlMatch = url.match(/\/(\d{4})\//);
            if (!urlMatch || parseInt(urlMatch[1]) < 2025) return;
            const isoDate = `${urlMatch[1]}-01-15`;

            if (new Date(isoDate) < new Date()) return;

            events.push({
              id: uuidv4(),
              title: title.replace(/\s+/g, ' ').trim(),
              date: isoDate,
              url,
              description: description.replace(/<[^>]*>/g, '').substring(0, 200) || null,
              venue: { name: 'Auckland Venues', address: 'Auckland, New Zealand', city: 'Auckland' },
              latitude: -36.8485,
              longitude: 174.7633,
              city: 'Auckland',
              category: 'Events',
              source: 'Eventfinda Auckland'
            });
          } catch (e) {}
        });
      } catch (e) {}
    }

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


    console.log(`  ✅ Found ${events.length} Eventfinda Auckland events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Eventfinda Auckland error:', error.message);
    return [];
  }
}

module.exports = scrapeEventfindaAuckland;
