const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://moca.ca';

// Enhanced anti-bot configuration
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
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
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getMOCAVenue = (city) => ({
  name: 'MOCA Toronto',
  address: '158 Sterling Rd, Toronto, ON M6R 2B7',
  city: 'Toronto',
  state: 'ON',
  zip: 'M6R 2B7',
  latitude: 43.6601,
  longitude: -79.4425
});

async function scrapeMOCAEventsEnhanced(city) {
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
    console.log('🚀 Scraping MOCA events (enhanced anti-bot)...');

    // Random delay to appear human-like
    await delay(Math.floor(Math.random() * 3000) + 1500);

    // Try multiple URL endpoints
    const urlsToTry = [
      `${BASE_URL}/events/`,
      `${BASE_URL}/exhibitions/`,
      `${BASE_URL}/calendar/`,
      `${BASE_URL}/whats-on/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying MOCA URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        });

        workingUrl = url;
        console.log(`✅ Successfully fetched ${url} (Status: ${response.status})`);
        break;
      } catch (error) {
        console.log(`❌ Failed to fetch ${url}: ${error.response?.status || error.message}`);
        await delay(1500);
        continue;
      }
    }

    if (!response) {
      console.log('❌ All MOCA URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const events = [];
    const venue = getMOCAVenue(city);

    console.log(`📊 MOCA page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for MOCA-specific and general event formats
    const eventSelectors = [
      'a.event-landing-grid-item',
      '.event-item, .exhibition-item',
      '.event, .exhibition, .show',
      'article, .post, .entry, .card',
      '.content-item, .tile, .listing',
      '[class*="event"], [class*="exhibition"], [class*="show"]'
    ];

    let foundEvents = false;

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 15) return false; // Reasonable limit
        
        const titleSelectors = ['h2.event-landing-grid-item-heading', 'h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.exhibition-title', '.headline'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 3) break;
        }

        if (!title) {
          title = $(el).text().split('\n')[0].trim();
        }

        if (!title || title.length < 3) return;

        // Enhanced filtering for navigation/menu items
        const skipPatterns = /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership|newsletter)$/i;
        if (skipPatterns.test(title)) return;

        const eventUrl = $(el).attr('href') || $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('p.event-landing-grid-item-date, .date, .when, time, .event-date, .exhibition-date').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary').first().text().trim();

        console.log(`📝 Found potential MOCA event: "${title}"`);

        events.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Experience ${title} at MOCA Toronto.`
        });

        foundEvents = true;
      });

      if (foundEvents && events.length > 0) {
        console.log(`✅ Found ${events.length} MOCA events using selector: ${selector}`);
        break;
      }
    }

    if (events.length === 0) {
      console.log('⚠️ No MOCA events found. Analyzing page structure...');
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
          id: generateEventId(event.title, venue.name, startDate),
          title: event.title,
          url: event.eventUrl,
          sourceUrl: event.eventUrl,
          description: event.description || '',
          startDate: startDate || new Date(),
          endDate: endDate || startDate || new Date(),
          venue: venue,
          price: 'Free',
          categories: extractCategories('Arts, Culture, Museum'),
          source: 'MOCA Toronto-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['arts', 'culture', 'museum'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added MOCA event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate MOCA event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing MOCA event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new MOCA events`);
    return events;
  } catch (error) {
    console.error('Error scraping MOCA events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeMOCAEventsEnhanced  };
