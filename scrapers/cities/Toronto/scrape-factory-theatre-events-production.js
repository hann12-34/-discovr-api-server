const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://www.factorytheatre.ca';

// Enhanced anti-bot headers with production-grade filtering
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
  'Accept-Language': 'en-US,en;q=0.9',
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

// Enhanced filtering to exclude navigation/menu items
const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  // Skip navigation/menu/generic items
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership|newsletter)$/i,
    /^(factory|theatre|toronto|events|shows|tickets|book|buy|more|info|details|click|here|read|view|see|all)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*)$/,
    /share to|opens in a new window|click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// Enhanced content quality filtering
const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  // Must have meaningful title
  if (!isValidEvent(title)) return false;
  
  // Prefer items with event-specific indicators
  const eventIndicators = [
    /festival|show|performance|concert|exhibition|workshop|class|tour|screening|reading|talk|lecture/i,
    /\d{4}|\d{1,2}\/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i,
    /evening|morning|afternoon|tonight|today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
  ];
  
  const fullText = `${title} ${description} ${dateText}`.toLowerCase();
  const hasEventKeywords = eventIndicators.some(pattern => pattern.test(fullText));
  
  // Boost score if has event URL or date information
  const hasEventData = dateText?.length > 0 || eventUrl?.includes('event') || eventUrl?.includes('show');
  
  return hasEventKeywords || hasEventData || title.length > 15;
};

const getFactoryTheatreVenue = (city) => ({
  name: 'Factory Theatre',
  address: '125 Bathurst St, Toronto, ON M5V 2R2',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5V 2R2',
  latitude: 43.6458,
  longitude: -79.4039
});

async function scrapeFactoryTheatreEventsProduction(city) {
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
    console.log('🚀 Scraping Factory Theatre events (production quality)...');

    // Anti-bot delay
    await delay(Math.floor(Math.random() * 2000) + 1000);

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
          maxRedirects: 5
        });

        workingUrl = url;
        console.log(`✅ Successfully fetched ${url} (Status: ${response.status})`);
        break;
      } catch (error) {
        console.log(`❌ Failed to fetch ${url}: ${error.response?.status || error.message}`);
        await delay(1000);
        continue;
      }
    }

    if (!response) {
      console.log('❌ All URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const candidateEvents = [];
    const venue = getFactoryTheatreVenue(city);

    // Enhanced selectors with quality scoring
    const eventSelectors = [
      '[class*="event"], [class*="show"], [class*="production"]',
      'article, .post, .entry',
      '.content-item, .card, .tile',
      'h1, h2, h3, h4'
    ];

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 15) return false; // Reasonable limit
        
        const title = $(el).find('h1, h2, h3, h4, .title, .event-title, .show-title, .headline').first().text().trim() ||
                     $(el).text().split('\n')[0].trim();
        
        if (!title || !isValidEvent(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .show-dates, .event-date, .performance-date').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary').first().text().trim();

        // Enhanced quality filtering
        if (!hasEventCharacteristics(title, description, dateText, eventUrl)) {
          return;
        }

        console.log(`📝 Found qualified event: "${title}"`);
        
        candidateEvents.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http")) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http")) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Experience ${title} at Factory Theatre in Toronto.`,
          qualityScore: (dateText ? 2 : 0) + (description ? 1 : 0) + (eventUrl?.includes('event') ? 1 : 0)
        });
      });
    }

    // Sort by quality score and take the best
    const events = candidateEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 10); // Limit to top 10 quality events

    console.log(`📊 Found ${candidateEvents.length} candidates, selected ${events.length} quality events`);

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
module.exports = { scrapeEvents: scrapeFactoryTheatreEventsProduction  };
