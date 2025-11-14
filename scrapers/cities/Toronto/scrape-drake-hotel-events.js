/**
 * The Drake Hotel Events Scraper (Toronto)
 * Major live music venue and cultural hub
 * Covers The Drake Hotel + Drake Underground
 * URL: https://thedrake.ca/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🦆 Scraping The Drake Hotel events...');
  
  try {
    const events = [];
    const seenUrls = new Set();
    
    // Scrape both Drake Hotel and Drake Underground events
    const urls = [
      'https://thedrake.ca/events/?event_location=the-drake-hotel',
      'https://thedrake.ca/events/?event_location=drake-underground'
    ];
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        // Try multiple selectors for event items
        const eventSelectors = [
          '.event-item',
          '.event',
          '.tribe-events-list-event',
          'article[class*="event"]',
          '[class*="event-card"]'
        ];
        
        let $events = $();
        for (const selector of eventSelectors) {
          $events = $(selector);
          if ($events.length > 0) break;
        }
        
        $events.each((i, el) => {
          const $event = $(el);
          
          // Extract title
          const title = $event.find('h1, h2, h3, h4, .event-title, .tribe-events-list-event-title, [class*="title"]')
            .first()
            .text()
            .trim();
          
          // Extract URL
          let eventUrl = $event.find('a').first().attr('href');
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = 'https://thedrake.ca' + eventUrl;
          }
          
          // Skip duplicates
          if (!eventUrl || seenUrls.has(eventUrl)) return;
          seenUrls.add(eventUrl);
          
          // Extract date
          const dateEl = $event.find('time, .event-date, .tribe-events-event-meta, [datetime], [class*="date"]').first();
          let dateText = dateEl.attr('datetime') || dateEl.text().trim();
          
          // Extract venue (Drake Hotel vs Drake Underground)
          let venueName = 'The Drake Hotel';
          if (url.includes('drake-underground') || title.toLowerCase().includes('underground')) {
            venueName = 'Drake Underground';
          }
          
          // Parse date
          let eventDate = null;
          if (dateText) {
            try {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
                eventDate = parsed.toISOString().split('T')[0];
              }
            } catch (e) {
              // Try alternative parsing
              const monthMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})/i);
              if (monthMatch) {
                try {
                  const testParsed = new Date(dateText);
                  if (!isNaN(testParsed.getTime())) {
                    eventDate = testParsed.toISOString().split('T')[0];
                  }
                } catch (e2) {}
              }
            }
          }
          
          // Only add if we have valid data
          if (title && title.length > 2 && eventUrl) {
            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              url: eventUrl,
          imageUrl: imageUrl,
              venue: {
                name: venueName,
                address: '1150 Queen St W, Toronto, ON M6J 1J3',
                city: 'Toronto'
              },
              city: city,
              source: venueName
            });
          }
        });
        
      } catch (err) {
        console.log(`  Error scraping ${url}:`, err.message);
      }
    }
    
    console.log(`✅ The Drake: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('Error scraping The Drake Hotel:', error.message);
    return [];
  }
}

module.exports = scrape;
