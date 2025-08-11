const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://www.factorytheatre.ca';

// Advanced anti-bot headers and configuration
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"'
});

// Add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getFactoryTheatreVenue = (city) => ({
  name: 'Factory Theatre',
  address: '125 Bathurst St, Toronto, ON M5V 2R2',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5V 2R2',
  latitude: 43.6458,
  longitude: -79.4039
});

async function scrapeFactoryTheatreEvents(city) {
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(`City mismatch! Expected '${EXPECTED_CITY}', got '${city}'`);
  }

  const mongoURI = process.env.MONGODB_URI;
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    const eventsCollection = client.db('events').collection('events');
    console.log('🚀 Scraping Factory Theatre events (anti-bot protected)...');

    // Add random delay to appear more human-like
    await delay(Math.floor(Math.random() * 2000) + 1000);

    // Try multiple URL endpoints to find working one
    const urlsToTry = [
      `${BASE_URL}/whats-on/`,
      `${BASE_URL}/events/`,
      `${BASE_URL}/shows/`,
      `${BASE_URL}/calendar/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 300; // Default
          }
        });

        workingUrl = url;
        console.log(`✅ Successfully fetched ${url} (Status: ${response.status})`);
        break;
      } catch (error) {
        console.log(`❌ Failed to fetch ${url}: ${error.response?.status || error.message}`);
        
        // Add delay between failed attempts
        await delay(1000);
        continue;
      }
    }

    if (!response) {
      console.log('❌ All URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const events = [];
    const venue = getFactoryTheatreVenue(city);

    console.log(`📊 Page loaded successfully from ${workingUrl}, analyzing content...`);
    
    // Enhanced selectors to catch various event formats
    const eventSelectors = [
      '.event-item, .show-item, .production, .show',
      'article, .post, .entry',
      '.content-item, .card, .tile',
      '.event, .listing',
      '[class*="event"], [class*="show"], [class*="production"]',
      'h1, h2, h3, h4' // Fallback to headers if no specific event containers
    ];

    let foundEvents = false;
    
    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 20) return false; // Limit processing to avoid too many false positives
        
        const title = $(el).find('h1, h2, h3, h4, .title, .event-title, .show-title, .headline').first().text().trim() ||
                     $(el).text().split('\n')[0].trim();
        
        if (!title || title.length < 3) return;
        
        // Skip common navigation/menu items
        const skipPatterns = /^(home|about|contact|menu|search|login|register|subscribe|follow)$/i;
        if (skipPatterns.test(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .show-dates, .event-date, .performance-date').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary').first().text().trim();

        console.log(`📝 Found potential event: "${title}"`);
        
        events.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Experience ${title} at Factory Theatre in Toronto.`
        });
        
        foundEvents = true;
      });
      
      if (foundEvents && events.length > 0) {
        console.log(`✅ Found ${events.length} events using selector: ${selector}`);
        break;
      }
    }

    if (events.length === 0) {
      console.log('⚠️ No events found with any selector. Website structure may have changed.');
      console.log('📊 Page content sample:', $('body').text().substring(0, 200));
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
          id: generateEventId(event.title, venue.name, startDate),
          title: event.title,
          url: event.eventUrl,
          sourceUrl: event.eventUrl,
          description: event.description || '',
          startDate: startDate || new Date(),
          endDate: endDate || startDate || new Date(),
          venue: venue,
          price: 'Contact venue',
          categories: extractCategories('Theatre, Performance, Arts'),
          source: 'Factory Theatre-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['theatre', 'performance', 'arts'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new Factory Theatre events`);
    return events;
  } catch (error) {
    console.error('Error scraping Factory Theatre events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeFactoryTheatreEvents  };
