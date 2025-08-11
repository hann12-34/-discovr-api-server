const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://www.todocanada.ca';

// Enhanced anti-bot headers with production-grade filtering
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

// Enhanced filtering to exclude navigation/menu items
const isValidEvent = (title) => {
  if (!title || title.length < 5) return false;
  
  // Skip navigation/menu/generic items
  const skipPatterns = [
    /^(home|about|contact|menu|search|login|register|subscribe|follow|visit|hours|directions|donate|membership|newsletter)$/i,
    /^(todocanada|canada|toronto|ontario|events|things|to|do|activities|attractions|tickets|book|buy|more|info)$/i,
    /^(share|facebook|twitter|instagram|linkedin|email|print|copy|link|window|opens|free|daily|weekly|monthly)$/i,
    /^(en|fr|\d+|\.\.\.|\s*-\s*|click|here|read|view|see|all|browse|explore|discover|find)$/i,
    /share to|opens in a new window|click here|read more|view all|see all|browse all|explore more|find more/i,
    /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i,
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i
  ];
  
  return !skipPatterns.some(pattern => pattern.test(title.trim()));
};

// Enhanced content quality filtering for TodoCanada events
const hasEventCharacteristics = (title, description, dateText, eventUrl) => {
  // Must have meaningful title
  if (!isValidEvent(title)) return false;
  
  // TodoCanada-specific event indicators
  const eventIndicators = [
    /festival|concert|show|performance|exhibition|workshop|class|tour|screening|reading|talk|lecture|conference|summit/i,
    /theater|theatre|music|art|museum|gallery|cultural|heritage|historic|anniversary|celebration|parade/i,
    /comedy|musical|opera|ballet|dance|jazz|classical|rock|pop|indie|folk|country|blues/i,
    /\d{4}|\d{1,2}\/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i,
    /evening|morning|afternoon|tonight|today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
    /royal|grand|international|world|canadian|toronto|ontario|national|annual|special|limited|exclusive/i
  ];
  
  const fullText = `${title} ${description} ${dateText}`.toLowerCase();
  const hasEventKeywords = eventIndicators.some(pattern => pattern.test(fullText));
  
  // Boost score if has event URL, date information, or specific venue names
  const hasEventData = dateText?.length > 0 || 
                       eventUrl?.includes('event') || 
                       eventUrl?.includes('show') ||
                       eventUrl?.includes('festival') ||
                       /house|hall|centre|center|theater|theatre|museum|gallery|stadium|arena|park/.test(title.toLowerCase());
  
  // Must be substantial content
  const hasSubstantialContent = title.length > 10 && (description?.length > 20 || dateText?.length > 0);
  
  return (hasEventKeywords || hasEventData) && hasSubstantialContent;
};

const getTodoCanadaVenue = (city, eventTitle = '') => {
  // Try to extract venue from event title if possible
  const venueMatches = eventTitle.match(/at\s+([^,\-\|\n]+)/i);
  const extractedVenue = venueMatches ? venueMatches[1].trim() : 'Various Toronto Venues';
  
  return {
    name: extractedVenue.length > 3 ? extractedVenue : 'TodoCanada Toronto',
    address: 'Toronto, ON',
    city: 'Toronto',
    state: 'ON',
    zip: '',
    latitude: 43.6532,
    longitude: -79.3832
  };
};

