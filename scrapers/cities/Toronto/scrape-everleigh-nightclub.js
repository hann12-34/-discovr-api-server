/**
 * Everleigh Toronto Scraper
 * Upscale nightlife venue
 * URL: https://theeverleigh.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('💎 Scraping Everleigh nightclub events...');
  
  try {
    const response = await axios.get('https://theeverleigh.com/events', {
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
    $('.event, .show, article, [class*="event"], [class*="show"], .card').each((i, el) => {
      const $event = $(el);
      
      // Extract title
      let title = $event.find('h1, h2, h3, h4, .title, .event-title, .name, .artist').first().text().trim();
      
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
          ? 'https://theeverleigh.com' + eventUrl
          : 'https://theeverleigh.com/' + eventUrl;
      }
      if (!eventUrl) {
        eventUrl = 'https://theeverleigh.com/events';
      }
      
      // Skip invalid or duplicate
      if (!title || title.length < 3 || seenUrls.has(eventUrl + title)) return;
      
      // Skip junk
      const titleLower = title.toLowerCase();
      if (titleLower === 'events' || titleLower === 'calendar' || 
          titleLower === 'upcoming' || titleLower === 'more') {
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
            ? 'https://theeverleigh.com' + imageUrl
            : 'https://theeverleigh.com/' + imageUrl;
        }
      }
      
      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: 'Everleigh',
          address: '580 King St W, Toronto, ON M5V 1M3',
          city: 'Toronto'
        },
        city: city,
        category: 'Nightlife',
        source: 'Everleigh'
      });
    });
    
    console.log(`✅ Everleigh: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  Everleigh error:', error.message);
    return [];
  }
}

module.exports = scrape;
