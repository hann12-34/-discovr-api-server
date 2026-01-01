/**
 * CUBE Nightclub Events Scraper
 * Toronto underground techno and house music venue
 * Categories: Nightlife, Techno, House
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🧊 Scraping CUBE nightclub events...');
  
  try {
    const response = await axios.get('https://www.cubenightclub.ca/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('article, .event, .show, [class*="event-item"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .event-title, .artist').first().text().trim();
      const link = $el.find('a').first();
      const url = link.attr('href');
      
      let dateText = $el.find('time, .date, [datetime]').attr('datetime') || $el.find('.date').text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
        seen.add(title + eventDate);
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.cubenightclub.ca' + url : 'https://www.cubenightclub.ca'),
          imageUrl: imageUrl,
          venue: {
            name: 'CUBE Nightclub',
            address: '314 Queen St W, Toronto, ON M5V 2A2',
            city: 'Toronto'
          },
          location: 'Toronto, ON',
          city: 'Toronto',
          description: null,
          category: 'Nightlife',
          source: 'CUBE Nightclub'
        });
      }
    });
    
    console.log(`✅ CUBE: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping CUBE:', error.message);
    return [];
  }
}

module.exports = scrape;
