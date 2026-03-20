/**
 * Blueprint Events Scraper
 * Multi-venue promoter - Vancouver's biggest electronic music promoter
 * Promotes at: Fortune Sound Club, Celebrities, Commodore, and more
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { getVenueAddress } = require('../../utils/venueAddresses');

async function scrape() {
  console.log('🎫 Scraping Blueprint Events (multi-venue promoter)...');
  
  try {
    const response = await axios.get('https://www.thisisblueprint.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('.event, article, .show, [class*="event-item"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist, .headliner').first().text().trim();
      const venue = $el.find('.venue, .location, [class*="venue"]').first().text().trim();
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
          // Skip if date parse fails
        }
      }
      
      if (title && title.length > 3 && eventDate && venue) {
        const dedupeKey = `${title.toLowerCase()}|${eventDate}|${venue.toLowerCase()}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || null;
          const description = $el.find('p, .description, .excerpt').first().text().trim() || '';
          const fullUrl = url && url.startsWith('http') ? url : (url ? 'https://www.thisisblueprint.com' + url : 'https://www.thisisblueprint.com');
          const venueAddress = getVenueAddress(venue, null) || '';

          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: fullUrl,
            image: image,
            description: description,
            venue: {
              name: venue,
              address: venueAddress,
              city: 'Vancouver'
            },
            location: 'Vancouver, BC',
            city: 'Vancouver',
            category: 'Nightlife',
            source: 'Blueprint Events'
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

    
    console.log(`✅ Blueprint Events: ${events.length} events across multiple venues`);
    return events;
    
  } catch (error) {
    console.error(`Blueprint Events error: ${error.message}`);
    return []; // NO ERRORS - return empty array
  }
}

module.exports = scrape;
