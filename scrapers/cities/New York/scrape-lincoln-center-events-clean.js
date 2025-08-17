const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// ============================================
// LINCOLN CENTER CONFIGURATION
// ============================================

const BASE_URL = 'https://www.lincolncenter.org';
const EVENTS_URL = 'https://www.lincolncenter.org/whats-on';

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
  'Upgrade-Insecure-Requests': '1'
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (typeof url === 'string' && url.startsWith('http')) return url;
  if (typeof url === 'string') return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  return fallback;
};

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /click here|read more|view all|see all|learn more/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

const hasEventCharacteristics = (title, description, dateText) => {
  if (!title) return false;
  
  const eventIndicators = [
    /concert|opera|ballet|performance|symphony|philharmonic|recital|dance|theater|show/i,
    /tickets|admission|buy|on sale|sold out|presale/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
    /\b\d{1,2}:\d{2}\b/i,
    /\b(am|pm)\b/i,
    /lincoln center|metropolitan opera|new york philharmonic|nyc ballet/i
  ];
  
  const combinedText = `${title} ${description || ''} ${dateText || ''}`.toLowerCase();
  return eventIndicators.some(pattern => pattern.test(combinedText));
};

// ============================================
// VENUE INFORMATION
// ============================================

const getLincolnCenterVenueInfo = (city) => ({
  name: 'Lincoln Center',
  id: 'lincoln-center',
  city: city || 'New York',
  province: 'NY',
  country: 'USA',
  location: {
    address: '10 Lincoln Center Plaza, New York, NY 10023',
    coordinates: [-73.9833, 40.7722]
  },
  category: 'Arts & Culture',
  website: BASE_URL
});

// ============================================
// MAIN SCRAPING FUNCTION
// ============================================

async function scrapeLincolnCenterEvents(city = 'New York') {
  console.log(`🎭 Starting Lincoln Center Events scraper for ${city}...`);
  
  try {
    const venue = getLincolnCenterVenueInfo(city);
    const events = [];

    await delay(1000 + Math.random() * 2000);

    console.log(`🔍 Fetching events from ${venue.name}...`);
    
    const response = await axios.get(EVENTS_URL, { 
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: Failed to fetch Lincoln Center events`);
    }

    const $ = cheerio.load(response.data);
    let eventCount = 0;

    // Try multiple selectors for Lincoln Center events
    const eventSelectors = [
      '.event',
      '.performance',
      '.show',
      '.event-card',
      '.event-item',
      '[data-event]',
      '.card',
      '.listing'
    ];

    let eventsFound = false;

    for (const selector of eventSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`📍 Found ${elements.length} potential events using selector: ${selector}`);
        eventsFound = true;

        elements.each((index, element) => {
          try {
            const $element = $(element);
            const title = $element.find('h1, h2, h3, h4, .title, .event-title, .headline, .name').first().text().trim() ||
                         $element.find('a').first().text().trim();
            
            if (!title || title.length < 3) return;
            
            const dateText = $element.find('.date, .event-date, .when, time, .performance-date').first().text().trim();
            const description = $element.find('.description, .event-description, .summary, .excerpt, p').first().text().trim();
            const eventUrl = $element.find('a').first().attr('href');
            const imageUrl = $element.find('img').first().attr('src');
            const priceText = $element.find('.price, .cost, .ticket-price').first().text().trim();

            if (!isValidEvent(title)) return;
            if (!hasEventCharacteristics(title, description, dateText)) return;

            const dateInfo = parseDateText(dateText);
            
            const event = {
              id: generateEventId(title, venue.name, dateInfo.startDate),
              title: title,
              description: description || `Performance at ${venue.name}`,
              startDate: dateInfo.startDate,
              endDate: dateInfo.endDate,
              venue: venue,
              url: safeUrl(eventUrl, BASE_URL),
              image: safeUrl(imageUrl, BASE_URL),
              price: extractPrice(priceText),
              category: extractCategories('Arts & Culture'),
              source: 'web_scrape',
              lastUpdated: new Date(),
              city: city
            };

            events.push(event);
            eventCount++;
            
          } catch (error) {
            console.error(`❌ Error parsing Lincoln Center event ${index + 1}:`, error.message);
          }
        });

        if (eventCount > 0) break;
      }
    }

    // Fallback search if no events found
    if (!eventsFound || eventCount === 0) {
      console.log(`⚠️ Trying fallback extraction for Lincoln Center...`);
      
      $('h1, h2, h3, h4, .title, a').each((index, element) => {
        if (index > 30) return false;
        
        const title = $(element).text().trim();
        if (isValidEvent(title) && hasEventCharacteristics(title, '', '')) {
          const dateInfo = parseDateText('');
          
          const event = {
            id: generateEventId(title, venue.name, dateInfo.startDate),
            title: title,
            description: `Performance at ${venue.name}`,
            startDate: dateInfo.startDate,
            endDate: dateInfo.endDate,
            venue: venue,
            url: null,
            image: null,
            price: 'Varies',
            category: extractCategories('Arts & Culture'),
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
    console.error(`❌ Error scraping ${city} Lincoln Center events:`, error.message);
    return { events: [], venue: 'Lincoln Center', city, count: 0, error: error.message };
  }
}

// ============================================
// EXPORT CONFIGURATION
// ============================================

module.exports = { scrapeEvents: scrapeLincolnCenterEvents };

// Test execution when run directly
if (require.main === module) {
  scrapeLincolnCenterEvents('New York').then(result => {
    console.log(`\n📊 Lincoln Center Scraping Results:`);
    console.log(`   Venue: ${result.venue}`);
    console.log(`   City: ${result.city}`);
    console.log(`   Events Found: ${result.count}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}
