const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://www.roythomson.com';

// Enhanced anti-bot headers
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
  'Accept-Language': 'en-US,en;q=0.9,en-CA;q=0.8',
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

// Enhanced filtering for concert hall content
const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|support)$/i,
    /^(roy|thomson|hall|toronto|symphony|orchestra|concert|music|classical|performance|venue)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*|more|info|details|click|here|read|view|see|all)$/i,
    /share to|opens in a new window|click here|read more|view all|see all/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  if (!isValidEvent(title)) return false;
  
  const eventIndicators = [
    /concert|performance|symphony|orchestra|recital|gala|festival|series|special|guest/i,
    /classical|jazz|opera|chamber|piano|violin|cello|conductor|soloist|ensemble/i,
    /\d{4}|\d{1,2}\/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i,
    /evening|afternoon|matinee|tonight|today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
  ];
  
  const fullText = `${title} ${description} ${dateText}`.toLowerCase();
  const hasEventKeywords = eventIndicators.some(pattern => pattern.test(fullText));
  
  const hasEventData = dateText?.length > 0 || 
                       eventUrl?.includes('event') || 
                       eventUrl?.includes('concert') ||
                       eventUrl?.includes('performance');
  
  return hasEventKeywords || hasEventData || (title.length > 15 && description?.length > 10);
};

const getRoyThomsonHallVenue = (city) => ({
  name: 'Roy Thomson Hall',
  address: '60 Simcoe St, Toronto, ON M5J 2H5',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5J 2H5',
  latitude: 43.6465,
  longitude: -79.3863
});

async function scrapeRoyThomsonHallEventsCleanV2(city) {
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
    console.log('🚀 Scraping Roy Thomson Hall events (clean v2)...');

    // Anti-bot delay
    await delay(Math.floor(Math.random() * 2000) + 1000);

    const urlsToTry = [
      `${BASE_URL}/events/`,
      `${BASE_URL}/calendar/`,
      `${BASE_URL}/concerts/`,
      `${BASE_URL}/performances/`,
      `${BASE_URL}/whats-on/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying Roy Thomson Hall URL: ${url}`);
        
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
      console.log('❌ All Roy Thomson Hall URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const candidateEvents = [];
    const venue = getRoyThomsonHallVenue(city);

    console.log(`📊 Roy Thomson Hall page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for concert hall content
    const eventSelectors = [
      '[class*="event"], [class*="concert"], [class*="performance"], [class*="show"]',
      'article, .post, .entry, .item, .card, .tile',
      '.content-item, .listing, .calendar-item',
      'h1, h2, h3, h4, .title, .headline'
    ];

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 20) return false;
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.concert-title', '.headline'];
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
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime, .performance-date').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary').first().text().trim();

        // Enhanced quality filtering
        if (!hasEventCharacteristics(title, description, dateText, eventUrl)) {
          return;
        }

        console.log(`📝 Found qualified Roy Thomson Hall event: "${title}"`);
        
        // Calculate quality score
        let qualityScore = 0;
        qualityScore += dateText ? 3 : 0;
        qualityScore += description && description.length > 50 ? 2 : description ? 1 : 0;
        qualityScore += eventUrl?.includes('event') || eventUrl?.includes('concert') ? 2 : 0;
        qualityScore += /symphony|orchestra|concert|classical|performance/.test(title.toLowerCase()) ? 1 : 0;
        qualityScore += title.length > 20 ? 1 : 0;
        
        candidateEvents.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http")) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http")) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Experience ${title} at Roy Thomson Hall in Toronto.`,
          qualityScore
        });
      });
    }

    // Sort by quality score and take the best
    const events = candidateEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 15);

    console.log(`📊 Found ${candidateEvents.length} candidates, selected ${events.length} quality Roy Thomson Hall events`);

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
          description: event.description || `Experience ${event.title} at Roy Thomson Hall in Toronto.`,
          startDate: startDate || new Date(),
          endDate: endDate || startDate || new Date(),
          venue: venue,
          price: extractPrice('Varies by performance') || 'Contact venue',
          categories: extractCategories('Classical Music, Orchestra, Symphony, Performance, Toronto'),
          source: 'Roy Thomson Hall-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['classical', 'orchestra', 'symphony', 'performance', 'toronto'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added Roy Thomson Hall event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate Roy Thomson Hall event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing Roy Thomson Hall event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new Roy Thomson Hall events`);
    return events;
  } catch (error) {
    console.error('Error scraping Roy Thomson Hall events:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeRoyThomsonHallEventsCleanV2  };
