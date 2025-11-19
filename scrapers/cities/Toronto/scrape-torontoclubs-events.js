/**
 * TorontoClubs.com Events Scraper
 * Comprehensive Toronto nightlife events directory
 * URL: https://www.torontoclubs.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎉 Scraping TorontoClubs.com events...');
  
  try {
    const response = await axios.get('https://www.torontoclubs.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // TorontoClubs uses .grid-item for event cards
    $('.grid-item').each((i, el) => {
      const $event = $(el);
      
      // Extract URL first (it's the link element itself)
      let eventUrl = $event.attr('href');
      if (eventUrl) {
        if (!eventUrl.startsWith('http')) {
          eventUrl = 'https://www.torontoclubs.com' + (eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl);
        }
      } else {
        return; // Skip if no URL
      }
      
      // Skip duplicates
      if (seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      // Extract title from URL slug as fallback
      let title = eventUrl.split('/').pop().replace(/-/g, ' ').trim();
      // Capitalize first letter of each word
      title = title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Try to get better title from any text in the element
      const textContent = $event.text().trim();
      if (textContent && textContent.length > 3 && textContent.length < 100) {
        title = textContent;
      }
      
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('srcset')?.split(' ')[0] || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://www.torontoclubs.com' + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
        }
      }
      
      // Extract venue from title if possible
      let venue = 'Various Venues';
      const venuePatt = /(at|@)\s+([A-Z][a-zA-Z\s&]+)/i;
      const venueMatch = title.match(venuePatt);
      if (venueMatch) {
        venue = venueMatch[2].trim();
      }
      
      // Date will be null - these are recurring events
      // We'll let the backend handle them
      let eventDate = null;
      
      // Check if it's a recurring event (Fridays, Saturdays, etc.)
      const recurring = /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(title);
      
      // For recurring events, set a future Saturday if it mentions Saturday, etc.
      if (recurring) {
        const now = new Date();
        const dayMatch = title.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        if (dayMatch) {
          const targetDay = dayMatch[1].toLowerCase();
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDayNum = days.indexOf(targetDay);
          const currentDay = now.getDay();
          
          let daysUntil = targetDayNum - currentDay;
          if (daysUntil <= 0) daysUntil += 7; // Next week
          
          const futureDate = new Date(now);
          futureDate.setDate(now.getDate() + daysUntil);
          eventDate = futureDate.toISOString().split('T')[0];
        }
      }
      
      if (title.length < 3) return; // Skip invalid titles
      
      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: venue,
          address: '',
          city: 'Toronto'
        },
        city: city,
        category: 'Nightlife',
        source: 'TorontoClubs.com'
      });
    });
    
    console.log(`✅ TorontoClubs.com: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  TorontoClubs.com error:', error.message);
    return [];
  }
}

module.exports = scrape;
