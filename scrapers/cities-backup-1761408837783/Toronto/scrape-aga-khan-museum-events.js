const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// CONFIGURATION
const BASE_URL = 'https://agakhanmuseum.org';
const EVENTS_URL = 'https://agakhanmuseum.org/#upcoming-events';

// ANTI-BOT SYSTEM
const getRandomUserAgent = () => {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
});

// UTILITIES
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/') && baseUrl) return `${baseUrl}${url}`;
  if (baseUrl) return `${baseUrl}/${url}`;
  return fallback;
};

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register)$/i,
    /^(share|facebook|twitter|instagram|email|print)$/i,
    /click here|read more|view all|see all/i,
    /^\s*$/
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// VENUE INFORMATION
const getVenueInfo = (city) => ({
  name: 'Aga Khan Museum',
  id: 'aga-khan-museum',
  city: city || 'Toronto',
  province: 'ON',
  country: 'Canada',
  location: {
    address: '77 Wynford Dr, Toronto, ON M3C 1K1',
    coordinates: [-79.3256, 43.7251]
  },
  category: 'Museum',
  website: BASE_URL
});

// MAIN SCRAPER FUNCTION
async function scrapeEvents(city = 'Toronto') {
  // CRITICAL: City validation
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🎭 Scraping Aga Khan Museum events for ${city}...`);
  
  try {
    const venue = getVenueInfo(city);
    const events = [];

    // Rate limiting delay
    await delay(1000 + Math.random() * 2000);

    console.log(`🔍 Fetching events from ${venue.name}...`);
    
    const response = await axios.get(EVENTS_URL, { 
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: Failed to fetch`);
    }

    const $ = cheerio.load(response.data);
    let eventCount = 0;

    // PARSE EVENTS - Aga Khan Museum specific selectors
    $('.event-item, .program-item, article[class*="event"], .event-card, .event-listing').each((index, element) => {
      try {
        const $el = $(element);
        
        const title = $el.find('h1, h2, h3, h4, .title, .event-title, .program-title').first().text().trim() ||
                     $el.find('a').first().text().trim() ||
                     $el.text().trim().split('\n')[0];
        
        const dateText = $el.find('.date, .event-date, .program-date, time, .when').first().text().trim();
        const description = $el.find('.description, .excerpt, .summary, p').first().text().trim();
        const eventUrl = $el.find('a').first().attr('href');
        const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
        const priceText = $el.find('.price, .cost, .admission').first().text().trim();

        // Validation
        if (!isValidEvent(title)) return;

        // Parse dates
        const dateInfo = parseDateText(dateText);
        
        // Create event object
        const event = {
          id: generateEventId(title, venue.name, dateInfo.startDate),
          title: title,
          description: description && description.length > 20 ? description : `${title} at Aga Khan Museum, Toronto's premier museum celebrating Islamic arts and culture.`,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: { name: venue.name, city: city },
          url: safeUrl(eventUrl, BASE_URL, EVENTS_URL),
          sourceUrl: EVENTS_URL,
          image: safeUrl(imageUrl, BASE_URL),
          price: extractPrice(priceText) || 'Contact venue',
          categories: extractCategories('Museum, Culture, Art'),
          source: `${venue.name}-Toronto`,
          city: city,
          featured: false,
          tags: ['toronto', 'museum', 'culture', 'art'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        events.push(event);
        eventCount++;
        
      } catch (error) {
        console.error(`❌ Error parsing event ${index + 1}:`, error.message);
      }
    });


    console.log(`✅ Scraped ${eventCount} events from ${venue.name}`);
    return filterEvents(events);

  } catch (error) {
    console.error(`❌ Error scraping Aga Khan Museum events:`, error.message);
    return [];
  }
}

module.exports = scrapeEvents;
