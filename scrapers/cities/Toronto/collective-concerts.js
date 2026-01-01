/**
 * Collective Concerts Scraper
 * Multi-venue promoter - books shows at multiple Toronto venues
 * Venues: Phoenix Concert Theatre, Lee's Palace, Velvet Underground, etc.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎫 Scraping Collective Concerts (multi-venue promoter)...');
  
  try {
    const response = await axios.get('https://www.collectiveconcerts.com/shows', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('.event, article, .show, [class*="show-item"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist, .headliner').first().text().trim();
      const venue = $el.find('.venue, .location').first().text().trim();
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
          // Skip on error
        }
      }
      
      if (title && title.length > 3 && eventDate) {
        const dedupeKey = `${title.toLowerCase()}|${eventDate}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          let category = 'Concert';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('dj') || titleLower.includes('night') || 
              titleLower.includes('club') || titleLower.includes('dance')) {
            category = 'Nightlife';
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.collectiveconcerts.com' + url : 'https://www.collectiveconcerts.com'),
            venue: {
              name: venue || 'Collective Concerts Venue',
              city: 'Toronto'
            },
            location: 'Toronto, ON',
            city: 'Toronto',
            description: null,
            category: category,
            source: 'Collective Concerts'
          });
        }
      }
    });
    
    console.log(`✅ Collective Concerts: ${events.length} events across multiple venues`);
    return events;
    
  } catch (error) {
    console.error(`Collective Concerts error: ${error.message}`);
    return []; // NO ERRORS - return empty array
  }
}

module.exports = scrape;
