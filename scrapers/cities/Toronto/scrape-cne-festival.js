/**
 * Canadian National Exhibition (CNE) Scraper
 * SAFE & LEGAL: Official festival website
 * The Ex - Toronto's largest summer festival
 * URL: https://theex.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎡 Scraping CNE (The Ex) events...');
  
  try {
    const response = await axios.get('https://theex.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Look for event/show listings
    $('.event, .show, article, [class*="event"]').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title, .name').first().text().trim();
      let eventUrl = $event.find('a').first().attr('href');
      
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://theex.com' + eventUrl;
      }
      
      // Skip if no title, URL, or duplicate
      if (!title || !eventUrl || title.length < 3 || seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      // Extract date
      const dateEl = $event.find('time, .date, [datetime]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try manual parsing for various formats
          const patterns = [
            /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i, // "August 15, 2025"
            /(\d{1,2})\s+(\w+)\s+(\d{4})/i,   // "15 August 2025"
            /(\d{4})-(\d{2})-(\d{2})/          // "2025-08-15"
          ];
          
          for (const pattern of patterns) {
            if (pattern.test(dateText)) {
              try {
                const testParsed = new Date(dateText);
                if (!isNaN(testParsed.getTime()) && testParsed.getFullYear() >= 2025) {
                  eventDate = testParsed.toISOString().split('T')[0];
                  break;
                }
              } catch (e2) {}
            }
          }
        }
      }
      
      // Skip events without real dates - no hardcoded fallback
      if (!eventDate) return;
      
      events.push({
        id: uuidv4(),
        title: title,
            description: '',
        date: eventDate,
        url: eventUrl,
          imageUrl: imageUrl,
        venue: {
          name: 'Canadian National Exhibition',
          address: '210 Princes Blvd, Toronto, ON',
          city: 'Toronto'
        },
        city: city,
        category: 'Festival',
        source: 'CNE'
      });
    });
    
    // No fallback events - only return events with real dates

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

    
    console.log(`✅ CNE: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  CNE error:', error.message);
    return []; // No fallback - return empty on error
  }
}

module.exports = scrape;
