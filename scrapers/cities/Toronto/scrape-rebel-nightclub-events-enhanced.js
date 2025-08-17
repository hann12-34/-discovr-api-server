const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://rebelnightclub.com';

// Enhanced anti-bot configuration
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
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

const getRebelNightclubVenue = (city) => ({
  name: 'Rebel Nightclub',
  address: '11 Polson St, Toronto, ON M5A 1A4',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5A 1A4',
  latitude: 43.6426,
  longitude: -79.3520
});

async function scrapeRebelNightclubEventsEnhanced(city) {
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
    console.log('🚀 Scraping Rebel Nightclub events (enhanced anti-bot)...');

    // Random delay to appear human-like
    await delay(Math.floor(Math.random() * 3500) + 1500);

    // Try multiple URL endpoints
    const urlsToTry = [
      `${BASE_URL}/events/`,
      `${BASE_URL}/shows/`,
      `${BASE_URL}/calendar/`,
      `${BASE_URL}/tickets/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying Rebel Nightclub URL: ${url}`);
        
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
      console.log('❌ All Rebel Nightclub URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const events = [];
    const venue = getRebelNightclubVenue(city);

    console.log(`📊 Rebel Nightclub page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for nightclub/event formats
    const eventSelectors = [
      '.event, .event-item, .show, .party',
      '.listing, .card, article, .post',
      '.content-item, .tile, .event-tile',
      '[class*="event"], [class*="show"], [class*="party"]',
      '.grid-item, .list-item, li'
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

        if (!title || title.length < 3) return;

        // Enhanced filtering for navigation/menu items
        const skipPatterns = /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|table service|bottle service|vip|guest list|age|dress code|music|gallery|news)$/i;
        if (skipPatterns.test(title)) return;

        // Skip generic nightclub terms
        if (/^(rebel|nightclub|club|toronto|events|shows|parties|tickets)$/i.test(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime, .show-date').first().text().trim();
        const description = $(el).find('p, .description, .content, .details, .summary').first().text().trim();

        console.log(`📝 Found potential Rebel event: "${title}"`);

        events.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http")) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http")) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Experience the ultimate nightlife at Rebel Nightclub with ${title}.`
        });

        foundEvents = true;
      });

      if (foundEvents && events.length > 0) {
        console.log(`✅ Found ${events.length} Rebel events using selector: ${selector}`);
        break;
      }
    }

    if (events.length === 0) {
      console.log('⚠️ No Rebel Nightclub events found. Analyzing page structure...');
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
          price: 'Contact venue',
          categories: extractCategories('Music, Nightlife, Electronic, Club'),
          source: 'Rebel Nightclub-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['music', 'nightlife', 'electronic', 'club'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added Rebel event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate Rebel event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing Rebel event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new Rebel Nightclub events`);
    return events;
  } catch (error) {
    console.error('Error scraping Rebel Nightclub events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeRebelNightclubEventsEnhanced  };
