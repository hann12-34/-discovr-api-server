/**
 * MIA Toronto Events Scraper
 * Based on events from https://miatoronto.com/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const MIA_TORONTO_URL = 'https://miatoronto.com/events/';
const MIA_TORONTO_VENUE = {
  name: 'MIA Toronto',
  address: '391 King St W, Toronto, ON M5V 1K1',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5V 1K1',
  url: 'https://miatoronto.com',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Generate unique event ID
function generateEventId(title, startDate) {
  const dataToHash = `${MIA_TORONTO_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

// Parse date and time information
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up texts
    dateText = dateText.trim();
    timeText = timeText ? timeText.trim() : '';
    
    // Remove day of week if present
    dateText = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    
    let startDate, endDate;
    
    // Handle various date formats
    const currentYear = new Date().getFullYear();
    
    // Try parsing with current year if no year specified
    if (!dateText.includes(currentYear.toString()) && !dateText.includes((currentYear + 1).toString())) {
      dateText = `${dateText}, ${currentYear}`;
    }
    
    // Parse the date
    startDate = new Date(dateText);
    
    // If date is invalid, return null (strict no-fallback policy)
    if (isNaN(startDate.getTime())) {
      console.log(`⚠️ Could not parse date: "${dateText}"`);
      return null;
    }
    
    // Handle time if provided
    if (timeText) {
      const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];
        
        if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
        
        startDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    // Set end date (assume 4 hours duration for nightclub events)
    endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 4);
    
    return { startDate, endDate };
    
  } catch (error) {
    console.log(`⚠️ Error parsing date "${dateText}": ${error.message}`);
    return null;
  }
}

// Extract categories from event title and description
function extractCategories(title, description, eventType = '') {
  const categories = [];
  const text = `${title} ${description} ${eventType}`.toLowerCase();
  
  // Nightlife and club categories
  if (text.match(/\b(dj|dance|club|party|nightlife|electronic|house|techno|edm)\b/)) {
    categories.push('Nightlife');
  }
  if (text.match(/\b(live music|concert|band|performance|music)\b/)) {
    categories.push('Music');
  }
  if (text.match(/\b(hip hop|r&b|rap|urban)\b/)) {
    categories.push('Hip Hop');
  }
  if (text.match(/\b(latin|reggaeton|salsa|bachata)\b/)) {
    categories.push('Latin');
  }
  if (text.match(/\b(special|vip|guest|celebrity|exclusive)\b/)) {
    categories.push('Special Events');
  }
  if (text.match(/\b(weekend|friday|saturday)\b/)) {
    categories.push('Weekend Events');
  }
  if (text.match(/\b(rooftop|patio|outdoor)\b/)) {
    categories.push('Rooftop');
  }
  
  return categories.length > 0 ? categories : ['Nightlife'];
}

// Extract price information
function extractPrice(text) {
  if (!text) return 'Contact venue';
  
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    return `$${priceMatch[1]}`;
  }
  
  if (text.toLowerCase().includes('free')) {
    return 'Free';
  }
  
  return 'Contact venue';
}

// Normalize URL to absolute
function normalizeUrl(url, baseUrl = 'https://miatoronto.com') {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
}

// Main scraper function for master scraper
async function scrapeMiaTorontoEvents(eventsCollection) {
  let addedEvents = 0;
  
  try {
    console.log('🔍 Fetching events from MIA Toronto website...');
    
    // Fetch HTML content
    const response = await axios.get(MIA_TORONTO_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Look for event information in various selectors
    $('.event, .event-item, .party, .show, .listing, article, .grid-item, .event-card').each((i, el) => {
      try {
        const element = $(el);
        
        const title = element.find('h1, h2, h3, h4, .title, .event-title, .party-title').first().text().trim() ||
                     element.find('.artist, .dj, .performer').first().text().trim();
        const dateText = element.find('.date, .when, time, .event-date').first().text().trim();
        const timeText = element.find('.time, .event-time').first().text().trim();
        const description = element.find('p, .description, .details, .event-description').first().text().trim() || 
                           'Join us at MIA Toronto for an exclusive rooftop experience with stunning city views.';
        
        let imageUrl = '';
        const imgEl = element.find('img');
        if (imgEl.length) {
          imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';
          imageUrl = normalizeUrl(imageUrl);
        }
        
        let eventUrl = '';
        const linkEl = element.find('a[href]');
        if (linkEl.length) {
          eventUrl = linkEl.attr('href');
          eventUrl = normalizeUrl(eventUrl);
        }
        
        if (title && title.length > 3) {
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || MIA_TORONTO_URL
          });
        }
      } catch (error) {
        console.log(`⚠️ Error processing event element: ${error.message}`);
      }
    });
    
    // No fallback events - only real scraped events allowed per user rule
    
    console.log(`📅 Found ${events.length} potential events`);
    
    // Process each event
    for (const event of events) {
      const dateTimeResult = parseDateAndTime(event.dateText, event.timeText);
      
      if (!dateTimeResult) {
        console.log(`⚠️ Skipping event "${event.title}" - could not parse date`);
        continue;
      }
      
      const { startDate, endDate } = dateTimeResult;
      const eventId = generateEventId(event.title, startDate);
      
      // Check if event already exists
      const existingEvent = await eventsCollection.findOne({ eventId });
      if (existingEvent) {
        console.log(`⏭️ Event already exists: ${event.title}`);
        continue;
      }
      
      const categories = extractCategories(event.title, event.description);
      const price = extractPrice(event.description);
      
      const eventDoc = {
        id: eventId,
        title: `Toronto - ${event.title}`,
        description: event.description,
        startDate,
        endDate,
        venue: MIA_TORONTO_VENUE,
        categories,
        price,
        source: 'MIA Toronto',
        url: event.eventUrl,
        imageUrl: event.imageUrl,
        scrapedAt: new Date(),
        isActive: true
      };
      
      // Use upsert to handle duplicate IDs gracefully
      const result = await eventsCollection.updateOne(
        { id: eventId }, // filter by ID
        { $set: eventDoc }, // update/insert the document
        { upsert: true } // create if doesn't exist
      );
      
      if (result.upsertedCount > 0) {
        addedEvents++;
        console.log(`✅ Added: ${event.title} on ${startDate.toDateString()}`);
      } else if (result.modifiedCount > 0) {
        console.log(`🔄 Updated: ${event.title} on ${startDate.toDateString()}`);
      } else {
        console.log(`ℹ️ Unchanged: ${event.title} on ${startDate.toDateString()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error scraping MIA Toronto events:', error);
  }
  
  return addedEvents;
}

// Standalone scraper function (for direct execution)
async function scrapeMiaEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    const addedEvents = await scrapeMiaTorontoEvents(eventsCollection);
    return addedEvents;
    
  } catch (error) {
    console.error('❌ Error in standalone scraper:', error);
    return 0;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Export for master scraper
module.exports = { scrapeMiaTorontoEvents };

// Run the scraper if executed directly
if (require.main === module) {
  scrapeMiaEvents()
    .then(addedEvents => {
      console.log(`✅ MIA Toronto scraper completed. Added ${addedEvents} new events.`);
    })
    .catch(error => {
      console.error('❌ Error running MIA Toronto scraper:', error);
      process.exit(1);
    });
}
