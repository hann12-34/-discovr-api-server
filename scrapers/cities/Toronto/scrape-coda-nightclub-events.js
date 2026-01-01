/**
 * CODA Nightclub Events Scraper
 * Toronto's premier techno and electronic music club
 * Categories: Nightlife, EDM, Techno
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎵 Scraping CODA nightclub events...');
  
  try {
    const response = await axios.get('https://www.codatoronto.com/events', {
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
      
      const title = $el.find('h1, h2, h3, .title, .artist, .headliner').first().text().trim();
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
        } catch (e) {
          // Try manual parse
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toISOString().split('T')[0];
            }
          }
        }
      }
      
      if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
        seen.add(title + eventDate);
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.codatoronto.com' + url : 'https://www.codatoronto.com'),
          imageUrl: imageUrl,
          venue: {
            name: 'CODA',
            address: '794 Bathurst St, Toronto, ON M5R 3G1',
            city: 'Toronto'
          },
          location: 'Toronto, ON',
          city: 'Toronto',
          description: null,
          category: 'Nightlife',
          source: 'CODA'
        });
      }
    });
    
    console.log(`✅ CODA: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping CODA:', error.message);
    return [];
  }
}

module.exports = scrape;
