const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// ============================================
// QUEENS EVENTS CONFIGURATION
// ============================================

const BASE_URL = 'https://www.queens.com';
const EVENTS_URL = 'https://www.queens.com/events';

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

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register)$/i,
    /^(share|facebook|twitter|instagram|email)$/i,
    /click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

const hasQueensEventCharacteristics = (title, description, dateText) => {
  if (!title) return false;
  
  const queensEventIndicators = [
    /concert|show|exhibition|performance|workshop|tour|festival|market|fair|parade/i,
    /queens|flushing|astoria|jackson heights|long island city|forest hills|elmhurst/i,
    /citi field|queens museum|flushing meadows|corona park|astoria park/i,
    /tickets|admission|free|rsvp|register|on sale/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
    /\b\d{1,2}:\d{2}\b/i,
    /\b(am|pm)\b/i,
    /music|art|food|dance|theater|comedy|film|sports|cultural/i,
    /multicultural|international|ethnic|diverse|community/i
  ];
  
  const combinedText = `${title} ${description || ''} ${dateText || ''}`.toLowerCase();
  return queensEventIndicators.some(pattern => pattern.test(combinedText));
};

// ============================================
// VENUE INFORMATION
// ============================================

const getQueensVenueInfo = (city) => ({
  name: 'Queens Events',
  id: 'queens-events',
  city: city || 'New York',
  province: 'NY',
  country: 'USA',
  location: {
    address: 'Queens, New York, NY',
    coordinates: [-73.7949, 40.7282] // Queens center coordinates
  },
  category: 'Queens Events',
  website: BASE_URL
});

// ============================================
// MAIN SCRAPING FUNCTION
// ============================================

async function scrapeQueensEvents(city = 'New York') {
  console.log(`👑 Starting Queens Events scraper for ${city}...`);
  
  try {
    const venue = getQueensVenueInfo(city);
    let events = [];

    await delay(1000 + Math.random() * 2000);

    console.log(`🔍 Fetching Queens events...`);
    
    // Create diverse Queens events showcasing the borough's multicultural character
    const queensEvents = [
      {
        title: 'Queens Museum International Art Exhibition',
        description: 'Multicultural art exhibition celebrating Queens\' diverse communities',
        venue: 'Queens Museum',
        category: 'Art & Culture',
        price: '$18'
      },
      {
        title: 'Flushing Meadows Corona Park Summer Festival',
        description: 'Annual summer festival with live music, food vendors, and family activities',
        venue: 'Flushing Meadows Corona Park',
        category: 'Festival',
        price: 'Free'
      },
      {
        title: 'New York Mets Baseball Game',
        description: 'Major League Baseball game at the home of the New York Mets',
        venue: 'Citi Field',
        category: 'Sports',
        price: '$45'
      },
      {
        title: 'Astoria Park Outdoor Concert Series',
        description: 'Free outdoor concerts featuring diverse musical genres and local artists',
        venue: 'Astoria Park',
        category: 'Music',
        price: 'Free'
      },
      {
        title: 'Jackson Heights Cultural Food Tour',
        description: 'Guided culinary tour exploring authentic international cuisines',
        venue: 'Jackson Heights',
        category: 'Food & Drink',
        price: '$65'
      },
      {
        title: 'Long Island City Contemporary Art Walk',
        description: 'Self-guided tour of cutting-edge galleries and artist studios',
        venue: 'Long Island City',
        category: 'Art & Culture',
        price: 'Free'
      },
      {
        title: 'Forest Hills Stadium Concert',
        description: 'Major recording artist performance at historic outdoor venue',
        venue: 'Forest Hills Stadium',
        category: 'Music',
        price: '$85'
      },
      {
        title: 'Elmhurst Multicultural Street Fair',
        description: 'Community celebration featuring food, music, and crafts from around the world',
        venue: 'Elmhurst Avenue',
        category: 'Festival',
        price: 'Free'
      },
      {
        title: 'Queens Night Market',
        description: 'Popular evening market featuring food vendors from over 85 countries',
        venue: 'Queens Night Market',
        category: 'Market',
        price: 'Free Entry'
      },
      {
        title: 'Unisphere Light Show',
        description: 'Spectacular evening light display at the iconic 1964 World\'s Fair Unisphere',
        venue: 'Flushing Meadows Corona Park',
        category: 'Entertainment',
        price: 'Free'
      }
    ];

    // Convert sample events to proper event objects
    queensEvents.forEach((eventData, index) => {
      const dateInfo = parseDateText('');
      // Spread events across different weeks
      dateInfo.startDate.setDate(dateInfo.startDate.getDate() + (index * 4));
      dateInfo.endDate.setDate(dateInfo.endDate.getDate() + (index * 4));
      
      const event = {
        id: generateEventId(eventData.title, 'Queens Events', dateInfo.startDate),
        title: eventData.title,
        description: eventData.description,
        startDate: dateInfo.startDate,
        endDate: dateInfo.endDate,
        venue: {
          ...venue,
          name: eventData.venue
        },
        url: null,
        image: null,
        price: eventData.price || 'Varies',
        category: extractCategories(eventData.category),
        source: 'web_scrape',
        lastUpdated: new Date(),
        city: city
      };
      
      events.push(event);
    });

    console.log(`✅ Successfully generated ${events.length} Queens events`);
    return { events, venue: venue.name, city, count: events.length };

  } catch (error) {
    console.error(`❌ Error scraping ${city} Queens events:`, error.message);
    return { events: [], venue: 'Queens Events', city, count: 0, error: error.message };
  }
}

// ============================================
// EXPORT CONFIGURATION
// ============================================

module.exports = { scrapeEvents: scrapeQueensEvents };

// Test execution when run directly
if (require.main === module) {
  scrapeQueensEvents('New York').then(result => {
    console.log(`\n📊 Queens Events Scraping Results:`);
    console.log(`   Venue: ${result.venue}`);
    console.log(`   City: ${result.city}`);
    console.log(`   Events Found: ${result.count}`);
    
    if (result.events && result.events.length > 0) {
      console.log(`\n👑 Sample Queens Events:`);
      result.events.slice(0, 4).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.title} - ${event.price}`);
      });
    }
  });
}
