/**
 * Pride Toronto Festival Scraper
 * SAFE & LEGAL: Official Pride Toronto website
 * Major LGBTQ+ festival and parade
 * URL: https://www.pridetoronto.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🏳️‍🌈 Scraping Pride Toronto events...');
  
  try {
    const response = await axios.get('https://www.pridetoronto.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Look for event listings
    $('.event, .event-item, article, [class*="event"]').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
      let eventUrl = $event.find('a').first().attr('href');
      
      if (eventUrl && !eventUrl.startsWith('http')) {
        if (eventUrl.startsWith('/')) {
          eventUrl = 'https://www.pridetoronto.com' + eventUrl;
        }
      }
      
      // Skip if invalid or duplicate
      if (!title || !eventUrl || title.length < 3 || seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      // Extract date
      const dateEl = $event.find('time, .date, [datetime]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try pattern matching
          const patterns = [
            /(June|Jun)\s+(\d{1,2}),?\s+(\d{4})/i,
            /(\d{1,2})\s+(June|Jun)\s+(\d{4})/i,
            /(\d{4})-06-(\d{2})/
          ];
          
          for (const pattern of patterns) {
            const match = dateText.match(pattern);
            if (match) {
              try {
                const testParsed = new Date(dateText);
                if (!isNaN(testParsed.getTime()) && testParsed.getFullYear() >= 2025) {
                  eventDate = testParsed.toISOString().split('T')[0];
                  break;
                }
              } catch (e2) {}
            }
          }
        }
      }
      
      // Skip events without real dates - no hardcoded fallback
      if (!eventDate) return;
      
      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
          imageUrl: imageUrl,
        venue: {
          name: 'Pride Toronto',
          city: 'Toronto'
        },
        city: city,
        category: 'Festival',
        source: 'Pride Toronto'
      });
    });
    
    // No fallback events - only return events with real dates
    
    console.log(`✅ Pride Toronto: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  Pride Toronto error:', error.message);
    return []; // No fallback - return empty on error
  }
}

module.exports = scrape;
