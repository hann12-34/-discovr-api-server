/**
 * CODA Nightclub Events Scraper
 * Toronto's premier techno and electronic music club
 * Categories: Nightlife, EDM, Techno
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎵 Scraping CODA nightclub events...');
  
  try {
    const response = await axios.get('https://www.codatoronto.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('article, .event, .show-item, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist, .headliner').first().text().trim();
      const link = $el.find('a').first();
      const url = link.attr('href');
      
      let dateText = $el.find('time, .date, [datetime]').attr('datetime') || $el.find('.date').text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try manual parse
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toISOString().split('T')[0];
            }
          }
        }
      }
      
      if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
        seen.add(title + eventDate);
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.codatoronto.com' + url : 'https://www.codatoronto.com'),
          imageUrl: imageUrl,
          venue: {
            name: 'CODA',
            address: '794 Bathurst St, Toronto, ON M5R 3G1',
            city: 'Toronto'
          },
          location: 'Toronto, ON',
          city: 'Toronto',
          description: '',
          category: 'Nightlife',
          source: 'CODA'
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

    
    console.log(`✅ CODA: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping CODA:', error.message);
    return [];
  }
}

module.exports = scrape;
