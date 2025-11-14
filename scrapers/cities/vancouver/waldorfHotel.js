/**
 * The Waldorf Hotel Events Scraper
 * Historic Vancouver music venue and nightclub
 * Category: Nightlife, Live Music
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🏨 Scraping The Waldorf Hotel events...');
  
  try {
    const response = await axios.get('https://www.atthewaldorf.com/event-list', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set(); // DUPLICATE PREVENTION
    
    // Look for links to event-details pages
    $('a[href*="/event-details/"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.text().trim();
      const url = $el.attr('href');
      
      // Extract date from URL (format: event-details/title-2025-11-13-20-00)
      const urlMatch = url.match(/(\d{4})-(\d{2})-(\d{2})/);
      let dateText = null;
      if (urlMatch) {
        dateText = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`;
      }
      
      // VALIDATE - date is already in ISO format from URL
      if (title && title.length > 3 && dateText && !title.toLowerCase().includes('learn more')) {
        const dedupeKey = `${title.toLowerCase().trim()}|${dateText}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          events.push({
            id: uuidv4(),
            title: title,
            date: dateText,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.atthewaldorf.com' + url : 'https://www.atthewaldorf.com'),
            venue: {
              name: 'The Waldorf Hotel',
              address: '1489 E Hastings St, Vancouver, BC V5L 1S4',
              city: 'Vancouver'
            },
            location: 'Vancouver, BC',
            city: 'Vancouver',
            description: `${title} at The Waldorf Hotel`,
            category: 'Nightlife',
            source: 'The Waldorf Hotel'
          });
        }
      }
    });
    
    console.log(`✅ The Waldorf Hotel: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`Waldorf Hotel error: ${error.message}`);
    return []; // NO ERRORS
  }
}

module.exports = scrape;
