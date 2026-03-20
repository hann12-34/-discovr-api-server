/**
 * Art Gallery of Alberta Edmonton Events Scraper
 * URL: https://www.youraga.ca/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeArtGalleryAlberta(city = 'Edmonton') {
  console.log('🎨 Scraping Art Gallery of Alberta Edmonton...');

  try {
    const response = await axios.get('https://www.youraga.ca/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const url = $el.attr('href');
        if (!url || seen.has(url) || url === '/whats-on' || url.includes('#')) return;
        seen.add(url);

        const $container = $el.closest('div, article, li');
        const title = $container.find('h2, h3, h4').first().text().trim() || $el.text().trim();
        if (!title || title.length < 3 || title.length > 150) return;

        const text = $container.text();
        // Match dates like "January 10, 2026" or "November 29, 2025 - March 15, 2026"
        const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
        
        let isoDate = null;
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        const imgEl = $container.find('img').first();
        const imageUrl = imgEl.attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          description: 'Exhibition at Art Gallery of Alberta',
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: url.startsWith('http') ? url : `https://www.youraga.ca${url}`,
          imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? `https://www.youraga.ca${imageUrl}` : null,
          venue: {
            name: 'Art Gallery of Alberta',
            address: '2 Sir Winston Churchill Square, Edmonton, AB T5J 2C1',
            city: 'Edmonton'
          },
          latitude: 53.5461,
          longitude: -113.4938,
          city: 'Edmonton',
          category: 'Festivals',
          source: 'Art Gallery of Alberta'
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


    console.log(`  ✅ Found ${events.length} Art Gallery of Alberta events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ Art Gallery of Alberta error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeArtGalleryAlberta;
