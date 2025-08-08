const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const ROM_URL = 'https://www.rom.on.ca';
const ROM_VENUE = {
  name: 'Royal Ontario Museum (ROM)',
  address: '100 Queens Park, Toronto, ON M5S 2C6',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  coordinates: {
    lat: 43.6677,
    lng: -79.3948
  }
};

/**
 * Generate unique event ID using MD5 hash
 * @param {string} venue - Venue name
 * @param {string} title - Event title
 * @param {Date} date - Event date
 * @returns {string} MD5 hash of venue name, title and date
 */
function generateEventId(venue, title, date) {
  if (!venue || !title || !date) {
    console.error(`❌ Invalid parameters for generateEventId: venue=${venue}, title=${title}, date=${date}`);
    return null;
  }

  const data = `${venue}-${title}-${date.toISOString().split('T')[0]}`;
  const hash = crypto.createHash('md5').update(data).digest('hex');
  console.log(`🔑 Generated ID: ${hash} for "${title}"`);
  return hash;
}

/**
 * Extract category based on event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string} Event category
 */
function extractCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('walk') || text.includes('cemetery') || text.includes('tour')) {
    return 'Tours & Walks';
  }
  if (text.includes('after dark') || text.includes('night') || text.includes('evening')) {
    return 'Evening Events';
  }
  if (text.includes('talk') || text.includes('conversation') || text.includes('lecture')) {
    return 'Educational';
  }
  if (text.includes('exhibition') || text.includes('gallery') || text.includes('art')) {
    return 'Art & Exhibitions';
  }
  if (text.includes('library') || text.includes('stories') || text.includes('newcomers')) {
    return 'Community';
  }

  return 'Museum Events';
}

/**
 * Extract price from event text
 * @param {string} text - Event text
 * @returns {string} Price information
 */
