/**
 * Universe Toronto Nightlife Scraper
 * Universe.com - Popular event ticketing platform for Toronto clubs
 * URL: https://www.universe.com/search?q=toronto&category=nightlife
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🌌 Scraping Universe Toronto nightlife events...');
  
  try {
    // Try multiple Toronto nightlife search URLs
    const urls = [
      'https://www.universe.com/search?q=toronto%20nightlife',
      'https://www.universe.com/search?q=toronto%20club',
      'https://www.universe.com/search?q=toronto%20party'
    ];
    
    const allEvents = [];
    const seenTitles = new Set();
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        // Universe uses various selectors for event cards
        $('[class*="event"], [data-testid*="event"], article, .card').each((i, el) => {
          const $event = $(el);
          
          // Extract title
          let title = $event.find('h1, h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
          
          if (!title || title.length < 3 || seenTitles.has(title)) return;
          
          // Must mention Toronto
          const allText = $event.text().toLowerCase();
          if (!allText.includes('toronto')) return;
          
          seenTitles.add(title);
          
          // Extract venue
          let venue = $event.find('[class*="venue"], [class*="location"]').first().text().trim() || '';
          
          // Extract date
          let eventDate = null;
          const $dateEl = $event.find('time, [datetime], [class*="date"]').first();
          let dateText = $dateEl.attr('datetime') || $dateEl.text().trim();
          
          if (dateText) {
            try {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
                eventDate = parsed.toISOString().split('T')[0];
              }
            } catch (e) {}
          }
          
          // Extract URL
          let eventUrl = $event.find('a').first().attr('href');
          if (eventUrl) {
            if (!eventUrl.startsWith('http')) {
              eventUrl = 'https://www.universe.com' + (eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl);
            }
          } else {
            return;
          }
          
          // Extract image
          const img = $event.find('img').first();
          let imageUrl = null;
          if (img.length) {
            imageUrl = img.attr('src') || img.attr('data-src') || null;
          }
          
          allEvents.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: eventUrl,
            imageUrl: imageUrl,
            venue: {
              name: venue || 'Various Venues',
              address: '',
              city: 'Toronto'
            },
            city: city,
            category: 'Nightlife',
            source: 'Universe'
          });
        });
      } catch (e) {
        // Skip this URL if it fails
      }
    }
    
    console.log(`✅ Universe: ${allEvents.length} events`);
    return filterEvents(allEvents);
    
  } catch (error) {
    console.error('  ⚠️  Universe error:', error.message);
    return [];
  }
}

module.exports = scrape;
