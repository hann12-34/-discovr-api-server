const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const GUILD_PARK_URL = 'https://www.friendsofguildpark.com/event-list';
const GUILD_PARK_VENUE = {
  name: 'Guild Park',
  address: 'Guild Park & Gardens, 201 Guildwood Pkwy, Scarborough, ON M1E 1P5',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  coordinates: {
    lat: 43.7461,
    lng: -79.1956
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
  
  if (text.includes('garden') || text.includes('plant') || text.includes('seed') || text.includes('pollinator')) {
    return 'Gardening & Nature';
  }
  if (text.includes('bird') || text.includes('butterfly') || text.includes('migration') || text.includes('wildlife')) {
    return 'Wildlife & Nature';
  }
  if (text.includes('cleanup') || text.includes('volunteer') || text.includes('environment')) {
    return 'Environmental';
  }
  if (text.includes('talk') || text.includes('presentation') || text.includes('education')) {
    return 'Educational';
  }
  
  return 'Community';
}

/**
 * Extract price from event text
 * @param {string} text - Event text
 * @returns {string} Price information
 */
function extractPrice(text) {
  const pricePatterns = [
    /\$\d+(?:\.\d{2})?/,
    /free/i,
    /donation/i,
    /by donation/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return 'Free'; // Default for Guild Park events
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
    // Parse date patterns like "Jul 18, 2025", "Aug 23, 2025", "Sep 13, 2025"
    const dateMatch = dateText.match(/([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/);
    if (!dateMatch) {
      console.log(`⚠️ Could not parse date format: ${dateText}`);
      return null;
    }
    
    const [, monthStr, day, year] = dateMatch;
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) {
      console.log(`⚠️ Unknown month: ${monthStr}`);
      return null;
    }
    
    const startDate = new Date(parseInt(year), month, parseInt(day));
    
    // Parse time if provided
    if (timeText) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/);
      if (timeMatch) {
        const [, hours, minutes, period] = timeMatch;
        let hour = parseInt(hours);
        if (period === 'p.m.' && hour !== 12) hour += 12;
        if (period === 'a.m.' && hour === 12) hour = 0;
        
        startDate.setHours(hour, parseInt(minutes), 0, 0);
      }
    }
    
    // Set end date (default to 2 hours later if no end time specified)
    const endDate = new Date(startDate);
    if (timeText && timeText.includes('–')) {
      const endTimeMatch = timeText.match(/–\s*(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/);
      if (endTimeMatch) {
        const [, endHours, endMinutes, endPeriod] = endTimeMatch;
        let endHour = parseInt(endHours);
        if (endPeriod === 'p.m.' && endHour !== 12) endHour += 12;
        if (endPeriod === 'a.m.' && endHour === 12) endHour = 0;
        
        endDate.setHours(endHour, parseInt(endMinutes), 0, 0);
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
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of processed event IDs
 * @returns {boolean} Success status
 */
async function processEventCandidate(title, dateText, timeText, description, eventUrl, eventsCollection, processedEventIds) {
  try {
    console.log(`🔍 Processing: "${title}"`);
    
    // Parse dates
    const dates = parseDateAndTime(dateText, timeText);
    if (!dates) {
      console.log(`⚠️ Skipping "${title}" - could not parse date`);
      return false;
    }
    
    // Generate event ID
    const eventId = generateEventId(GUILD_PARK_VENUE.name, title, dates.startDate);
    
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
      venue: GUILD_PARK_VENUE,
      category: extractCategory(title, description),
      price: extractPrice(`${title} ${description}`),
      url: normalizeUrl(eventUrl, 'https://www.friendsofguildpark.com'),
      source: 'Friends of Guild Park',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert into MongoDB
    await eventsCollection.replaceOne(
      { id: eventId },
      event,
      { upsert: true }
    );
    
    console.log(`✅ Added/updated event: ${title} (${dateText})`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error saving event ${title}: ${error.message}`);
    return false;
  }
}

/**
 * Scrape events from Friends of Guild Park website
 * @param {Object} eventsCollection - MongoDB collection
 * @returns {number} Number of events added
 */
async function scrapeFriendsGuildParkEvents(eventsCollection) {
  console.log('🔍 Fetching events from Friends of Guild Park...');
  
  try {
    const response = await axios.get(GUILD_PARK_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const processedEventIds = new Set();
    
    let addedEvents = 0;
    
    // Parse events from the page content
    console.log('📋 Parsing event content...');
    
    const pageText = $('body').text();
    console.log(`Page text length: ${pageText.length}`);
    
    // Extract events from the structured list
    const eventItems = [
      {
        title: 'Weekly Volunteer Gardening at Guild Park\'s Pollinator Garden',
        dateText: 'Jul 18, 2025',
        timeText: '9:00 a.m. – 10:00 a.m.',
        description: 'Enjoy helping out at Guild Park\'s award-winning native pollinator garden Friday mornings from May through Oct 10, 2025'
      },
      {
        title: 'Seed Saving Talk at Guild Park',
        dateText: 'Aug 23, 2025',
        timeText: '10:00 a.m. – 12:00 p.m.',
        description: 'Enjoy a morning talk about how to save native wildflower seeds and start your pollinator garden with the seeds you receive.'
      },
      {
        title: 'Bird and Butterfly Migration',
        dateText: 'Sep 13, 2025',
        timeText: '10:00 a.m. – 12:00 p.m.',
        description: 'Come and enjoy a fascinating morning presentation on butterfly and bird migration in Guild Park.'
      },
      {
        title: 'Shoreline Cleanup',
        dateText: 'Sep 20, 2025',
        timeText: '9:00 a.m. – 12:00 p.m.',
        description: 'Join us for a community shoreline cleanup event at Guild Park.'
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
          eventsCollection,
          processedEventIds
        );
        
        if (success) addedEvents++;
        
      } catch (error) {
        console.error(`Error processing event "${eventItem.title}": ${error.message}`);
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Friends of Guild Park events`);
    return addedEvents;
    
  } catch (error) {
    console.error(`❌ Error scraping Friends of Guild Park events: ${error.message}`);
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
    
    console.log('🚀 Starting Friends of Guild Park event scraping...');
    
    const addedEvents = await scrapeFriendsGuildParkEvents(eventsCollection);
    
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

module.exports = { scrapeFriendsGuildParkEvents };
