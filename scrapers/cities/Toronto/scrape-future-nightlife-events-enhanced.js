const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://futurenightlife.com';

// Enhanced anti-bot configuration
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
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
  'Referer': 'https://www.google.com/'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getFutureNightlifeVenue = (city) => ({
  name: 'Future Nightlife',
  address: 'Toronto, ON',
  city: 'Toronto',
  state: 'ON',
  zip: '',
  latitude: 43.6532,
  longitude: -79.3832
});

async function scrapeFutureNightlifeEventsEnhanced(city) {
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
    console.log('🚀 Scraping Future Nightlife events (enhanced anti-bot)...');

    // Random delay to appear human-like
    await delay(Math.floor(Math.random() * 3500) + 2000);

    // Try multiple URL endpoints
    const urlsToTry = [
      `${BASE_URL}/events/`,
      `${BASE_URL}/shows/`,
      `${BASE_URL}/calendar/`,
      `${BASE_URL}/parties/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying Future Nightlife URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 15000,
          maxRedirects: 8,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
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
      console.log('❌ All Future Nightlife URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const events = [];
    const venue = getFutureNightlifeVenue(city);

    console.log(`📊 Future Nightlife page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for nightlife/event formats
    const eventSelectors = [
      '.event, .event-item, .show, .party',
      '.listing, .card, article, .post',
      '.content-item, .tile, .event-tile',
      '[class*="event"], [class*="show"], [class*="party"]',
      '.grid-item, .list-item'
    ];

    let foundEvents = false;

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 20) return false;
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.show-title', '.artist', '.headline'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 3) break;
        }

        if (!title) {
          title = $(el).text().split('\n')[0].trim();
        }

        if (!title || title.length < 5) return;

        // Enhanced filtering for navigation/menu items and generic nightlife content
        const skipPatterns = /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|table service|bottle service|vip|guest list|age|dress code|music|gallery|news|future|nightlife|events|shows|parties|tickets|toronto|privacy|terms|share|facebook|twitter|instagram|linkedin|copy|link)$/i;
        if (skipPatterns.test(title)) return;

        // Skip social media and generic terms
        if (title.includes('Share to') || title.includes('opens in a new window') || /^(en|fr|\d+)$/i.test(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime, .show-date').first().text().trim();
        const description = $(el).find('p, .description, .content, .details, .summary').first().text().trim();
        const locationText = $(el).find('.location, .venue, .address').first().text().trim();

        // Only include if title looks like a real event (contains meaningful content)
        if (title.length < 8 || !/[a-z]{3,}/i.test(title)) return;

        console.log(`📝 Found potential Future Nightlife event: "${title}"`);

        // Extract venue information if available
        let eventVenue = venue;
        if (locationText && locationText.length > 5) {
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
          description: description || `Experience Toronto's premier nightlife events with ${title}.`,
          venue: eventVenue
        });

        foundEvents = true;
      });

      if (foundEvents && events.length > 0) {
        console.log(`✅ Found ${events.length} Future Nightlife events using selector: ${selector}`);
        break;
      }
    }

    if (events.length === 0) {
      console.log('⚠️ No Future Nightlife events found. Analyzing page structure...');
      console.log('📊 Page content sample:', $('body').text().substring(0, 300));
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
          price: 'Contact venue',
          categories: extractCategories('Music, Nightlife, Entertainment, Club'),
          source: 'Future Nightlife-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['music', 'nightlife', 'entertainment', 'club'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added Future Nightlife event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate Future Nightlife event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing Future Nightlife event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new Future Nightlife events`);
    return events;
  } catch (error) {
    console.error('Error scraping Future Nightlife events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeFutureNightlifeEventsEnhanced  };
