/**
 * Georgia Straight Nightlife Events Scraper
 * Vancouver's alternative weekly newspaper - nightlife section
 * NOT a competitor - this is a media publication
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

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
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.straight.com' + url : 'https://www.straight.com'),
          venue: {
            name: venue || 'TBA',
            city: 'Vancouver'
          },
          location: 'Vancouver, BC',
          city: 'Vancouver',
          description: null,
          category: 'Nightlife',
          source: 'Georgia Straight'
        });
      }
    });
    
    console.log(`✅ Georgia Straight: ${events.length} nightlife events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Georgia Straight:', error.message);
    return [];
  }
}

module.exports = scrape;
