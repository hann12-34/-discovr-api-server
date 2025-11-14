/**
 * CODA Toronto Scraper (Updated)
 * SAFE & LEGAL: Official venue website
 * Premier electronic music venue
 * URL: https://www.codatoronto.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎧 Scraping CODA Toronto events...');
  
  try {
    const response = await axios.get('https://www.codatoronto.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Look for event listings - try multiple selectors
    $('.event, .show, article, [class*="event"], [class*="show"], .card').each((i, el) => {
      const $event = $(el);
      
      // Extract title - try multiple selectors
      let title = $event.find('h1, h2, h3, h4, .title, .event-title, .artist, .name').first().text().trim();
      
      // If no title in child, try the element itself
      if (!title || title.length < 2) {
        title = $event.text().trim().split('\n')[0].trim();
      }
      
      // Extract URL
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl && !eventUrl.startsWith('http')) {
        if (eventUrl.startsWith('/')) {
          eventUrl = 'https://www.codatoronto.com' + eventUrl;
        } else {
          eventUrl = 'https://www.codatoronto.com/' + eventUrl;
        }
      }
      
      // Default to events page if no specific URL
      if (!eventUrl) {
        eventUrl = 'https://www.codatoronto.com/events';
      }
      
      // Skip if invalid or duplicate
      if (!title || title.length < 2 || seenUrls.has(eventUrl + title)) return;
      
      // Skip navigation/junk
      const titleLower = title.toLowerCase();
      if (titleLower === 'events' || titleLower === 'calendar' || 
          titleLower === 'upcoming' || titleLower.includes('view all') ||
          titleLower.includes('load more') || titleLower === 'more' ||
          titleLower.includes('buy tickets') || titleLower === 'tickets') {
        return;
      }
      
      seenUrls.add(eventUrl + title);
      
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || null;
        // Make absolute URL if relative
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.codatoronto.com' + imageUrl;
          } else {
            imageUrl = 'https://www.codatoronto.com/' + imageUrl;
          }
        }
      }
      
      // Extract date
      const dateEl = $event.find('time, .date, [datetime], [class*="date"]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try pattern matching for various formats
          const patterns = [
            /(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/i,  // "November 15, 2025"
            /(\d{1,2})\s+(\w{3,9})\s+(\d{4})/i,    // "15 November 2025"
            /(\d{4})-(\d{2})-(\d{2})/,              // "2025-11-15"
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,       // "11/15/2025"
            /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\w{3})\s+(\d{1,2})/i  // "Fri Nov 15"
          ];
          
          for (const pattern of patterns) {
            if (pattern.test(dateText)) {
              try {
                // Try to parse with current year if not specified
                let testDate = dateText;
                if (!testDate.match(/\d{4}/)) {
                  testDate += ' 2025';
                }
                const testParsed = new Date(testDate);
                if (!isNaN(testParsed.getTime()) && testParsed.getFullYear() >= 2025) {
                  eventDate = testParsed.toISOString().split('T')[0];
                  break;
                }
              } catch (e2) {}
            }
          }
        }
      }
      
      // Only add events with valid titles
      if (title.length >= 2) {
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'CODA',
            address: '794 Bathurst St, Toronto, ON M5R 3G1',
            city: 'Toronto'
          },
          city: city,
          category: 'Nightlife',
          source: 'CODA'
        });
      }
    });
    
    console.log(`✅ CODA: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  CODA error:', error.message);
    return [];
  }
}

module.exports = scrape;
