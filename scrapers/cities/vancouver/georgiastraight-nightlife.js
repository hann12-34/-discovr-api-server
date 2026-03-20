/**
 * Georgia Straight Nightlife Events Scraper
 * Vancouver's alternative weekly newspaper - nightlife section
 * NOT a competitor - this is a media publication
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { getVenueAddress } = require('../../utils/venueAddresses');

async function scrape() {
  console.log('📰 Scraping Georgia Straight nightlife events...');
  
  try {
    const response = await axios.get('https://www.straight.com/events/nightlife', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('article, .event-listing, .views-row, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h2, h3, .title, .event-title').first().text().trim();
      const venue = $el.find('.venue, .location, [class*="venue"]').first().text().trim();
      const dateText = $el.find('time, .date, .event-date').attr('datetime') || 
                       $el.find('time, .date').text().trim();
      const url = $el.find('a').first().attr('href');
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try pattern matching
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            try {
              eventDate = new Date(dateText).toISOString().split('T')[0];
            } catch(e2) {}
          }
        }
      }
      
      if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
        seen.add(title + eventDate);
        
        const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || null;
        const description = $el.find('p, .description, .excerpt, .summary').first().text().trim() || '';
        const venueName = venue || 'TBA';
        const venueAddress = getVenueAddress(venueName, null) || '';

        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.straight.com' + url : 'https://www.straight.com'),
          image: image,
          description: description,
          venue: {
            name: venueName,
            address: venueAddress,
            city: 'Vancouver'
          },
          location: 'Vancouver, BC',
          city: 'Vancouver',
          category: 'Nightlife',
          source: 'Georgia Straight'
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

    
    console.log(`✅ Georgia Straight: ${events.length} nightlife events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Georgia Straight:', error.message);
    return [];
  }
}

module.exports = scrape;
