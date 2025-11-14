/**
 * Danforth Music Hall Events Scraper (Toronto)
 * Major concert venue - 1,500 capacity
 * URL: https://thedanforth.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎵 Scraping Danforth Music Hall events...');
  
  try {
    const response = await axios.get('https://thedanforth.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Try multiple event selectors
    const eventSelectors = [
      '.event-item',
      '.event',
      '.show',
      '[class*="event"]',
      'article'
    ];
    
    let $events = $();
    for (const selector of eventSelectors) {
      $events = $(selector);
      if ($events.length > 0) {
        console.log(`  Found ${$events.length} events with selector: ${selector}`);
        break;
      }
    }
    
    $events.each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title, .event-title, .show-title')
        .first()
        .text()
        .trim();
      
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://thedanforth.com' + eventUrl;
      }
      
      if (!eventUrl || seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      const dateEl = $event.find('time, .date, [datetime], [class*="date"]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      if (title && title.length > 2 && eventUrl) {
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'Danforth Music Hall',
            address: '147 Danforth Ave, Toronto, ON M4K 1N2',
            city: 'Toronto'
          },
          city: city,
          source: 'Danforth Music Hall'
        });
      }
    });
    
    console.log(`✅ Danforth Music Hall: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('Error scraping Danforth Music Hall:', error.message);
    return [];
  }
}

module.exports = scrape;
