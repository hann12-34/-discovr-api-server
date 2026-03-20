/**
 * Lougheed House Calgary Events Scraper V2
 * URL: https://www.lougheedhouse.com/events
 * Has real event images from Squarespace
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🏛️ Scraping Lougheed House events...');

  try {
    const response = await axios.get('https://www.lougheedhouse.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    // Find Squarespace event images with real event content
    $('img[src*="squarespace-cdn"], img[data-src*="squarespace-cdn"]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (!src || seenImages.has(src)) return;
      if (/logo|icon|wordmark|asset/i.test(src.toLowerCase())) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || '';
      
      // Get title from alt or nearby text
      let title = alt;
      if (!title || title.length < 5) {
        // Try to get from filename
        const match = src.match(/\/([^\/]+)\.(jpg|png|jpeg)/i);
        if (match) {
          title = match[1].replace(/\+/g, ' ').replace(/%20/g, ' ');
        }
      }
      
      // Extract date from title/alt or skip
      const dateMatch = title.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      if (title && title.length > 3 && !title.includes('Logo') && !title.includes('Asset')) {
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: eventDate,
          url: 'https://www.lougheedhouse.com/events',
          image: src.startsWith('http') ? src : 'https:' + src,
          imageUrl: src.startsWith('http') ? src : 'https:' + src,
          description: '',
            venue: {
            name: 'Lougheed House',
            address: '707 13 Ave SW, Calgary, AB T2R 0K8',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Arts & Culture',
          source: 'Lougheed House'
        });
      }
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


    console.log(`✅ Lougheed House: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Lougheed House error:', error.message);
    return [];
  }
}

module.exports = scrape;
