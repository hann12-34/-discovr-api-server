/**
 * Republic Nightclub Events Scraper
 * Vancouver's largest nightclub
 * Categories: Nightlife, EDM, Dance
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎉 Scraping Republic Nightclub events...');
  
  try {
    const response = await axios.get('https://www.republicvancouver.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('article, .event, .show, [class*="event-item"], .eventlist-event').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .event-title, .eventlist-title').first().text().trim();
      const link = $el.find('a').first();
      const url = link.attr('href');
      
      let dateText = $el.find('time, .date, .event-date, [datetime]').attr('datetime') || 
                     $el.find('time, .date, .event-date').text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try to match pattern like "Nov 15, 2025"
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
          url: url && url.startsWith('http') ? url : (url ? 'https://www.republicvancouver.com' + url : 'https://www.republicvancouver.com'),
          venue: {
            name: 'Republic Nightclub',
            address: '958 Granville St, Vancouver, BC V6Z 1L2',
            city: 'Vancouver'
          },
          location: 'Vancouver, BC',
          city: 'Vancouver',
          description: '',
          category: 'Nightlife',
          source: 'Republic Nightclub'
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

    
    console.log(`✅ Republic Nightclub: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Republic Nightclub:', error.message);
    return [];
  }
}

module.exports = scrape;
