const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://www.toronto.ca';

// Enhanced anti-bot configuration for government sites
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

const getTorontoCaVenue = (city) => ({
  name: 'City of Toronto',
  address: 'Toronto, ON',
  city: 'Toronto',
  state: 'ON',
  zip: '',
  latitude: 43.6532,
  longitude: -79.3832
});

async function scrapeTorontoCaEventsEnhanced(city) {
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
    console.log('🚀 Scraping Toronto.ca events (enhanced anti-bot)...');

    // Random delay to appear human-like
    await delay(Math.floor(Math.random() * 4000) + 2000);

    // Try multiple URL endpoints for City of Toronto
    const urlsToTry = [
      `${BASE_URL}/explore-enjoy/festivals-events/`,
      `${BASE_URL}/explore-enjoy/events/`,
      `${BASE_URL}/explore-enjoy/festivals/`,
      `${BASE_URL}/community-people/get-involved/events/`,
      `${BASE_URL}/explore-enjoy/`,
      `${BASE_URL}/community-people/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying Toronto.ca URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 25000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });

        workingUrl = url;
        console.log(`✅ Successfully fetched ${url} (Status: ${response.status})`);
        break;
      } catch (error) {
        console.log(`❌ Failed to fetch ${url}: ${error.response?.status || error.message}`);
        await delay(3000);
        continue;
      }
    }

    if (!response) {
      console.log('❌ All Toronto.ca URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const events = [];
    const venue = getTorontoCaVenue(city);

    console.log(`📊 Toronto.ca page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for government/city site formats
    const eventSelectors = [
      '.event, .event-item, .listing, .card',
      '.content-item, .tile, .post, article',
      '.promo, .feature, .highlight',
      '[class*="event"], [class*="festival"], [class*="program"]',
      '.grid-item, .list-item, li',
      'div[class*="content"], section[class*="content"]'
    ];

    let foundEvents = false;

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 25) return false;
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.headline', '.name', 'a'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 3) break;
        }

        if (!title) {
          const linkText = $(el).find('a').first().text().trim();
          if (linkText && linkText.length > 3) {
            title = linkText;
          }
        }

        if (!title) {
          title = $(el).text().split('\n')[0].trim();
        }

        if (!title || title.length < 5) return;

        // Enhanced filtering for navigation/menu items and government site content
        const skipPatterns = /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|city hall|mayor|council|services|permits|taxes|garbage|water|transit|ttc|police|fire|paramedic|311|toronto|ontario|canada|english|français|accessibility|privacy|terms)$/i;
        if (skipPatterns.test(title)) return;

        // Skip if title looks like a navigation element
        if (title.length < 8 || /^(events|festivals|programs|services|explore|enjoy|community|people|get involved)$/i.test(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime, .start-date, .festival-date').first().text().trim();
        const description = $(el).find('p, .description, .content, .excerpt, .summary, .teaser').first().text().trim();
        const locationText = $(el).find('.location, .venue, .address, .where').first().text().trim();

        console.log(`📝 Found potential Toronto.ca event: "${title}"`);

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
          eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Official City of Toronto event: ${title}`,
          venue: eventVenue
        });

        foundEvents = true;
      });

      if (foundEvents && events.length > 0) {
        console.log(`✅ Found ${events.length} Toronto.ca events using selector: ${selector}`);
        break;
      }
    }

    if (events.length === 0) {
      console.log('⚠️ No Toronto.ca events found. Analyzing page structure...');
      console.log('📊 Page content sample:', $('body').text().substring(0, 300));
      
      // Try to extract from any structured content
      const headings = $('h1, h2, h3, h4').map((i, el) => $(el).text().trim()).get();
      console.log('📋 Found headings:', headings.slice(0, 5));
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
          price: 'Free',
          categories: extractCategories('Government, Community, Toronto, Official'),
          source: 'Toronto.ca-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['government', 'community', 'toronto', 'official'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added Toronto.ca event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate Toronto.ca event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing Toronto.ca event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new Toronto.ca events`);
    return events;
  } catch (error) {
    console.error('Error scraping Toronto.ca events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeTorontoCaEventsEnhanced  };
