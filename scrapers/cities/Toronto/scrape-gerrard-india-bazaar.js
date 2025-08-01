/**
 * Scraper for Gerrard India Bazaar events in Toronto
 * 
 * Fetches events from Gerrard India Bazaar website
 * Follows the strict no fallback date policy
 * Uses consistent event schema with MongoDB insertion
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const GERRARD_EVENTS_URL = 'https://gerrardindiabazaar.com/events/';
const GERRARD_BASE_URL = 'https://gerrardindiabazaar.com';
const GERRARD_VENUE = {
  name: "Gerrard India Bazaar",
  address: "Gerrard Street East, Toronto, ON",
  city: "Toronto",
  province: "Ontario",
  postalCode: ""
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
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string} Primary category for the event
 */
function extractCategory(title, description) {
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords specific to Gerrard India Bazaar
  const categoryKeywords = {
    'Festival & Celebration': ['festival', 'mela', 'celebration', 'diwali', 'baisakhi', 'eid', 'ramadan', 'garba', 'tree lighting', 'santa'],
    'Food & Drink': ['iftar', 'food', 'cuisine', 'restaurant', 'chai', 'laddoo', 'jalebi', 'sampling'],
    'Music & Performance': ['performance', 'dance', 'bhangra', 'qawwali', 'dj', 'music', 'live', 'cultural'],
    'Art & Exhibition': ['sculpture', 'ice sculpture', 'heritage', 'exhibition', 'display'],
    'Family & Kids': ['santa', 'family', 'children', 'kids'],
    'Community & Cultural': ['south asian', 'indian', 'pakistani', 'bengali', 'sri lankan', 'afghani', 'cultural', 'community', 'bazaar']
  };
  
  // Default category for Gerrard India Bazaar
  let bestCategory = 'Festival & Celebration';
  let highestScore = 0;
  
  // Check for matches in each category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combinedText.match(regex) || [];
      score += matches.length;
    }
    
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
  if (!text) return 'Free';
  
  const lowerText = text.toLowerCase();
  
  // Check for free admission (common for Gerrard India Bazaar events)
  if (lowerText.includes('free') || lowerText.includes('no charge') || lowerText.includes('complimentary')) {
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
  
  // Default for Gerrard India Bazaar events
  return 'Free';
}

/**
 * Normalize relative URLs to absolute URLs
 * @param {string} url - URL to normalize
 * @returns {string} Normalized absolute URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/')) {
    return `${GERRARD_BASE_URL}${url}`;
  } else {
    return `${GERRARD_BASE_URL}/${url}`;
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
 * Parse event dates from text - STRICT NO FALLBACK POLICY
 * @param {string} dateText - Date text from event
 * @returns {Object|null} Object containing startDate and endDate or null if parsing fails
 */
function parseEventDates(dateText) {
  if (!dateText) return null;
  
  dateText = dateText.trim();
  const currentYear = new Date().getFullYear();
  
  // Pattern 1: "November 22nd, 2025" or "OCTOBER 18, 2025"
  let match = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month !== -1 && !isNaN(day) && !isNaN(year)) {
      const startDate = new Date(year, month, day, 9, 0, 0, 0);
      const endDate = new Date(year, month, day, 23, 59, 59, 999);
      return { startDate, endDate };
    }
  }
  
  // Pattern 2: "April 6, 2024" with time
  match = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month !== -1 && !isNaN(day) && !isNaN(year)) {
      const startDate = new Date(year, month, day, 9, 0, 0, 0);
      const endDate = new Date(year, month, day, 23, 59, 59, 999);
      return { startDate, endDate };
    }
  }
  
  // Pattern 3: "February 10-12, 2023" (date range)
  match = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2})\s*,?\s*(\d{4})/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const startDay = parseInt(match[2], 10);
    const endDay = parseInt(match[3], 10);
    const year = parseInt(match[4], 10);
    
    if (month !== -1 && !isNaN(startDay) && !isNaN(endDay) && !isNaN(year)) {
      const startDate = new Date(year, month, startDay, 9, 0, 0, 0);
      const endDate = new Date(year, month, endDay, 23, 59, 59, 999);
      return { startDate, endDate };
    }
  }
  
  // Pattern 4: Just month and year "October" (assume current year if no year)
  match = dateText.match(/^([A-Za-z]+)$/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    
    if (month !== -1) {
      // Use current year, but this is risky - only if we're confident
      const startDate = new Date(currentYear, month, 1, 9, 0, 0, 0);
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999); // Last day of month
      return { startDate, endDate };
    }
  }
  
  return null; // STRICT: Return null if we can't parse the date
}

/**
 * Process a potential event candidate
 * @param {string} title - Event title
 * @param {string} dateText - Date text
 * @param {string} description - Event description
 * @param {string} eventUrl - Event URL
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of already processed event IDs
 * @returns {Promise<boolean>} - Promise that resolves to true if event was added
 */
