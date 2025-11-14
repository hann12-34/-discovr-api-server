/**
 * Bowery Presents Scraper
 * Multi-venue promoter/owner - operates 10+ NYC venues
 * Venues: Mercury Lounge, Bowery Ballroom, Music Hall of Williamsburg, Terminal 5, etc.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎫 Scraping Bowery Presents (multi-venue promoter)...');
  
  try {
    const response = await axios.get('https://www.boweryboston.com/events', {
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
      
      const title = $el.find('h1, h2, h3, .title, .artist').first().text().trim();
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
          // Skip on parse error
        }
      }
      
      if (title && title.length > 3 && eventDate) {
        const dedupeKey = `${title.toLowerCase()}|${eventDate}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          // Determine if nightlife or concert
          let category = 'Concert';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('dj') || titleLower.includes('night') || 
              titleLower.includes('dance') || titleLower.includes('club')) {
            category = 'Nightlife';
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : 'https://www.boweryboston.com',
            venue: {
              name: venue || 'Bowery Presents Venue',
              city: 'New York'
            },
            location: 'New York, NY',
            city: 'New York',
            description: `${title} - Bowery Presents show`,
            category: category,
            source: 'Bowery Presents'
          });
        }
      }
    });
    
    console.log(`✅ Bowery Presents: ${events.length} events across multiple venues`);
    return events;
    
  } catch (error) {
    console.error(`Bowery Presents error: ${error.message}`);
    return []; // NO ERRORS - return empty array
  }
}

module.exports = scrape;