async function scrapeTodoCanadaTorontoEventsProduction(city) {
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
    console.log('🚀 Scraping TodoCanada Toronto events (production quality)...');

    // Anti-bot delay
    await delay(Math.floor(Math.random() * 4000) + 3000);

    const urlsToTry = [
      `${BASE_URL}/city/toronto-events/`,
      `${BASE_URL}/events/toronto/`,
      `${BASE_URL}/toronto/events/`,
      `${BASE_URL}/things-to-do/toronto/`,
      `${BASE_URL}/city/toronto/`,
      `${BASE_URL}/`
    ];

    let response = null;
    let workingUrl = null;

    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Trying TodoCanada URL: ${url}`);
        
        response = await axios.get(url, {
          headers: getBrowserHeaders(),
          timeout: 25000,
          maxRedirects: 10
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
      console.log('❌ All TodoCanada URLs failed, cannot proceed');
      return [];
    }

    const $ = cheerio.load(response.data);
    const candidateEvents = [];

    console.log(`📊 TodoCanada page loaded from ${workingUrl}, analyzing content...`);

    // Enhanced selectors for event listing sites
    const eventSelectors = [
      '[class*="event"], [class*="listing"], [class*="item"]',
      'article, .post, .entry, .card, .tile',
      '.content-item, .event-item, .listing-item',
      'h1, h2, h3, h4, .title, .headline'
    ];

    for (const selector of eventSelectors) {
      $(selector).each((i, el) => {
        if (i > 25) return false;
        
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.listing-title', '.headline', 'a'];
        let title = '';
        
        for (const titleSel of titleSelectors) {
          title = $(el).find(titleSel).first().text().trim();
          if (title && title.length > 5) break;
        }

        if (!title) {
          const linkText = $(el).find('a').first().text().trim();
          if (linkText && linkText.length > 5) {
            title = linkText;
          }
        }

        if (!title) {
          title = $(el).text().split('\n')[0].trim();
        }

        if (!title || !isValidEvent(title)) return;

        const eventUrl = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href');
        const imageUrl = $(el).find('img').first().attr('src');
        const dateText = $(el).find('.date, .when, time, .event-date, .datetime, .start-date').first().text().trim();
        const description = $(el).find('p, .description, .excerpt, .content, .summary, .details').first().text().trim();
        const locationText = $(el).find('.location, .venue, .address, .where').first().text().trim();

        // Enhanced quality filtering
        if (!hasEventCharacteristics(title, description, dateText, eventUrl)) {
          return;
        }

        console.log(`📝 Found qualified TodoCanada event: "${title}"`);
        
        // Calculate quality score
        let qualityScore = 0;
        qualityScore += dateText ? 4 : 0;
        qualityScore += description && description.length > 50 ? 3 : description ? 1 : 0;
        qualityScore += eventUrl?.includes('event') || eventUrl?.includes('show') ? 2 : 0;
        qualityScore += locationText ? 2 : 0;
        qualityScore += title.includes('Tour') || title.includes('Festival') || title.includes('Concert') ? 2 : 0;
        qualityScore += /\d{4}/.test(title) || /\d{4}/.test(dateText) ? 1 : 0; // Has year
        qualityScore += title.length > 25 ? 1 : 0;
        
        candidateEvents.push({
          title,
          eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
          imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
          dateText,
          description: description || `Discover ${title} - one of Toronto's exciting events and activities.`,
          locationText,
          qualityScore
        });
      });
    }

    // Sort by quality score and take the best
    const events = candidateEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 15); // Limit to top 15 quality events

    console.log(`📊 Found ${candidateEvents.length} candidates, selected ${events.length} quality TodoCanada events`);

    let addedEvents = 0;
    for (const event of events) {
      try {
        let startDate, endDate;
        if (event.dateText) {
          const parsedDates = parseDateText(event.dateText);
          startDate = parsedDates.startDate;
          endDate = parsedDates.endDate;
        }

        const venue = getTodoCanadaVenue(city, event.title);
        
        // Use location text if available to improve venue info
        if (event.locationText && event.locationText.length > 3) {
          venue.name = event.locationText.split(',')[0] || venue.name;
          venue.address = event.locationText || venue.address;
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
          price: extractPrice(event.description) || 'Contact venue',
          categories: extractCategories('Entertainment, Culture, Events, Toronto'),
          source: 'TodoCanada-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['entertainment', 'culture', 'events', 'toronto'],
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
module.exports = { scrapeEvents: scrapeTodoCanadaTorontoEventsProduction  };
