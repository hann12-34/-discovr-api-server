/**
 * UNIUN Toronto Scraper
 * Premier nightlife venue in Toronto
 * URL: https://uniunnightclub.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎵 Scraping UNIUN nightclub events...');
  
  try {
    const response = await axios.get('https://uniunnightclub.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Find event containers
    $('.event, .show, article, [class*="event"], [class*="show"]').each((i, el) => {
      const $event = $(el);
      
      // Extract title
      let title = $event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
      
      // Extract date
      let eventDate = null;
      const $dateEl = $event.find('time, .date, [datetime], [class*="date"]').first();
      let dateText = $dateEl.attr('datetime') || $dateEl.text().trim();
      
      if (dateText) {
        try {
          let testDate = dateText;
          if (!testDate.match(/\d{4}/)) {
            testDate += ' 2025';
          }
          const parsed = new Date(testDate);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      // Extract URL
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = eventUrl.startsWith('/') 
          ? 'https://uniunnightclub.com' + eventUrl
          : 'https://uniunnightclub.com/' + eventUrl;
      }
      if (!eventUrl) {
        eventUrl = 'https://uniunnightclub.com/events/';
      }
      
      // Skip invalid or duplicate
      if (!title || title.length < 3 || seenUrls.has(eventUrl + title)) return;
      
      // Skip junk
      const titleLower = title.toLowerCase();
      if (titleLower === 'events' || titleLower === 'calendar' || 
          titleLower === 'upcoming') {
        return;
      }
      
      seenUrls.add(eventUrl + title);
      
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = imageUrl.startsWith('/') 
            ? 'https://uniunnightclub.com' + imageUrl
            : 'https://uniunnightclub.com/' + imageUrl;
        }
      }
      
      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: 'UNIUN',
          address: '41 Ossington Ave, Toronto, ON M6J 2Y8',
          city: 'Toronto'
        },
        city: city,
        category: 'Nightlife',
        source: 'UNIUN'
      });
    });
    
    console.log(`✅ UNIUN: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  UNIUN error:', error.message);
    return [];
  }
}

module.exports = scrape;
