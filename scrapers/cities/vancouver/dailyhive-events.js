/**
 * Daily Hive Vancouver Events Scraper
 * Major Vancouver news/events site (formerly Vancity Buzz)
 * Covers nightlife, concerts, festivals, local events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { getVenueAddress } = require('../../utils/venueAddresses');

async function scrape() {
  console.log('📰 Scraping Daily Hive Vancouver events...');
  
  try {
    const urls = [
      'https://dailyhive.com/vancouver/events',
      'https://dailyhive.com/vancouver/entertainment'
    ];
    
    const events = [];
    const seen = new Set(); // DUPLICATE PREVENTION
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        $('article, .event, .post-item, [class*="card"]').each((i, el) => {
          const $el = $(el);
          
          const title = $el.find('h1, h2, h3, .title, [class*="title"]').first().text().trim();
          const venue = $el.find('.venue, .location').first().text().trim();
          
          // CAREFUL DATE EXTRACTION
          const dateEl = $el.find('time, .date, [datetime]').first();
          let dateText = dateEl.attr('datetime') || dateEl.text().trim();
          
          const linkEl = $el.find('a').first();
          const eventUrl = linkEl.attr('href');
          
          // ROBUST DATE PARSING
          let eventDate = null;
          if (dateText) {
            try {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime())) {
                eventDate = parsed.toISOString().split('T')[0]; // ISO: YYYY-MM-DD
              }
            } catch (e) {
              // Pattern fallback
              const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})/i);
              if (match) {
                try {
                  eventDate = new Date(dateText).toISOString().split('T')[0];
                } catch (e2) {}
              }
            }
          }
          
          // VALIDATE before adding
          if (title && title.length > 3 && eventDate) {
            // DEDUPLICATION KEY
            const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}`;
            
            if (!seen.has(dedupeKey)) {
              seen.add(dedupeKey);
              
              // Category detection
              let category = 'Events';
              const titleLower = title.toLowerCase();
              
              if (titleLower.includes('night') || titleLower.includes('club') || 
                  titleLower.includes('dj') || titleLower.includes('dance') ||
                  titleLower.includes('party')) {
                category = 'Nightlife';
              } else if (titleLower.includes('concert') || titleLower.includes('show')) {
                category = 'Concert';
              }
              
              const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || null;
              const description = $el.find('p, .description, .excerpt, .summary').first().text().trim() || '';
              const venueName = venue || 'TBA';
              const venueAddress = getVenueAddress(venueName, null) || '';

              events.push({
                id: uuidv4(),
                title: title,
                date: eventDate,
                url: eventUrl && eventUrl.startsWith('http') ? eventUrl : (eventUrl ? 'https://dailyhive.com' + eventUrl : 'https://dailyhive.com/vancouver'),
                image: image,
                description: description,
                venue: {
                  name: venueName,
                  address: venueAddress,
                  city: 'Vancouver'
                },
                location: 'Vancouver, BC',
                city: 'Vancouver',
                category: category,
                source: 'Daily Hive'
              });
            }
          }
        });
      } catch (e) {
        console.error(`Error scraping ${url}:`, e.message);
      }
    }
    
    console.log(`✅ Daily Hive: ${events.length} events (${events.filter(e => e.category === 'Nightlife').length} nightlife)`);

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

    return events;
    
  } catch (error) {
    console.error('Error scraping Daily Hive:', error.message);
    return [];
  }
}

module.exports = scrape;