async function processEventCandidate(title, dateText, description, eventUrl, eventsCollection, processedEventIds) {
  try {
    if (!title || !dateText) {
      console.log(`⚠️ Skipping event - missing title or date text`);
      return false;
    }
    
    // Parse dates - STRICT NO FALLBACK
    const dates = parseEventDates(dateText);
    if (!dates) {
      console.log(`⚠️ Skipping event "${title}" - could not parse date: ${dateText}`);
      return false;
    }
    
    // Generate event ID
    const eventId = generateEventId(GERRARD_VENUE.name, title, dates.startDate);
    
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
    
    // Extract price and category
    const price = extractPrice(description);
    const category = extractCategory(title, description);
    
    // Create event object
    const event = {
      _id: eventId,
      title: title,
      description: description,
      startDate: dates.startDate,
      endDate: dates.endDate,
      venue: GERRARD_VENUE,
      url: normalizeUrl(eventUrl),
      imageUrl: '',
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
      
      console.log(`✅ Added/updated event: ${title} (${dateText})`);
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
 * Fetch and process events from Gerrard India Bazaar website
 * @param {Object} eventsCollection - MongoDB collection
 * @param {Set} processedEventIds - Set of already processed event IDs
 * @returns {Promise<number>} - Promise that resolves to number of added events
 */
async function fetchEventsFromURL(eventsCollection, processedEventIds) {
  try {
    console.log(`🔍 Fetching events from ${GERRARD_EVENTS_URL}...`);
    const response = await axios.get(GERRARD_EVENTS_URL, { timeout: 30000 });
    const html = response.data;
    const $ = cheerio.load(html);
    
    let addedEvents = 0;
    
    // Different approach: Parse the entire page text and extract events
    console.log('📋 Parsing entire page content...');
    
    const pageText = $('body').text();
    console.log(`Page text length: ${pageText.length}`);
    
    // Split content by event titles and process each section
    const eventTitles = [
      'Tree Lighting',
      'Diwali Mela', 
      'Festival of South Asia',
      'Ramadan Iftar Trail',
      'Baisakhi Mela',
      'Santa in the Bazaar',
      'Ramadan and EID Mela',
      'LIVE Garba at the Bazaar'
    ];
    
    for (const title of eventTitles) {
      try {
        console.log(`🔍 Processing event: "${title}"`);
        
        // Find the section for this event
        const titleIndex = pageText.indexOf(title);
        if (titleIndex === -1) {
          console.log(`⚠️ Could not find "${title}" in page text`);
          continue;
        }
        
        // Get text after the title (next 1000 characters)
        const sectionText = pageText.substring(titleIndex, titleIndex + 1000);
        console.log(`🔍 Section text: ${sectionText.substring(0, 300)}...`);
        
        let description = '';
        let dateText = '';
        let eventUrl = '';
        
        // Extract description (clean up the section text)
        description = sectionText.replace(title, '').trim();
        
        // Look for date patterns in the section text
        const datePatterns = [
          // "Saturday November 22nd, 2025"
          /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4})/i,
          // "November 22nd, 2025" or "OCTOBER 18, 2025"
          /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4})/i,
          // "April 6, 2024"
          /([A-Za-z]+\s+\d{1,2}\s*,?\s*\d{4})/i,
          // "February 10-12, 2023"
          /([A-Za-z]+\s+\d{1,2}\s*-\s*\d{1,2}\s*,?\s*\d{4})/i,
          // "Save-The-Date: OCTOBER 18, 2025"
          /Save-The-Date:\s*([A-Z]+\s+\d{1,2}\s*,?\s*\d{4})/i,
          // "Join us on April 6, 2024"
          /Join us on\s+([A-Za-z]+\s+\d{1,2}\s*,?\s*\d{4})/i,
          // "Held in October" - month only
          /Held in\s+([A-Za-z]+)/i
        ];
        
        for (const pattern of datePatterns) {
          const match = sectionText.match(pattern);
          if (match && !dateText) {
            dateText = match[1];
            console.log(`🔍 Found date "${dateText}" for "${title}"`);
            break;
          }
        }
        
        // Look for event detail links
        const linkMatch = sectionText.match(/Event Details Here\]\(([^)]+)\)/);
        if (linkMatch) {
          eventUrl = linkMatch[1];
        }
        
        // Clean up description
        description = description.replace(/Event Details Here.*$/, '').trim();
        
        // Process the event if we have the required information
        if (title && dateText) {
          const success = await processEventCandidate(
            title,
            dateText,
            description,
            eventUrl,
            eventsCollection,
            processedEventIds
          );
          
          if (success) addedEvents++;
        } else {
          console.log(`⚠️ Skipping "${title}" - missing date information`);
        }
        
      } catch (error) {
        console.error(`Error processing event "${title}": ${error.message}`);
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Gerrard India Bazaar events`);
    return addedEvents;
    
  } catch (error) {
    console.error(`❌ Error fetching events: ${error.message}`);
    return 0;
  }
}

/**
 * Main function to scrape Gerrard India Bazaar events
 * @returns {Promise<void>}
 */
async function scrapeGerrardEvents() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    console.log('🚀 Starting Gerrard India Bazaar event scraping...');
    
    const processedEventIds = new Set();
    const addedEvents = await fetchEventsFromURL(eventsCollection, processedEventIds);
    
    console.log(`\n📈 Scraping completed!`);
    console.log(`📊 Total events processed: ${processedEventIds.size}`);
    console.log(`✅ New events added: ${addedEvents}`);
    
  } catch (error) {
    console.error(`❌ Error in scrapeGerrardEvents: ${error.message}`);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Export for use in other modules
module.exports = { scrapeGerrardEvents };

// Run the scraper if this file is executed directly
if (require.main === module) {
  scrapeGerrardEvents().catch(console.error);
}
