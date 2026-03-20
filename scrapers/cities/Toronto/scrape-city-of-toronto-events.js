/**
 * City of Toronto Official Events Scraper
 * SAFE & LEGAL: Official government website
 * City-run events and festivals
 * URL: https://www.toronto.ca/explore-enjoy/festivals-events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🏛️ Scraping City of Toronto events...');
  
  try {
    const events = [];
    const seenUrls = new Set();
    
    const urls = [
      'https://www.toronto.ca/explore-enjoy/festivals-events/',
      'https://www.toronto.ca/explore-enjoy/festivals-events/festivals/'
    ];
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        // Look for event listings
        $('.event, article, .festival, [class*="event"], [class*="festival"]').each((i, el) => {
          const $event = $(el);
          
          const title = $event.find('h1, h2, h3, h4, .title').first().text().trim();
          let eventUrl = $event.find('a').first().attr('href');
          
          if (eventUrl && !eventUrl.startsWith('http')) {
            if (eventUrl.startsWith('/')) {
              eventUrl = 'https://www.toronto.ca' + eventUrl;
            }
          }
          
          // Skip if invalid or duplicate
          if (!title || !eventUrl || title.length < 3 || seenUrls.has(eventUrl)) return;
          
          // Filter out generic navigation items
          const titleLower = title.toLowerCase();
          if (titleLower === 'events' || titleLower === 'festivals' || 
              titleLower === 'calendar' || titleLower.includes('sign up') ||
              titleLower.includes('subscribe') || titleLower.includes('newsletter')) {
            return;
          }
          
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
              // Try pattern matching for various date formats
              const patterns = [
                /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})/i,
                /(\\d{1,2})\\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.?\\s+(\\d{4})/i,
                /(\\d{4})-(\\d{2})-(\\d{2})/
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
          
          // Categorize by title
          let category = 'Events';
          if (titleLower.includes('festival') || titleLower.includes('fest')) {
            category = 'Festival';
          } else if (titleLower.includes('concert') || titleLower.includes('music')) {
            category = 'Concert';
          } else if (titleLower.includes('parade') || titleLower.includes('celebration')) {
            category = 'Festival';
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            description: '',
            date: eventDate,
            url: eventUrl,
          imageUrl: imageUrl,
            venue: {
              name: 'City of Toronto',
              city: 'Toronto'
            },
            city: city,
            category: category,
            source: 'City of Toronto'
          });
        });
        
      } catch (err) {
        console.log(`    ⚠️  Error on ${url}: ${err.message}`);
      }
    }

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

    
    console.log(`✅ City of Toronto: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  City of Toronto error:', error.message);
    return [];
  }
}

module.exports = scrape;
