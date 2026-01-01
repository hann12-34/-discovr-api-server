/**
 * The Drake Hotel Events Scraper
 * Toronto cultural hub - music venue, gallery, nightlife
 * Category: Nightlife, Live Music, Events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🏨 Scraping The Drake Hotel events...');
  
  try {
    const response = await axios.get('https://thedrake.ca/events/?event_location=the-drake-hotel', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    // Drake uses h2 tags for event titles
    $('h2').each((i, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      
      // Skip headers like "What's On", "Book", etc
      if (title === 'Book' || title === "What's On" || title.length < 3) return;
      
      // Get parent container to find date and URL
      const container = $el.parent();
      const link = container.find('a[href*="/event/"]').first();
      const url = link.attr('href');
      
      // Parse date from text like "Tue. Nov. 11"
      const text = container.text();
      const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\.\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+(\d{1,2})/);
      
      let eventDate = null;
      if (dateMatch) {
        const monthMap = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
        const month = monthMap[dateMatch[2]];
        const day = parseInt(dateMatch[3]);
        const year = new Date().getFullYear();
        const date = new Date(year, month, day);
        eventDate = date.toISOString().split('T')[0];
      }
      
      if (title && title.length > 3 && eventDate && url) {
        const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          let category = 'Events';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('night') || titleLower.includes('dj') || 
              titleLower.includes('dance') || titleLower.includes('club')) {
            category = 'Nightlife';
          } else if (titleLower.includes('concert') || titleLower.includes('live')) {
            category = 'Concert';
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.thedrakehotel.ca' + url : 'https://www.thedrakehotel.ca'),
            venue: {
              name: 'The Drake Hotel',
              address: '1150 Queen St W, Toronto, ON M6J 1J3',
              city: 'Toronto'
            },
            location: 'Toronto, ON',
            city: 'Toronto',
            description: null,
            category: category,
            source: 'The Drake Hotel'
          });
        }
      }
    });
    
    console.log(`✅ The Drake Hotel: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`Drake Hotel error: ${error.message}`);
    return [];
  }
}

module.exports = scrape;
