const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://moca.ca';

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
  'Cache-Control': 'max-age=0',
  'Referer': 'https://www.google.com/'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced filtering to exclude navigation/menu items
const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  // Skip navigation/menu/generic items
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership|newsletter)$/i,
    /^(moca|museum|contemporary|art|toronto|events|exhibitions|programs|collection|shop|book|buy|tickets)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens|free|first|friday|sunday|community)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*|more|info|details|click|here|read|view|see|all)$/i,
    /share to|opens in a new window|click here|read more|view all|see all|first friday|community sunday/i,
    /^(august|september|october|november|december|january|february|march|april|may|june|july)$/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// Enhanced content quality filtering for museum events
const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  // Must have meaningful title
  if (!isValidEvent(title)) return false;
  
  // Museum-specific event indicators
  const eventIndicators = [
    /exhibition|workshop|class|tour|screening|performance|talk|lecture|artist|program|festival|installation/i,
    /printing|drawing|painting|sculpture|photography|media|digital|contemporary|modern/i,
    /\d{4}|\d{1,2}\/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i,
    /evening|morning|afternoon|tonight|today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
  ];
  
  const fullText = `${title} ${description} ${dateText}`.toLowerCase();
  const hasEventKeywords = eventIndicators.some(pattern => pattern.test(fullText));
  
  // Boost score if has event URL, date information, or artist names
  const hasEventData = dateText?.length > 0 || 
                       eventUrl?.includes('event') || 
                       eventUrl?.includes('exhibition') ||
                       eventUrl?.includes('program') ||
                       /with\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(title); // Artist name pattern
  
  return hasEventKeywords || hasEventData || (title.length > 15 && !title.includes('TD'));
};

const getMocaVenue = (city) => ({
  name: 'Museum of Contemporary Art Toronto Canada (MOCA)',
  address: '158 Sterling Rd, Toronto, ON M6R 2B2',
  city: 'Toronto',
  state: 'ON',
  zip: 'M6R 2B2',
  latitude: 43.6426,
  longitude: -79.4194
});

async function scrapeMocaEventsProduction(city) {
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
    console.log('🚀 Scraping MOCA events (production quality)...');

    // Anti-bot delay
    await delay(Math.floor(Math.random() * 3000) + 2000);

    const urlsToTry = [
      `${BASE_URL}/whats-on/`,
      `${BASE_URL}/events/`,
      `${BASE_URL}/programs/`,
      `${BASE_URL}/exhibitions/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying MOCA URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 20000,
          maxRedirects: 8
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
      console.log('❌ All MOCA URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const candidateEvents = [];
    const venue = getMocaVenue(city);

    // Enhanced selectors for museum content
    const eventSelectors = [
      '[class*="event"], [class*="program"], [class*="exhibition"]',
      'article, .post, .entry, .item',
      '.content-item, .card, .tile',
      'h1, h2, h3, h4, .title'
    ];

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 20) return false;
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.program-title', '.exhibition-title', '.headline'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 3) break;
        }

        if (!title) {
          title = $(el).text().split('\n')[0].trim();
        }

        if (!title || !isValidEvent(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime, .program-date').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary').first().text().trim();

        // Enhanced quality filtering
        if (!hasEventCharacteristics(title, description, dateText, eventUrl)) {
          return;
        }

        console.log(`📝 Found qualified MOCA event: "${title}"`);
        
        // Calculate quality score
        let qualityScore = 0;
        qualityScore += dateText ? 3 : 0;
        qualityScore += description ? 2 : 0;
        qualityScore += eventUrl?.includes('event') || eventUrl?.includes('program') ? 2 : 0;
        qualityScore += /with\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(title) ? 2 : 0; // Artist name
        qualityScore += title.length > 20 ? 1 : 0;
        
        candidateEvents.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Contemporary art experience: ${title} at MOCA Toronto.`,
          qualityScore
        });
      });
    }

    // Sort by quality score and take the best
    const events = candidateEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 12); // Limit to top 12 quality events

    console.log(`📊 Found ${candidateEvents.length} candidates, selected ${events.length} quality MOCA events`);

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
          price: extractPrice('Free with admission') || 'Contact venue',
          categories: extractCategories('Art, Museum, Contemporary, Culture'),
          source: 'MOCA-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['art', 'museum', 'contemporary', 'culture'],
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
module.exports = { scrapeEvents: scrapeMocaEventsProduction  };
