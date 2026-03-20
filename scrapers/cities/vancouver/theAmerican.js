/**
 * The American Events Scraper
 * Vancouver live music venue and bar
 * Category: Nightlife, Live Music
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎸 Scraping The American events...');
  
  try {
    const response = await axios.get('https://www.americanvancouver.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('.event, article, .show-item, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist').first().text().trim();
      const dateEl = $el.find('time, .date, [datetime]').first();
      const dateText = dateEl.attr('datetime') || dateEl.text().trim();
      const url = $el.find('a').first().attr('href');
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            try {
              eventDate = new Date(dateText).toISOString().split('T')[0];
            } catch (e2) {}
          }
        }
      }
      
      if (title && title.length > 3 && eventDate) {
        const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.americanvancouver.com' + url : 'https://www.americanvancouver.com'),
            venue: {
              name: 'The American',
              address: '919 Main St, Vancouver, BC V6A 2V9',
              city: 'Vancouver'
            },
            location: 'Vancouver, BC',
            city: 'Vancouver',
            description: '',
            category: 'Nightlife',
            source: 'The American'
          });
        }
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

    
    console.log(`✅ The American: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`The American error: ${error.message}`);
    return [];
  }
}

module.exports = scrape;
