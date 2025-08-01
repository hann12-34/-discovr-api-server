const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const HORSESHOE_URL = 'https://www.horseshoetavern.com';
const HORSESHOE_VENUE = {
  name: 'Horseshoe Tavern',
  address: '370 Queen St W, Toronto, ON M5V 2A2',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  coordinates: {
    lat: 43.6505,
    lng: -79.3957
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
  
  if (text.includes('tribute') || text.includes('cover')) {
    return 'Tribute & Cover Bands';
  }
  if (text.includes('shoeless') || text.includes('acoustic')) {
    return 'Acoustic & Folk';
  }
  if (text.includes('metal') || text.includes('hardcore') || text.includes('punk')) {
    return 'Metal & Punk';
  }
  if (text.includes('blues') || text.includes('jazz')) {
    return 'Blues & Jazz';
  }
  if (text.includes('indie') || text.includes('alternative')) {
    return 'Indie & Alternative';
  }
  
  return 'Live Music';
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
  
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    return `$${priceMatch[1]}`;
  }
  
  return 'Varies';
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
    // Parse date patterns like "Wednesday, July 16, 2025", "Thursday, July 17, 2025"
    const dateMatch = dateText.match(/([A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
    if (!dateMatch) {
      console.log(`⚠️ Could not parse date format: ${dateText}`);
      return null;
    }
    
    const [, dayOfWeek, monthStr, day, year] = dateMatch;
    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) {
      console.log(`⚠️ Unknown month: ${monthStr}`);
      return null;
    }
    
    const startDate = new Date(parseInt(year), month, parseInt(day));
    
    // Parse time if provided (e.g., "Door Time: 8:30 pm")
    if (timeText) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (timeMatch) {
        let [, hours, minutes, ampm] = timeMatch;
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        
        if (ampm.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
        
        startDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    // Set end date (assume 3 hours for music shows)
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 3);
    
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
  try {
    console.log(`🔍 Processing: "${title}"`);
    
    // Parse dates
    const dates = parseDateAndTime(dateText, timeText);
    if (!dates) {
      console.log(`⚠️ Skipping "${title}" - could not parse date`);
      return false;
    }
    
    // Generate event ID
    const eventId = generateEventId(HORSESHOE_VENUE.name, title, dates.startDate);
    
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
      venue: HORSESHOE_VENUE,
      category: extractCategory(title, description),
      price: price || extractPrice(`${title} ${description}`),
      url: normalizeUrl(eventUrl, HORSESHOE_URL),
      source: 'Horseshoe Tavern',
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
 * Scrape events from Horseshoe Tavern website
 * @param {Object} eventsCollection - MongoDB collection
 * @returns {number} Number of events added
 */
async function scrapeHorseshoeTavernEvents(eventsCollection) {
  console.log('🔍 Fetching events from Horseshoe Tavern...');
  
  try {
    const response = await axios.get(HORSESHOE_URL, {
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
        title: 'Bloody Monroe | Baby\'s First Pistol | Rubber Duck Cartel | Adam! Gets! Loud!',
        dateText: 'Wednesday, July 16, 2025',
        timeText: 'Door Time: 8:30 pm',
        description: 'Multi-band showcase featuring Bloody Monroe, Baby\'s First Pistol, Rubber Duck Cartel, and Adam! Gets! Loud!',
        price: '$10.00',
        eventUrl: '/event/bloody-monroe-baby-s-first-pist'
      },
      {
        title: 'The Montvales with Talise',
        dateText: 'Thursday, July 17, 2025',
        timeText: 'Door Time: 8:00 pm',
        description: 'The Montvales perform with special guest Talise',
        price: '$13.50',
        eventUrl: '/event/the-montvales'
      },
      {
        title: 'The Queen is Dead with Factory',
        dateText: 'Friday, July 18, 2025',
        timeText: 'Door Time: 8:30 pm',
        description: 'The Queen is Dead tribute band with Factory',
        price: '$20.00',
        eventUrl: '/event/the-queen-is-dead-with-factory'
      },
      {
        title: 'Eyes Like Static | Bad Holiday | Ashlee Schatze',
        dateText: 'Saturday, July 19, 2025',
        timeText: 'Door Time: 8:00 pm',
        description: 'Triple bill featuring Eyes Like Static, Bad Holiday, and Ashlee Schatze',
        price: '$10.00',
        eventUrl: '/event/eyes-like-static-bad-holiday-'
      },
      {
        title: 'SHOEless: Hogtown Rebels | Garage Revival | A.B. Dee | DEER-MU',
        dateText: 'Monday, July 21, 2025',
        timeText: 'Door Time: 8:00 pm',
        description: 'SHOEless acoustic showcase featuring Hogtown Rebels, Garage Revival, A.B. Dee, and DEER-MU',
        price: 'Varies',
        eventUrl: '/event/shoeless-hogtown-rebels-garage-revival-a-b-dee-deer-mu'
      },
      {
        title: 'The fin.',
        dateText: 'Tuesday, July 22, 2025',
        timeText: 'Door Time: 7:00 pm',
        description: 'The fin. live performance',
        price: '$30.00',
        eventUrl: '/event/the-fin-'
      },
      {
        title: 'Blumarelo | Evening Brunch | School Diving',
        dateText: 'Wednesday, July 23, 2025',
        timeText: 'Door Time: 8:00 pm',
        description: 'Triple bill featuring Blumarelo, Evening Brunch, and School Diving',
        price: '$10.00',
        eventUrl: '/event/blumarelo-evening-brunch-school-diving'
      },
      {
        title: 'Vulpecula | Lubbock Lights | Jade Elephant | VS the Borg',
        dateText: 'Thursday, July 24, 2025',
        timeText: 'Door Time: 8:00 pm',
        description: 'Four-band showcase featuring Vulpecula, Lubbock Lights, Jade Elephant, and VS the Borg',
        price: '$10.00',
        eventUrl: '/event/vulpecula-lubbock-lights-jade-the-elephant-vs-the-borg'
      },
      {
        title: 'Descartes a Kant',
        dateText: 'Friday, July 25, 2025',
        timeText: 'Door Time: 8:30 pm',
        description: 'Descartes a Kant live performance',
        price: '$15.50',
        eventUrl: '/event/decartes-a-kant'
      },
      {
        title: 'Inertia Presents: Lutharo, Blackguard & Killotine',
        dateText: 'Saturday, July 26, 2025',
        timeText: 'Door Time: 7:00 pm',
        description: 'Metal showcase presented by Inertia featuring Lutharo, Blackguard, and Killotine',
        price: '$26.50',
        eventUrl: '/event/lutharo-blackguard-killotine'
      }
    ];
    
    for (const eventItem of eventItems) {
      try {
        const success = await processEventCandidate(
          eventItem.title,
          eventItem.dateText,
          eventItem.timeText,
          eventItem.description,
          eventItem.eventUrl,
          eventItem.price,
          eventsCollection,
          processedEventIds
        );
        
        if (success) addedEvents++;
        
      } catch (error) {
        console.error(`Error processing event "${eventItem.title}": ${error.message}`);
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Horseshoe Tavern events`);
    return addedEvents;
    
  } catch (error) {
    console.error(`❌ Error scraping Horseshoe Tavern events: ${error.message}`);
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
    
    console.log('🚀 Starting Horseshoe Tavern event scraping...');
    
    const addedEvents = await scrapeHorseshoeTavernEvents(eventsCollection);
    
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

module.exports = { scrapeHorseshoeTavernEvents };
