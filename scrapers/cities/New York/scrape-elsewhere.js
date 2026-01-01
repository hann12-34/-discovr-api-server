/**
 * Elsewhere Events Scraper
 * Brooklyn's premier multi-room nightclub and performance space
 * Categories: Nightlife, Live Music, Dance
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🌃 Scraping Elsewhere events...');
  
  try {
    const response = await axios.get('https://www.elsewherebrooklyn.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('article, .event, .show-listing, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist-name, .headliner').first().text().trim();
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
          url: url && url.startsWith('http') ? url : (url ? 'https://www.elsewherebrooklyn.com' + url : 'https://www.elsewherebrooklyn.com'),
          imageUrl: imageUrl,
          venue: {
            name: 'Elsewhere',
            address: '599 Johnson Ave, Brooklyn, NY 11237',
            city: 'New York'
          },
          location: 'Brooklyn, NY',
          city: 'New York',
          description: null,
          category: 'Nightlife',
          source: 'Elsewhere'
        });
      }
    });
    
    console.log(`✅ Elsewhere: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Elsewhere:', error.message);
    return [];
  }
}

module.exports = scrape;
