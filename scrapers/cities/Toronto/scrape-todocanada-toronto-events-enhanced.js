const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://www.todocanada.ca';

// Enhanced anti-bot configuration
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,en-CA;q=0.8,fr-CA;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Referer': 'https://www.google.com/'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getTodoCanadaVenue = (city) => ({
  name: 'TodoCanada Toronto',
  address: 'Toronto, ON',
  city: 'Toronto',
  state: 'ON',  
  zip: '',
  latitude: 43.6532,
  longitude: -79.3832
});

async function scrapeTodoCanadaTorontoEventsEnhanced(city) {
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(`City mismatch! Expected '${EXPECTED_CITY}', got '${city}'`);
  }

  const mongoURI = process.env.MONGODB_URI;
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    const eventsCollection = client.db('discovr').collection('events');
    console.log('🚀 Scraping TodoCanada Toronto events (enhanced anti-bot)...');

    // Random delay to appear human-like
    await delay(Math.floor(Math.random() * 3000) + 2000);

    // Try multiple URL endpoints
    const urlsToTry = [
      `${BASE_URL}/city/toronto/events`,
      `${BASE_URL}/toronto/events`,
      `${BASE_URL}/toronto`,
      `${BASE_URL}/events/toronto`,
      `${BASE_URL}/city/toronto`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying TodoCanada URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 20000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status >= 200 && status < 400; // Allow redirects
          }
        });

        workingUrl = url;
        console.log(`✅ Successfully fetched ${url} (Status: ${response.status})`);
        break;
      } catch (error) {
        console.log(`❌ Failed to fetch ${url}: ${error.response?.status || error.message}`);
        await delay(2000);
        continue;
      }
    }

    if (!response) {
      console.log('❌ All TodoCanada URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const events = [];
    const venue = getTodoCanadaVenue(city);

    console.log(`📊 TodoCanada page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for TodoCanada and general event formats
    const eventSelectors = [
      '.event, .event-item, .event-card',
      '.listing, .listing-item, .event-listing',
      '.card, .item, .post, article',
      '.content-item, .tile, .event-tile',
      '[class*="event"], [class*="listing"], [class*="card"]',
      'li, .list-item, .grid-item'
    ];

    let foundEvents = false;

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 20) return false; // Reasonable limit
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.name', '.headline', 'a'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 3) break;
        }

        if (!title) {
          title = $(el).text().split('\n')[0].trim();
        }

        if (!title || title.length < 3) return;

        // Enhanced filtering for navigation/menu items and generic content
        const skipPatterns = /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership|newsletter|toronto|events|explore|discover|more|view all|see all|click here)$/i;
        if (skipPatterns.test(title)) return;

        // Skip if title is too short or looks like navigation
        if (title.length < 5 || /^(en|fr|\d+)$/i.test(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .datetime, .event-date, .start-date').first().text().trim();
        const description = $(el).find('p, .description, .content, .excerpt, .summary').first().text().trim();
        const locationText = $(el).find('.location, .venue, .address, .where').first().text().trim();

        console.log(`📝 Found potential TodoCanada event: "${title}"`);

        // Extract venue information if available
        let eventVenue = venue;
        if (locationText && locationText.length > 3) {
          eventVenue = {
            ...venue,
            name: locationText.split(',')[0] || venue.name,
            address: locationText || venue.address
          };
        }

        events.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http")) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http")) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Discover ${title} in Toronto.`,
          venue: eventVenue
        });

        foundEvents = true;
      });

      if (foundEvents && events.length > 0) {
        console.log(`✅ Found ${events.length} TodoCanada events using selector: ${selector}`);
        break;
      }
    }

    if (events.length === 0) {
      console.log('⚠️ No TodoCanada events found. Analyzing page structure...');
      console.log('📊 Page content sample:', $('body').text().substring(0, 300));
      
      // Try to find any JSON-LD structured data
      const jsonLdElements = $('script[type="application/ld+json"]');
      if (jsonLdElements.length > 0) {
        console.log('🔍 Found JSON-LD structured data, analyzing...');
      }
    }

    let addedEvents = 0;
    for (const event of events) {
      try {
        let startDate, endDate;
        if (event.dateText) {
          const parsedDates = parseDateText(event.dateText);
          startDate = parsedDates.startDate;
          endDate = parsedDates.endDate;
        }

        const formattedEvent = {
          id: generateEventId(event.title, event.venue.name, startDate),
          title: event.title,
          url: event.eventUrl,
          sourceUrl: event.eventUrl,
          description: event.description || '',
          startDate: startDate || new Date(),
          endDate: endDate || startDate || new Date(),
          venue: event.venue,
          price: 'Various',
          categories: extractCategories('Events, Entertainment, Toronto'),
          source: 'TodoCanada-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['events', 'entertainment', 'toronto'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added TodoCanada event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate TodoCanada event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing TodoCanada event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new TodoCanada Toronto events`);
    return events;
  } catch (error) {
    console.error('Error scraping TodoCanada Toronto events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeTodoCanadaTorontoEventsEnhanced  };