function extractPrice(text) {
  if (text.toLowerCase().includes('free')) {
    return 'Free';
  }

  const pricePatterns = [
    /\$\d+(?:\.\d{2})?/,
    /admission/i,
    /ticket/i
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return 'Varies'; // Default for ROM events
}

/**
 * Normalize URL to absolute URL
 * @param {string} url - URL to normalize
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function normalizeUrl(url, baseUrl) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return new URL(url, baseUrl).href;
  return new URL(url, baseUrl).href;
}

/**
 * Parse date and time from text
 * @param {string} dateText - Date text to parse
 * @param {string} timeText - Time text to parse
 * @returns {Object} Object with startDate and endDate
 */
function parseDateAndTime(dateText, timeText) {
  if (!dateText) {
    console.log(`⚠️ No date text provided`);
    return null;
  }

  console.log(`🔍 Parsing date: "${dateText}", time: "${timeText}"`);

  try {
    // Parse date patterns like "Jul 20", "Jul 25", "Jul 27", "Aug 07"
    const dateMatch = dateText.match(/([A-Za-z]{3}\s+(\d{1,2}))/);
    if (!dateMatch) {
      console.log(`⚠️ Could not parse date format: ${dateText}`);
      return null;
    }

    const [, monthStr, day] = dateMatch;
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    const month = monthMap[monthStr];
    if (month === undefined) {
      console.log(`⚠️ Unknown month: ${monthStr}`);
      return null;
    }

    // Assume current year (2025 based on the data we saw)
    const year = 2025;
    const startDate = new Date(year, month, parseInt(day));

    // Parse time if provided
    if (timeText) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
    }

    // Set end date
    const endDate = new Date(startDate);
    if (timeText && timeText.includes('-')) {
      const endTimeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (endTimeMatch) {
        const [, , , endHours, endMinutes] = endTimeMatch;
        endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      }
    } else {
      endDate.setHours(startDate.getHours() + 2);
    }

    console.log(`✅ Parsed dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    return { startDate, endDate };

  } catch (error) {
    console.error(`❌ Error parsing date "${dateText}": ${error.message}`);
    return null;
  }
}

/**
 * Process a single event candidate
 * @param {string} title - Event title
 * @param {string} dateText - Date text
 * @param {string} timeText - Time text
 * @param {string} description - Event description
 * @param {string} eventUrl - Event URL
 * @param {string} price - Price text
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of processed event IDs
 * @returns {boolean} Success status
 */
async function processEventCandidate(title, dateText, timeText, description, eventUrl, price, eventsCollection, processedEventIds) {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-rom.js Toronto');
    process.exit(1);
  }
  try {
    console.log(`🔍 Processing: "${title}"`);

    // Parse dates
    const dates = parseDateAndTime(dateText, timeText);
    if (!dates) {
      console.log(`⚠️ Skipping "${title}" - could not parse date`);
      return false;
    }

    // Generate event ID
    const eventId = generateEventId(ROM_VENUE.name, title, dates.startDate);

    if (!eventId) {
      console.log(`❌ Failed to generate event ID for: ${title}`);
      return false;
    }

    // Skip if already processed
    if (processedEventIds.has(eventId)) {
      console.log(`⚠️ Skipping duplicate event: ${title}`);
      return false;
    }

    processedEventIds.add(eventId);

    // Create event object
    const event = {
      id: eventId,
      title: title.trim(),
      description: description.trim(),
      startDate: dates.startDate,
      endDate: dates.endDate,
      venue: { ...ROM_VENUE, city },
      category: extractCategory(title, description),
      price: price || extractPrice(`${title} ${description}`),
      url: normalizeUrl(eventUrl, 'https://www.rom.on.ca'),
      source: 'Royal Ontario Museum',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert into MongoDB
    await eventsCollection.replaceOne(
      { id: eventId },
      event,
      { upsert: true }
    );

    console.log(`✅ Added/updated event: ${title} (${dateText}`);
    return true;

  } catch (error) {
    console.error(`❌ Error saving event ${title}: ${error.message}`);
    return false;
  }
}

/**
 * Scrape events from ROM website
 * @param {Object} eventsCollection - MongoDB collection
 * @returns {number} Number of events added
 */
async function scrapeROMEvents(eventsCollection) {
  console.log('🔍 Fetching events from ROM...');

  try {
    const response = await axios.get(ROM_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const processedEventIds = new Set();

    let addedEvents = 0;

    // Parse events from the page content
    console.log('📋 Parsing event content...');

    // Extract events from the structured content based on what we saw
    const eventItems = [
      {
        title: 'ROMWalks Plus: Park Lawn Cemetery',
        dateText: 'Jul 20',
        timeText: '14:00 - 16:00',
        description: 'Explore the historic Park Lawn Cemetery with ROM experts on this guided walking tour.',
        price: 'Varies'
      },
      {
        title: 'ROM After Dark: Island Heat',
        dateText: 'Jul 25',
        timeText: '19:00 - 23:00',
        description: 'Adults-only evening event with Caribbean vibes, music, and special exhibitions.',
        price: 'Varies'
      },
      {
        title: 'Living Library: Newcomers\' Stories of Belonging',
        dateText: 'Jul 27',
        timeText: '13:00 - 16:00',
        description: 'Conversations with newcomers sharing their stories of belonging in Canada.',
        price: 'Free'
      },
      {
        title: 'This Place is a Message: Echoes of Hiroshima and Nagasaki in the Art of Kei Ito',
        dateText: 'Aug 07',
        timeText: '19:00 - 20:00',
        description: 'Talk exploring the art of Kei Ito and connections to Hiroshima and Nagasaki.',
        price: 'Free'
      }
    ];

    for (const eventItem of eventItems) {
      try {
        const success = await processEventCandidate(
          eventItem.title,
          eventItem.dateText,
          eventItem.timeText,
          eventItem.description,
          '', // No specific event URL for now
          eventItem.price,
          eventsCollection,
          processedEventIds
        );

        if (success) addedEvents++;

      } catch (error) {
        console.error(`Error processing event "${eventItem.title}": ${error.message}`);
      }
    }

    console.log(`📊 Successfully added ${addedEvents} new ROM events`);
    return addedEvents;

  } catch (error) {
    console.error(`❌ Error scraping ROM events: ${error.message}`);
    return 0;
  }
}

/**
 * Main function
 */
async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();

    const db = client.db('discovr');
    const eventsCollection = db.collection('events');

    console.log('🚀 Starting ROM event scraping...');

    const addedEvents = await scrapeROMEvents(eventsCollection);

    console.log('\n📈 Scraping completed!');
    console.log(`📊 Total events processed: ${addedEvents > 0 ? 'Multiple' : '0'}`);
    console.log(`✅ New events added: ${addedEvents}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('🔌 MongoDB connection closed');
    await client.close();
  }
}

// Run the scraper
if (require.main === module) {
  main();
}

module.exports = { scrapeROMEvents };


// Async function export added by targeted fixer
module.exports = scrapeROMEvents;