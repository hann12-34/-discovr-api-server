/**
 * Blueprint Events Scraper
 * Multi-venue promoter - Vancouver's biggest electronic music promoter
 * Promotes at: Fortune Sound Club, Celebrities, Commodore, and more
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

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
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.thisisblueprint.com' + url : 'https://www.thisisblueprint.com'),
            venue: {
              name: venue,
              city: 'Vancouver'
            },
            location: 'Vancouver, BC',
            city: 'Vancouver',
            description: null,
            category: 'Nightlife',
            source: 'Blueprint Events'
          });
        }
      }
    });
    
    console.log(`✅ Blueprint Events: ${events.length} events across multiple venues`);
    return events;
    
  } catch (error) {
    console.error(`Blueprint Events error: ${error.message}`);
    return []; // NO ERRORS - return empty array
  }
}

module.exports = scrape;
