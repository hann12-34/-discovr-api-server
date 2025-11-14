/**
 * Levels Nightclub Events Scraper
 * Vancouver dance club and music venue
 * Categories: Nightlife, Dance, EDM
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎶 Scraping Levels Nightclub events...');
  
  try {
    const response = await axios.get('https://www.levelsnightclub.com/events', {
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
      
      const title = $el.find('h1, h2, h3, .title, .event-title').first().text().trim();
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
          url: url && url.startsWith('http') ? url : (url ? 'https://www.levelsnightclub.com' + url : 'https://www.levelsnightclub.com'),
          venue: {
            name: 'Levels Nightclub',
            address: '560 Seymour St, Vancouver, BC V6B 3J5',
            city: 'Vancouver'
          },
          location: 'Vancouver, BC',
          city: 'Vancouver',
          description: `${title} at Levels Nightclub Vancouver`,
          category: 'Nightlife',
          source: 'Levels Nightclub'
        });
      }
    });
    
    console.log(`✅ Levels Nightclub: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Levels Nightclub:', error.message);
    return [];
  }
}

module.exports = scrape;
