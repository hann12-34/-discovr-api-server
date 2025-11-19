/**
 * Granville Entertainment District Events Scraper
 * Vancouver's nightlife hub - scrapes from vancouverevents.ca
 * URL: https://www.vancouverevents.ca/nightlife
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Vancouver') {
  console.log('🌃 Scraping Granville Entertainment events...');
  
  try {
    const response = await axios.get('https://www.vancouverevents.ca/nightlife', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Find event listings
    $('article, .event, [class*="event"], .card, .listing').each((i, el) => {
      const $event = $(el);
      
      // Extract title
      let title = $event.find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
      
      if (!title || title.length < 3) return;
      
      // Must mention Vancouver or be on Vancouver site
      const allText = $event.text().toLowerCase();
      
      // Extract venue
      let venue = $event.find('[class*="venue"], [class*="location"]').first().text().trim() || 'Granville District';
      
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
          eventUrl = 'https://www.vancouverevents.ca' + (eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl);
        }
      } else {
        return;
      }
      
      // Skip duplicates
      if (seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://www.vancouverevents.ca' + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
        }
      }
      
      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: venue,
          address: '',
          city: 'Vancouver'
        },
        city: city,
        category: 'Nightlife',
        source: 'Granville Entertainment'
      });
    });
    
    console.log(`✅ Granville Entertainment: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  Granville Entertainment error:', error.message);
    return [];
  }
}

module.exports = scrape;
