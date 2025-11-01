const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// CONFIGURATION
const BASE_URL = 'https://casaloma.ca';
const EVENTS_URL = 'https://casaloma.ca/events/';

// ANTI-BOT SYSTEM
const getRandomUserAgent = () => {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/') && baseUrl) return `${baseUrl}${url}`;
  return fallback;
};

const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  const skipPatterns = [
    /^(home|about|contact|menu|search)$/i,
    /click here|read more|view all/i
  ];
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

const getVenueInfo = (city) => ({
  name: 'Casa Loma',
  id: 'casa-loma',
  city: city || 'Toronto',
  province: 'ON',
  country: 'Canada',
  location: {
    address: '1 Austin Terrace, Toronto, ON M5R 1X8',
    coordinates: [-79.4094, 43.6780]
  },
  category: 'Castle',
  website: BASE_URL
});

async function scrapeEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🏰 Scraping Casa Loma events for ${city}...`);
  
  try {
    const venue = getVenueInfo(city);
    const events = [];

    await delay(1000 + Math.random() * 2000);
    
    const response = await axios.get(EVENTS_URL, { 
      headers: getBrowserHeaders(),
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    let eventCount = 0;

    // Parse Casa Loma specific event selectors
    $('.event-item, .event-card, .wp-block-group, article, .post').each((index, element) => {
      try {
        const $el = $(element);
        
        const title = $el.find('h1, h2, h3, h4, .entry-title, .event-title').first().text().trim() ||
                     $el.find('a').first().attr('title') ||
                     $el.find('a').first().text().trim();
        
        const dateText = $el.find('.event-date, .date, time, .when, .event-meta').text().trim();
        const description = $el.find('.excerpt, .description, .entry-content, p').first().text().trim();
        const eventUrl = $el.find('a').first().attr('href');
        const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
        const priceText = $el.find('.price, .cost, .ticket').text().trim();

        if (!isValidEvent(title)) return;

        const dateInfo = parseDateText(dateText);
        
        const event = {
          id: generateEventId(title, venue.name, dateInfo.startDate),
          title: title,
          description: description && description.length > 20 ? description : `${title} at Casa Loma, Toronto majestic castle and historic landmark.`,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: { name: venue.name, city: city },
          url: safeUrl(eventUrl, BASE_URL, EVENTS_URL),
          sourceUrl: EVENTS_URL,
          image: safeUrl(imageUrl, BASE_URL),
          price: extractPrice(priceText) || 'Contact venue',
          categories: extractCategories('Castle, Tourism, History'),
          source: `${venue.name}-Toronto`,
          city: city,
          featured: false,
          tags: ['toronto', 'castle', 'tourism', 'history'],
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
    console.error(`❌ Error scraping Casa Loma events:`, error.message);
    return [];
  }
}

module.exports = scrapeEvents;
