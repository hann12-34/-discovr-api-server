/**
 * Pat's Pub Events Scraper
 * Vancouver live music pub and venue
 * Category: Nightlife, Live Music
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🍺 Scraping Pat\'s Pub events...');
  
  try {
    const response = await axios.get('https://patspub.ca/events', {
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
      
      const title = $el.find('h1, h2, h3, .title, .artist').first().text().trim();
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
            url: url && url.startsWith('http') ? url : (url ? 'https://patspub.ca' + url : 'https://patspub.ca'),
            venue: {
              name: 'Pat\'s Pub',
              address: '403 E Hastings St, Vancouver, BC V6A 1P7',
              city: 'Vancouver'
            },
            location: 'Vancouver, BC',
            city: 'Vancouver',
            description: `${title} at Pat's Pub`,
            category: 'Nightlife',
            source: 'Pat\'s Pub'
          });
        }
      }
    });
    
    console.log(`✅ Pat's Pub: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`Pat's Pub error: ${error.message}`);
    return [];
  }
}

module.exports = scrape;
