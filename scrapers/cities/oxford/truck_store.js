/**
 * Truck Store Oxford Events Scraper
 * URL: https://truckmusic.store/pages/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTruckStore(city = 'Oxford') {
  console.log('🎸 Scraping Truck Store Oxford...');

  try {
    const response = await axios.get('https://truckmusic.store/pages/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('h3').each((i, el) => {
      try {
        const $h3 = $(el);
        const title = $h3.text().trim();
        if (!title || title.length < 3 || seen.has(title)) return;
        if (title.includes('Truck Presents') || title.includes('Any Questions')) return;

        const $parent = $h3.parent();
        const parentText = $parent.text();
        
        // Extract date like "13th January" or "Saturday 17th January"
        const dateMatch = parentText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})?/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase()];
        const year = dateMatch[3] || '2026';
        const isoDate = `${year}-${month}-${day}`;

        // Find ticket link
        const $link = $parent.find('a[href*="gigantic"], a[href*="truckmusic"]').first();
        let url = $link.attr('href');
        if (!url) return;
        
        seen.add(title);

        events.push({
          id: uuidv4(),
          title: title.replace(/ALBUM LAUNCH.*|LIVE IN-STORE.*|VINYL RELEASE.*|EP RELEASE.*|RELEASE SHOW.*/gi, '').trim() || title,
          date: isoDate,
          url,
          venue: { name: 'Truck Store', address: '101 Cowley Road, Oxford OX4 1HU', city: 'Oxford' },
          latitude: 51.7488,
          longitude: -1.2390,
          city: 'Oxford',
          category: 'Music',
          source: 'Truck Store'
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


    console.log(`  ✅ Found ${events.length} Truck Store events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Truck Store error:', error.message);
    return [];
  }
}

module.exports = scrapeTruckStore;
