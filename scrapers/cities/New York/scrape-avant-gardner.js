/**
 * Avant Gardner / Brooklyn Mirage Events Scraper
 * Major Brooklyn nightclub and event space
 * Categories: Nightlife, EDM, Concerts
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎪 Scraping Avant Gardner / Brooklyn Mirage events...');
  
  try {
    const response = await axios.get('https://www.avantgardner.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    // Find event items
    $('article, .event-item, .show-item, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      // Get title
      const title = $el.find('h1, h2, h3, .title, .event-title, .headliner').first().text().trim();
      
      // Get URL
      const link = $el.find('a').first();
      const url = link.attr('href');
      
      // Get date
      let dateText = $el.find('time, .date, .event-date, [datetime]').first().text().trim();
      if (!dateText) {
        dateText = $el.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i)?.[0];
      }
      
      // Parse date to ISO format
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      // Get venue
      let venueName = 'Avant Gardner';
      if ($el.text().includes('Brooklyn Mirage')) venueName = 'Brooklyn Mirage';
      if ($el.text().includes('Great Hall')) venueName = 'Avant Gardner - Great Hall';
      if ($el.text().includes('Kings Hall')) venueName = 'Avant Gardner - Kings Hall';
      
      if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
        seen.add(title + eventDate);
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.avantgardner.com' + url : 'https://www.avantgardner.com'),
          imageUrl: imageUrl,
          venue: {
            name: venueName,
            address: '140 Stewart Ave, Brooklyn, NY 11237',
            city: 'New York'
          },
          location: 'Brooklyn, NY',
          city: 'New York',
          description: `${title} at ${venueName}, Brooklyn's premier nightlife destination`,
          category: 'Nightlife',
          source: 'Avant Gardner'
        });
      }
    });
    
    console.log(`✅ Avant Gardner: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Avant Gardner:', error.message);
    return [];
  }
}

module.exports = scrape;
