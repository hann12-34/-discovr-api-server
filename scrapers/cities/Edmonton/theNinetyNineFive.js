/**
 * 9910 Edmonton Events Scraper (Whyte Ave nightclub)
 * Popular nightclub on Whyte Ave
 * URL: https://9910whyte.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape9910(city = 'Edmonton') {
  console.log('🎉 Scraping 9910 Whyte Edmonton...');

  try {
    const response = await axios.get('https://9910whyte.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="event"], .event, article, .show').each((i, el) => {
      try {
        const $el = $(el);
        const linkEl = $el.is('a') ? $el : $el.find('a').first();
        const url = linkEl.attr('href');
        if (!url || seen.has(url)) return;
        seen.add(url);

        const title = $el.find('h2, h3, h4, .title').first().text().trim() || linkEl.text().trim();
        if (!title || title.length < 3) return;

        const dateText = $el.text();
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        
        let isoDate = null;
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear().toString();
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        events.push({
          id: uuidv4(),
          title,
          description: 'Event at 9910 Whyte Ave',
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: url.startsWith('http') ? url : `https://9910whyte.com${url}`,
          imageUrl: $el.find('img').first().attr('src') || null,
          venue: {
            name: '9910 Whyte Ave',
            address: '9910 82 Avenue NW, Edmonton, AB T6E 1Z3',
            city: 'Edmonton'
          },
          latitude: 53.5185,
          longitude: -113.4816,
          city: 'Edmonton',
          category: 'Nightlife',
          source: '9910'
        });
      } catch (e) {}
    });

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


    console.log(`  ✅ Found ${events.length} 9910 Whyte events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ 9910 Whyte error: ${error.message}`);
    return [];
  }
}

module.exports = scrape9910;
