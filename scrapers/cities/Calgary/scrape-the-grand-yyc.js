/**
 * The Grand YYC Events Scraper
 * URL: https://www.thegrandyyc.ca/
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎤 Scraping The Grand YYC events...');

  try {
    const response = await axios.get('https://www.thegrandyyc.ca/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    // Find Squarespace event images
    $('img[src*="squarespace-cdn"], img[data-src*="squarespace-cdn"]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (!src || seenImages.has(src)) return;
      if (/logo|icon|AFA_LOGO/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || '';
      
      // Only add if it looks like an event image
      // Extract date from alt or skip
      const dateMatch = alt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      if (alt.length > 3 && !alt.includes('Logo')) {
        events.push({
          id: uuidv4(),
          title: alt.replace(/\.(jpg|png|jpeg)$/i, '').replace(/-/g, ' ').substring(0, 100),
          date: eventDate,
          url: 'https://www.thegrandyyc.ca/',
          image: src.startsWith('http') ? src : 'https:' + src,
          imageUrl: src.startsWith('http') ? src : 'https:' + src,
          venue: {
            name: 'The Grand YYC',
            address: '608 1 St SW, Calgary, AB T2P 1M6',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Music',
          source: 'The Grand YYC'
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


    console.log(`✅ The Grand YYC: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ The Grand YYC error:', error.message);
    return [];
  }
}

module.exports = scrape;
