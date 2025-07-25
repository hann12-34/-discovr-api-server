/**
 * Scraper for Royal Botanical Gardens (RBG) events in Toronto
 * 
 * Fetches events from RBG website
 * Follows the strict no fallback date policy
 * Uses consistent event schema with MongoDB insertion
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const RBG_EVENTS_URL = 'https://www.rbg.ca/things-to-do/events/';
const RBG_BASE_URL = 'https://www.rbg.ca';
const RBG_VENUE = {
  name: "Royal Botanical Gardens",
  address: "680 Plains Road West, Burlington, ON L7T 4H4",
  city: "Burlington",
  province: "Ontario",
  postalCode: "L7T 4H4"
};

// Check for MongoDB URI in environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Error: MONGODB_URI environment variable not set');
  process.exit(1);
}

/**
 * Generate a unique ID for the event based on venue, title and date
 * @param {string} venue - Venue name
 * @param {string} title - Event title
 * @param {Date} date - Event date 
 * @returns {string} MD5 hash of venue name, title and date
 */
function generateEventId(venue, title, date) {
  const data = `${venue}-${title}-${date.toISOString().split('T')[0]}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string} Primary category for the event
 */
function extractCategory(title, description) {
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryKeywords = {
    'Nature & Garden': ['garden', 'plant', 'flower', 'nature', 'botanical', 'bloom', 'horticulture', 'landscape', 'tree', 'forest', 'ecosystem', 'conservation'],
    'Family & Kids': ['kids', 'children', 'family', 'youth', 'young', 'child', 'teen', 'parent'],
    'Workshop & Education': ['workshop', 'learn', 'education', 'class', 'course', 'seminar', 'training', 'lecture', 'talk', 'presentation', 'teach'],
    'Art & Exhibition': ['exhibition', 'exhibit', 'gallery', 'art', 'artist', 'display', 'installation', 'photography', 'painting', 'sculpture'],
    'Music & Performance': ['music', 'concert', 'performance', 'band', 'orchestra', 'symphony', 'jazz', 'sing', 'song', 'choir'],
    'Food & Drink': ['food', 'drink', 'culinary', 'cooking', 'chef', 'taste', 'dinner', 'lunch', 'breakfast', 'brunch', 'menu', 'restaurant', 'cafe'],
    'Festival & Celebration': ['festival', 'celebration', 'holiday', 'seasonal', 'christmas', 'halloween', 'easter', 'thanksgiving'],
    'Tour & Guided': ['tour', 'guided', 'walk', 'explore', 'discovery', 'hiking', 'visit']
  };
  
  // Default category
  let bestCategory = 'Nature & Garden'; // Default for RBG events
  let highestScore = 0;
  
  // Check for matches in each category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      // Count occurrences of the keyword
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combinedText.match(regex) || [];
      score += matches.length;
    }
    
    // Check if this category is better than the current best
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }
  
  return bestCategory;
}

/**
 * Extract price information from text
 * @param {string} text - Text containing price information
 * @returns {string} Formatted price string
 */
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  // Check for free admission
  if (lowerText.includes('free') && !lowerText.includes('free with')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceRegex = /\$\s*(\d+(?:\.\d{2})?)(?:\s*-\s*\$\s*(\d+(?:\.\d{2})?))?/g;
  const matches = [...text.matchAll(priceRegex)];
  
  if (matches.length > 0) {
    const firstMatch = matches[0];
    const minPrice = firstMatch[1];
    const maxPrice = firstMatch[2];
    
    if (minPrice && maxPrice) {
      return `$${minPrice} - $${maxPrice}`;
    } else if (minPrice) {
      return `$${minPrice}`;
    }
  }
  
  return 'See website for details';
}

/**
 * Normalize relative URLs to absolute URLs
 * @param {string} url - URL to normalize
 * @returns {string} Normalized absolute URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  // Check if URL is already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Handle relative URLs
  if (url.startsWith('/')) {
    return `${RBG_BASE_URL}${url}`;
  } else {
    return `${RBG_BASE_URL}/${url}`;
  }
}

/**
 * Get month index from month name
 * @param {string} month - Month name
 * @returns {number} Zero-based month index (0-11) or -1 if invalid
 */
function getMonthIndex(month) {
  const months = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };
  
  return months[month.toLowerCase()] ?? -1;
}

/**
 * Apply time to date object
 * @param {Date} date - Date object to modify
 * @param {string} timeText - Time text from event
 * @param {string} type - Either 'start' or 'end'
 * @returns {Date} - Date object with time applied
 */
function applyTimeToDate(date, timeText, type) {
  if (!timeText) {
    // Default times if no time provided
    if (type === 'start') {
      date.setHours(9, 0, 0, 0); // 9:00 AM default start
    } else {
      date.setHours(17, 0, 0, 0); // 5:00 PM default end
    }
    return date;
  }
  
  // Extract time using regex
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i;
  const match = timeText.match(timeRegex);
  
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3].toLowerCase();
    
    // Convert to 24-hour format
    if ((period === 'pm' || period === 'p.m.') && hours < 12) {
      hours += 12;
    } else if ((period === 'am' || period === 'a.m.') && hours === 12) {
      hours = 0;
    }
    
    date.setHours(hours, minutes, 0, 0);
  } else {
    // If no match, use default times
    if (type === 'start') {
      date.setHours(9, 0, 0, 0);
    } else {
      date.setHours(17, 0, 0, 0);
    }
  }
  
  return date;
}

/**
 * Parse event dates from text
 * @param {string} dateText - Date text from event
 * @param {string} timeText - Time text from event (optional)
 * @returns {Object|null} Object containing startDate and endDate or null if parsing fails
 */
function parseEventDates(dateText, timeText = '') {
  if (!dateText) return null;
  
  // Clean up the date text
  dateText = dateText.trim();
  
  const currentYear = new Date().getFullYear();
  
  // Extract time information if it's part of dateText
  const timeParts = timeText.match(/\b(\d{1,2}(?::\d{2})?)\s*(?:am|pm|a\.m\.|p\.m\.)\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?)\s*(?:am|pm|a\.m\.|p\.m\.)/i) || [];
  const startTime = timeParts[1] || '';
  const endTime = timeParts[2] || '';
  
  // Case 1: Date range with month names (e.g., "January 1 - February 2, 2023")
  let match = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to|–)\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?/i);
  if (match) {
    const startMonth = getMonthIndex(match[1]);
    const startDay = parseInt(match[2], 10);
    const endMonth = getMonthIndex(match[3]);
    const endDay = parseInt(match[4], 10);
    const year = match[5] ? parseInt(match[5], 10) : currentYear;
    
    if (startMonth !== -1 && endMonth !== -1 && !isNaN(startDay) && !isNaN(endDay)) {
      let startYear = year;
      let endYear = year;
      
      // Handle year boundary (December to January)
      if (startMonth > endMonth) {
        endYear = startYear + 1;
      }
      
      // Create date objects
      const startDate = new Date(startYear, startMonth, startDay);
      const endDate = new Date(endYear, endMonth, endDay);
      
      // Set times
      applyTimeToDate(startDate, startTime, 'start');
      applyTimeToDate(endDate, endTime || startTime, 'end');
      
      // Make end date end of day if same as start date
      if (startDate.getTime() === endDate.getTime()) {
        endDate.setHours(23, 59, 59, 999);
      }
      
      return { startDate, endDate };
    }
  }
  
  // Case 2: Single date with year (e.g., "January 1, 2023")
  match = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const day = parseInt(match[2], 10);
    const year = match[3] ? parseInt(match[3], 10) : currentYear;
    
    if (month !== -1 && !isNaN(day)) {
      // Create date objects
      const startDate = new Date(year, month, day);
      const endDate = new Date(year, month, day);
      
      // Set times
      applyTimeToDate(startDate, startTime, 'start');
      
      if (endTime) {
        applyTimeToDate(endDate, endTime, 'end');
      } else {
        // Default to end of day
        endDate.setHours(23, 59, 59, 999);
      }
      
      return { startDate, endDate };
    }
  }
  
  // Case 3: Month and year only (e.g., "January 2023")
  match = dateText.match(/([A-Za-z]+)\s+(\d{4})/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const year = parseInt(match[2], 10);
    
    if (month !== -1 && !isNaN(year)) {
      // Create date objects - assume full month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month
      
      // Set times
      applyTimeToDate(startDate, startTime, 'start');
      applyTimeToDate(endDate, endTime, 'end');
      
      return { startDate, endDate };
    }
  }
  
  return null;
}

/**
 * Process a potential event candidate
 * @param {string} title - Event title
 * @param {string} dateText - Date text
 * @param {string} timeText - Time text
 * @param {string} description - Event description
 * @param {string} eventUrl - Event URL
 * @param {string} imageUrl - Event image URL
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of already processed event IDs
 * @returns {Promise<boolean>} - Promise that resolves to true if event was added
 */
async function processEventCandidate(title, dateText, timeText, description, eventUrl, imageUrl, eventsCollection, processedEventIds) {
  try {
    // Skip if missing title or date text
    if (!title || !dateText) {
      console.log(`⚠️ Skipping event - missing title or date text`);
      return false;
    }
    
    // Parse dates
    const dates = parseEventDates(dateText, timeText);
    if (!dates) {
      console.log(`⚠️ Skipping event "${title}" - could not parse date: ${dateText}`);
      return false;
    }
    
    // Generate event ID
    const eventId = generateEventId(RBG_VENUE.name, title, dates.startDate);
    
    // Skip if already processed
    if (processedEventIds.has(eventId)) {
      console.log(`⚠️ Skipping duplicate event: ${title}`);
      return false;
    }
    
    // Mark as processed
    processedEventIds.add(eventId);
    
    // Extract price from description
    const price = extractPrice(description);
    
    // Extract category
    const category = extractCategory(title, description);
    
    // Create event object
    const event = {
      _id: eventId,
      title: title,
      description: description,
      startDate: dates.startDate,
      endDate: dates.endDate,
      venue: RBG_VENUE,
      url: normalizeUrl(eventUrl),
      imageUrl: normalizeUrl(imageUrl),
      price: price,
      category: category,
      scrapedAt: new Date()
    };
    
    // Insert into MongoDB
    try {
      await eventsCollection.updateOne(
        { _id: eventId },
        { $set: event },
        { upsert: true }
      );
      
      console.log(`✅ Added/updated event: ${title}`);
      return true;
    } catch (err) {
      console.error(`❌ Error saving event ${title}: ${err.message}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing event candidate: ${error.message}`);
    return false;
  }
}

/**
 * Process structured data event from JSON-LD
 * @param {Object} eventData - Event data from JSON-LD
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of already processed event IDs
 * @returns {Promise<boolean>} - Promise that resolves to true if event was added
 */
async function processStructuredEvent(eventData, eventsCollection, processedEventIds) {
  try {
    // Extract basic event details
    const title = eventData.name || '';
    
    if (!title) {
      console.log(`⚠️ Skipping structured event - missing title`);
      return false;
    }
    
    // Extract dates
    let startDate = null;
    let endDate = null;
    
    // Try to parse startDate
    if (eventData.startDate) {
      startDate = new Date(eventData.startDate);
    }
    
    // Try to parse endDate
    if (eventData.endDate) {
      endDate = new Date(eventData.endDate);
    } else if (startDate) {
      // If no end date but we have start date, default to end of the same day
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Skip if we couldn't parse dates
    if (!startDate || !endDate) {
      console.log(`⚠️ Skipping structured event "${title}" - missing valid dates`);
      return false;
    }
    
    // Generate event ID
    const eventId = generateEventId(RBG_VENUE.name, title, startDate);
    
    // Skip if already processed
    if (processedEventIds.has(eventId)) {
      console.log(`⚠️ Skipping duplicate structured event: ${title}`);
      return false;
    }
    
    // Mark as processed
    processedEventIds.add(eventId);
    
    // Extract other details
    const description = eventData.description || '';
    const imageUrl = eventData.image || '';
    const eventUrl = eventData.url || '';
    
    // Extract price
    let price = 'See website for details';
    if (eventData.offers) {
      const offers = Array.isArray(eventData.offers) ? eventData.offers : [eventData.offers];
      const priceInfo = offers.map(offer => {
        if (offer.price && offer.priceCurrency) {
          return `${offer.priceCurrency === 'USD' ? '$' : offer.priceCurrency}${offer.price}`;
        } else if (offer.price) {
          return `$${offer.price}`;
        }
        return null;
      }).filter(Boolean);
      
      if (priceInfo.length > 0) {
        price = priceInfo.join(' - ');
      } else if (offers.some(offer => offer.availability === 'http://schema.org/Free')) {
        price = 'Free';
      }
    }
    
    // Extract category
    const category = extractCategory(title, description);
    
    // Create event object
    const event = {
      _id: eventId,
      title: title,
      description: description,
      startDate: startDate,
      endDate: endDate,
      venue: RBG_VENUE,
      url: normalizeUrl(eventUrl),
      imageUrl: normalizeUrl(imageUrl),
      price: price,
      category: category,
      scrapedAt: new Date()
    };
    
    // Insert into MongoDB
    try {
      await eventsCollection.updateOne(
        { _id: eventId },
        { $set: event },
        { upsert: true }
      );
      
      console.log(`✅ Added/updated structured event: ${title}`);
      return true;
    } catch (err) {
      console.error(`❌ Error saving structured event ${title}: ${err.message}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing structured event: ${error.message}`);
    return false;
  }
}

/**
 * Fetch and process events from RBG website
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of already processed event IDs
 * @returns {Promise<number>} - Promise that resolves to number of added events
 */
async function fetchEventsFromURL(eventsCollection, processedEventIds) {
  try {
    console.log(`🔍 Fetching events from ${RBG_EVENTS_URL}...`);
    const response = await axios.get(RBG_EVENTS_URL, { timeout: 30000 });
    const html = response.data;
    const $ = cheerio.load(html);
    
    let addedEvents = 0;
    
    // Method 1: Look for event links
    console.log('📋 Searching for event links...');
    const eventLinks = $('a[href*="event"], a[href*="program"]').toArray();
    console.log(`Found ${eventLinks.length} potential event links`);
    
    for (let i = 0; i < eventLinks.length; i++) {
      try {
        const linkElement = $(eventLinks[i]);
        const href = linkElement.attr('href') || '';
        const linkText = linkElement.text().trim();
        
        if (!linkText || linkText.length < 3) continue;
        
        // Look for date patterns in surrounding text
        const parent = linkElement.parent();
        const parentText = parent.text();
        const nextSibling = linkElement.next();
        const nextText = nextSibling.text();
        
        // Try to extract date from various sources
        const dateRegex1 = /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*-\s*[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?)?(?:,\s*\d{4})?)/g;
        const dateRegex2 = /\b(\d{1,2}\s+[A-Za-z]+(?:\s+to\s+\d{1,2}\s+[A-Za-z]+)?(?:,\s*\d{4})?)/g;
        
        let dateText = '';
        let match = parentText.match(dateRegex1) || parentText.match(dateRegex2);
        if (match) {
          dateText = match[0];
        } else {
          match = nextText.match(dateRegex1) || nextText.match(dateRegex2);
          if (match) {
            dateText = match[0];
          }
        }
        
        if (dateText) {
          const description = parentText || nextText || '';
          const success = await processEventCandidate(
            linkText,
            dateText,
            '',
            description,
            href,
            '',
            eventsCollection,
            processedEventIds
          );
          
          if (success) addedEvents++;
        }
      } catch (error) {
        console.error(`Error processing event link: ${error.message}`);
      }
    }
    
    // Method 2: Look for structured data (JSON-LD)
    console.log('📋 Searching for structured data...');
    const structuredDataElements = $('script[type="application/ld+json"]').toArray();
    console.log(`Found ${structuredDataElements.length} structured data elements`);
    
    for (let i = 0; i < structuredDataElements.length; i++) {
      try {
        const jsonText = $(structuredDataElements[i]).html();
        if (!jsonText) continue;
        
        const data = JSON.parse(jsonText);
        
        // Handle arrays of structured data
        const events = Array.isArray(data) ? data : [data];
        
        for (const item of events) {
          if (item['@type'] === 'Event') {
            const success = await processStructuredEvent(item, eventsCollection, processedEventIds);
            if (success) addedEvents++;
          }
        }
      } catch (error) {
        console.error(`Error processing structured data: ${error.message}`);
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new RBG events`);
    return addedEvents;
    
  } catch (error) {
    console.error(`❌ Error fetching events: ${error.message}`);
    return 0;
  }
}

/**
 * Main function to scrape RBG events
 * @returns {Promise<void>}
 */
async function scrapeRBGEvents() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // _id is unique by default, no need to create index
    
    console.log('🚀 Starting RBG event scraping...');
    
    const processedEventIds = new Set();
    const addedEvents = await fetchEventsFromURL(eventsCollection, processedEventIds);
    
    console.log(`\n📈 Scraping completed!`);
    console.log(`📊 Total events processed: ${processedEventIds.size}`);
    console.log(`✅ New events added: ${addedEvents}`);
    
  } catch (error) {
    console.error(`❌ Error in scrapeRBGEvents: ${error.message}`);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the scraper
scrapeRBGEvents().catch(console.error);
