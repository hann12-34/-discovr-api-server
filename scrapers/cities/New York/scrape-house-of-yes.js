/**
 * House of Yes Events Scraper
 * Brooklyn's most creative nightclub and performance venue
 * Categories: Nightlife, Performance Art, Dance
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎭 Scraping House of Yes events...');
  
  try {
    const response = await axios.get('https://houseofyes.org/events', {
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
      
      const title = $el.find('h1, h2, h3, .title, .event-title').first().text().trim();
      const link = $el.find('a').first();
      const url = link.attr('href');
      
      let dateText = $el.find('time, .date, [datetime]').attr('datetime') || $el.find('time, .date').text().trim();
      
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
          url: url && url.startsWith('http') ? url : (url ? 'https://houseofyes.org' + url : 'https://houseofyes.org'),
          imageUrl: imageUrl,
          venue: {
            name: 'House of Yes',
            address: '2 Wyckoff Ave, Brooklyn, NY 11237',
            city: 'New York'
          },
          location: 'Brooklyn, NY',
          city: 'New York',
          description: null,
          category: 'Nightlife',
          source: 'House of Yes'
        });
      }
    });
    
    console.log(`✅ House of Yes: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping House of Yes:', error.message);
    return [];
  }
}

module.exports = scrape;
