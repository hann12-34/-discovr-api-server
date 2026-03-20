/**
 * CODA Toronto Scraper (Updated)
 * SAFE & LEGAL: Official venue website
 * Premier electronic music venue
 * URL: https://www.codatoronto.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎧 Scraping CODA Toronto events...');
  
  try {
    const response = await axios.get('https://www.codatoronto.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // CODA uses: class="schedule-event w-dyn-item"
    $('.schedule-event').each((i, el) => {
      const $event = $(el);
      
      // Extract date: class="event-date" 
      let eventDate = null;
      const dateText = $event.find('.event-date').first().text().trim();
      
      if (dateText) {
        // Parse "December 6, 2025" format
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      // Extract title: class="event-name"
      let title = $event.find('.event-name').first().text().trim();
      
      // Extract URL
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = eventUrl.startsWith('/') 
          ? 'https://www.codatoronto.com' + eventUrl
          : 'https://www.codatoronto.com/' + eventUrl;
      }
      if (!eventUrl) {
        eventUrl = 'https://www.codatoronto.com/events';
      }
      
      // Skip invalid or duplicate
      if (!title || title.length < 3 || seenUrls.has(eventUrl + title)) return;
      
      // Skip navigation junk
      const titleLower = title.toLowerCase();
      if (titleLower === 'events' || titleLower === 'calendar' || 
          titleLower === 'upcoming' || titleLower.includes('view all') ||
          titleLower === 'upcoming events' || titleLower === 'more') {
        return;
      }
      
      seenUrls.add(eventUrl + title);
      
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = imageUrl.startsWith('/') 
            ? 'https://www.codatoronto.com' + imageUrl
            : 'https://www.codatoronto.com/' + imageUrl;
        }
      }
      
      events.push({
        id: uuidv4(),
        title: title,
            description: '',
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: 'CODA',
          address: '794 Bathurst St, Toronto, ON M5R 3G1',
          city: 'Toronto'
        },
        city: city,
        category: 'Nightlife',
        source: 'CODA'
      });
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
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  CODA error:', error.message);
    return [];
  }
}

module.exports = scrape;
