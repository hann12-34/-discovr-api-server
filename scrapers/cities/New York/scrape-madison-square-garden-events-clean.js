const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// ============================================
// MADISON SQUARE GARDEN CONFIGURATION
// ============================================

const BASE_URL = 'https://www.msg.com';
const EVENTS_URL = 'https://www.msg.com/madison-square-garden/events';

// ============================================
// ANTI-BOT HEADERS SYSTEM
// ============================================

const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,en-CA;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Safe URL helper to prevent undefined errors
const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (typeof url === 'string' && url.startsWith('http')) return url;
  if (typeof url === 'string') return `${baseUrl}${url}`;
  return fallback;
};

// Enhanced filtering for MSG-specific content
const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*|more|info|details|click|here|read|view|see|all)$/i,
    /share to|opens in a new window|click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// Event validation with MSG-specific characteristics
const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  if (!title) return false;
  
  // Positive indicators for real MSG events
  const eventIndicators = [
    /concert|show|game|fight|performance|tour|festival|championship|playoffs/i,
    /tickets|admission|buy now|on sale|sold out|presale/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b\d{1,2}:\d{2}\b/i, // Time patterns
    /\b(am|pm)\b/i,
    /knicks|rangers|liberty|boxing|ufc|wwe|nba|nhl|madison square garden|msg/i
  ];
  
  const combinedText = `${title} ${description || ''} ${dateText || ''}`.toLowerCase();
  return eventIndicators.some(pattern => pattern.test(combinedText));
};

// ============================================
// VENUE INFORMATION
// ============================================

const getMSGVenueInfo = (city) => ({
  name: 'Madison Square Garden',
  id: 'madison-square-garden',
  city: city || 'New York',
  province: 'NY',
  country: 'USA',
  location: {
    address: '4 Pennsylvania Plaza, New York, NY 10001',
    coordinates: [-73.9934, 40.7505] // MSG coordinates
  },
  category: 'Arena',
  website: BASE_URL
});

// ============================================
// MAIN SCRAPING FUNCTION
// ============================================

async function scrapeMadisonSquareGardenEvents(city = 'New York') {
  console.log(`🏟️ Starting Madison Square Garden Events scraper for ${city}...`);
  
  try {
    const venue = getMSGVenueInfo(city);
    const events = [];

    // Add delay to avoid rate limiting
    await delay(1000 + Math.random() * 2000);

    console.log(`🔍 Fetching events from ${venue.name}...`);
    
    // Make HTTP request with anti-bot headers
    const response = await axios.get(EVENTS_URL, { 
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: Failed to fetch MSG events`);
    }

    const $ = cheerio.load(response.data);
    let eventCount = 0;

    // ============================================
    // PARSE MSG EVENT DATA
    // ============================================

    // Try multiple selectors for MSG events
    const eventSelectors = [
      '.event-card',
      '.event-item',
      '.event-listing',
      '.upcoming-event',
      '[data-event]',
      '.card',
      '.event'
    ];

    let eventsFound = false;

    for (const selector of eventSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`📍 Found ${elements.length} potential events using selector: ${selector}`);
        eventsFound = true;

        elements.each((index, element) => {
          try {
            // Extract basic event data with multiple fallback selectors
            const $element = $(element);
            const title = $element.find('h1, h2, h3, h4, .title, .event-title, .headline').first().text().trim() ||
                         $element.find('a').first().text().trim() ||
                         $element.text().trim();
            
            const dateText = $element.find('.date, .event-date, .when, time').first().text().trim();
            const description = $element.find('.description, .event-description, .summary, p').first().text().trim();
            const eventUrl = $element.find('a').first().attr('href');
            const imageUrl = $element.find('img').first().attr('src');
            const priceText = $element.find('.price, .cost, .ticket-price').first().text().trim();

            // Validation checks
            if (!isValidEvent(title)) return;
            if (!hasEventCharacteristics(title, description, dateText, eventUrl)) return;

            // Parse date information
            const dateInfo = parseDateText(dateText);
            
            // Create event object
            const event = {
              id: generateEventId(title, venue.name, dateInfo.startDate),
              title: title,
              description: description || `Event at ${venue.name}`,
              startDate: dateInfo.startDate,
              endDate: dateInfo.endDate,
              venue: venue,
              url: safeUrl(eventUrl, BASE_URL, null),
              image: safeUrl(imageUrl, BASE_URL, null),
              price: extractPrice(priceText),
              category: extractCategories('Sports & Entertainment'),
              source: 'web_scrape',
              lastUpdated: new Date(),
              city: city
            };

            events.push(event);
            eventCount++;
            
          } catch (error) {
            console.error(`❌ Error parsing MSG event ${index + 1}:`, error.message);
          }
        });

        // If we found events with this selector, stop trying others
        if (eventCount > 0) break;
      }
    }

    if (!eventsFound) {
      console.log(`⚠️ No events found with standard selectors, trying generic extraction...`);
      
      // Fallback: look for any text that might be event titles
      $('h1, h2, h3, h4, .title, a').each((index, element) => {
        if (index > 50) return false; // Limit to avoid too much processing
        
        const title = $(element).text().trim();
        if (isValidEvent(title) && hasEventCharacteristics(title, '', '', '')) {
          const dateInfo = parseDateText('');
          
          const event = {
            id: generateEventId(title, venue.name, dateInfo.startDate),
            title: title,
            description: `Event at ${venue.name}`,
            startDate: dateInfo.startDate,
            endDate: dateInfo.endDate,
            venue: venue,
            url: null,
            image: null,
            price: 'Varies',
            category: extractCategories('Sports & Entertainment'),
            source: 'web_scrape',
            lastUpdated: new Date(),
            city: city
          };

          events.push(event);
          eventCount++;
        }
      });
    }

    console.log(`✅ Successfully scraped ${eventCount} events from ${venue.name}`);
    return { events, venue: venue.name, city, count: eventCount };

  } catch (error) {
    console.error(`❌ Error scraping ${city} MSG events:`, error.message);
    return { events: [], venue: 'Madison Square Garden', city, count: 0, error: error.message };
  }
}

// ============================================
// EXPORT CONFIGURATION
// ============================================

// Clean production export (required for orchestrator compatibility)
module.exports = { scrapeEvents: scrapeMadisonSquareGardenEvents };

// Test execution when run directly
if (require.main === module) {
  scrapeMadisonSquareGardenEvents('New York').then(result => {
    console.log(`\n📊 MSG Scraping Results:`);
    console.log(`   Venue: ${result.venue}`);
    console.log(`   City: ${result.city}`);
    console.log(`   Events Found: ${result.count}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}
