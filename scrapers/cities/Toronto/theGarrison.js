/**
 * The Garrison Events Scraper
 * Toronto music venue and bar
 * Category: Nightlife, Live Music
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎵 Scraping The Garrison events...');
  
  try {
    const response = await axios.get('https://www.garrisontoronto.com/shows', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('.event, article, .show, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist, .headliner').first().text().trim();
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
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            try {
              eventDate = new Date(dateText).toISOString().split('T')[0];
            } catch (e2) {}
          }
        }
      }
      
      if (title && title.length > 3 && eventDate) {
        const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.garrisontoronto.com' + url : 'https://www.garrisontoronto.com'),
            venue: {
              name: 'The Garrison',
              address: '1197 Dundas St W, Toronto, ON M6J 1X3',
              city: 'Toronto'
            },
            location: 'Toronto, ON',
            city: 'Toronto',
            description: null,
            category: 'Nightlife',
            source: 'The Garrison'
          });
        }
      }
    });
    
    console.log(`✅ The Garrison: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`The Garrison error: ${error.message}`);
    return [];
  }
}

module.exports = scrape;
