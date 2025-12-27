/**
 * Rio Theatre Events Scraper
 * Scrapes events from riotheatre.ca - Vancouver's independent theatre
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE = {
  name: 'Rio Theatre',
  address: '1660 East Broadway, Vancouver, BC V5N 1W1',
  city: 'Vancouver'
};

async function fetchEventDetails(eventUrl) {
  try {
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract date from Google Calendar link which has format: dates=20260206T190000
    let dateText = null;
    const calendarLink = $('a[href*="google.com/calendar"]').attr('href');
    if (calendarLink) {
      const dateMatch = calendarLink.match(/dates=(\d{4})(\d{2})(\d{2})T/);
      if (dateMatch) {
        dateText = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
    }
    
    // Fallback: try og:description for date
    if (!dateText) {
      const desc = $('meta[property="og:description"]').attr('content') || '';
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december'];
      
      for (let i = 0; i < months.length; i++) {
        const pattern = new RegExp(`(${months[i]})\\s+(\\d{1,2})`, 'i');
        const match = desc.match(pattern);
        if (match) {
          const year = new Date().getFullYear();
          const month = String(i + 1).padStart(2, '0');
          const day = match[2].padStart(2, '0');
          // If month is in the past, use next year
          const currentMonth = new Date().getMonth();
          const eventYear = i < currentMonth ? year + 1 : year;
          dateText = `${eventYear}-${month}-${day}`;
          break;
        }
      }
    }
    
    // Extract image
    let image = $('meta[property="og:image"]').attr('content');
    
    // Extract description
    let description = $('meta[property="og:description"]').attr('content');
    
    // Extract title
    let title = $('meta[property="og:title"]').attr('content') || $('title').text();
    title = title.replace(/\s*[-|]\s*Rio Theatre.*$/i, '').trim();
    
    return { dateText, image, description, title };
  } catch (error) {
    return { dateText: null, image: null, description: null, title: null };
  }
}

const RioTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Rio Theatre...');

    try {
      const response = await axios.get('https://riotheatre.ca/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();
      const eventUrls = [];

      // Find all event links (both /event/ and /movie/)
      $('a[href*="/event/"], a[href*="/movie/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        
        let url = href;
        if (!url.startsWith('http')) {
          url = 'https://riotheatre.ca' + url;
        }
        
        // Skip generic pages
        if (url.includes('closed') || url.includes('gift')) return;
        
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          eventUrls.push(url);
        }
      });

      console.log(`  Found ${eventUrls.length} event URLs from Rio Theatre`);

      // Fetch details for each event
      for (const eventUrl of eventUrls.slice(0, 50)) {
        try {
          const details = await fetchEventDetails(eventUrl);
          
          if (!details.dateText || !details.title) {
            continue;
          }
          
          events.push({
            id: uuidv4(),
            title: details.title,
            date: details.dateText,
            url: eventUrl,
            venue: VENUE,
            city: 'Vancouver',
            description: details.description || null,
            image: details.image || null,
            source: 'Rio Theatre'
          });
          
        } catch (err) {
          // Continue with next event
        }
      }

      console.log(`Found ${events.length} total events from Rio Theatre`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Rio Theatre:', error.message);
      return [];
    }
  }
};

module.exports = RioTheatreEvents.scrape;
