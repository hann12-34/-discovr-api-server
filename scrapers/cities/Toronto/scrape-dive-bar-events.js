const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'https://www.instagram.com/divebar_to/';
const VENUE_NAME = 'Dive Bar';
const VENUE_ADDRESS = '1631 Dundas St W, Toronto, ON M6K 1V2';

async function divebarEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🌙 Scraping ${VENUE_NAME} nightlife events for ${city}...`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept 4xx responses
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    // Check for valid response
    if (response.status >= 400) {
      console.log('   ⚠️  0 events (HTTP ' + response.status + ')');
      return filterEvents([]);
    }
    
    const $ = cheerio.load(response.data);
    
    // Find event containers - enhanced selectors
    const containers = new Set();
    
    // Event-specific selectors
    $('.event, [class*="event" i], [class*="Event"], article, .show, [class*="show"], .listing, .card, [class*="card"], [data-event]').each((i, el) => {
      containers.add(el);
    });
    
    // Look for date elements
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 4 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    // Resident Advisor specific
    if (EVENTS_URL.includes('ra.co')) {
      $('[data-event-id], .event-item, [class*="EventItem"]').each((i, el) => {
        containers.add(el);
      });
    }
    
    // Process containers
    Array.from(containers).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      // Extract title
      const title = (
        $event.find('h1, h2, h3, h4').first().text().trim() ||
        $event.find('.title, [class*="title" i]').first().text().trim() ||
        $event.find('.name, [class*="name" i]').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|View All|Load More)/i)) return;
      
      // Extract date
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        const selectors = ['time', '.date, [class*="date" i]', '[class*="Date"]', '.when', '.schedule'];
        for (const sel of selectors) {
          dateText = $event.find(sel).first().text().trim();
          if (dateText && dateText.length > 4) break;
        }
      }
      
      if (!dateText) {
        const allText = $event.text();
        const patterns = [
          /\d{4}-\d{2}-\d{2}/,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
        ];
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      // Extract description
      const description = (
        $event.find('.description, .desc, p').first().text().trim() ||
        title
      ).substring(0, 500);
      
      // Extract URL
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? 'https://' + new URL(EVENTS_URL).hostname + url : 
                     EVENTS_URL;
      
      events.push({
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Toronto' },
        location: 'Toronto, ON',
        description: description,
        url: fullUrl,
        category: 'Nightlife',
        source: 'Nightlife Scraper'
      });
    });
    
    console.log('   🌙 Extracted ' + events.length + ' nightlife events');
    
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || 
        error.response?.status === 404 || error.response?.status === 403) {
      console.log('   ⚠️  0 events (venue source unavailable)');
      return filterEvents([]);
    }
    console.log('   ⚠️  Error: ' + error.message);
    return filterEvents([]);
  }
  
  return filterEvents(events);
}

module.exports = divebarEvents;
