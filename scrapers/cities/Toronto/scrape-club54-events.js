const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const CLUB54_URL = 'https://www.club54.ca/upcoming-events';
const CLUB54_VENUE = {
  name: 'Club 54',
  address: 'Toronto, ON',
  website: 'https://www.club54.ca/',
  location: 'Toronto, Ontario'
};

// Generate unique event ID
function generateEventId(venueName, title, startDate) {
  const combined = `${venueName}-${title}-${startDate}`;
  return crypto.createHash('md5').update(combined).digest('hex');
}

// Parse date from various formats
function parseEventDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Clean the date string
    const cleanDate = dateStr.trim().replace(/\s+/g, ' ');
    
    // Try different date formats
    const formats = [
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i, // "January 15, 2024" or "January 15 2024"
      /(\w+)\s+(\d{1,2})/i, // "January 15" (current year)
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/i, // "01/15/2024"
      /(\d{4})-(\d{1,2})-(\d{1,2})/i // "2024-01-15"
    ];
    
    for (const format of formats) {
      const match = cleanDate.match(format);
      if (match) {
        let date;
        if (format === formats[0]) { // Month Day, Year
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                            'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.indexOf(match[1].toLowerCase());
          if (monthIndex !== -1) {
            date = new Date(parseInt(match[3]), monthIndex, parseInt(match[2]));
          }
        } else if (format === formats[1]) { // Month Day (current year)
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                            'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.indexOf(match[1].toLowerCase());
          if (monthIndex !== -1) {
            date = new Date(new Date().getFullYear(), monthIndex, parseInt(match[2]));
          }
        } else if (format === formats[2]) { // MM/DD/YYYY
          date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
        } else if (format === formats[3]) { // YYYY-MM-DD
          date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
        
        if (date && !isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    // Fallback to Date constructor
    const fallbackDate = new Date(cleanDate);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }
    
  } catch (error) {
    console.error(`Date parsing error for "${dateStr}":`, error.message);
  }
  
  return null;
}

// Extract price from text
function extractPrice(text) {
  if (!text) return 'Contact venue';
  
  const pricePatterns = [
    /\$(\d+(?:\.\d{2})?)/,
    /(\d+(?:\.\d{2})?)\s*dollars?/i,
    /free/i,
    /complimentary/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === pricePatterns[2] || pattern === pricePatterns[3]) {
        return 'Free';
      }
      return `$${match[1]}`;
    }
  }
  
  return 'Contact venue';
}

// Main scraper function for master scraper
async function scrapeClub54Events(eventsCollection) {
  let addedEvents = 0;
  
  try {
    console.log('🔍 Fetching events from Club 54 website...');
    
    // Fetch HTML content
    const response = await axios.get(CLUB54_URL, {
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
    $('.event, .event-item, .party, .show, .listing, article, .grid-item, .event-card, .upcoming-event').each((i, el) => {
      try {
        const $el = $(el);
        
        // Extract title
        let title = $el.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
        if (!title) {
          title = $el.find('a').first().text().trim();
        }
        if (!title) {
          title = $el.text().split('\n')[0].trim();
        }
        
        // Skip if no meaningful title
        if (!title || title.length < 3) return;
        
        // Extract date
        const dateText = $el.find('.date, .event-date, .time, .when').text().trim() ||
                        $el.text().match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?\b/i)?.[0] ||
                        '';
        
        // Extract description
        const description = $el.find('p, .description, .event-description, .summary').text().trim() ||
                          $el.text().replace(title, '').trim().substring(0, 200);
        
        // Extract event URL
        const eventUrl = $el.find('a').attr('href') || CLUB54_URL;
        const fullEventUrl = eventUrl.startsWith('http') ? eventUrl : `https://www.club54.ca${eventUrl}`;
        
        // Extract image
        const imageUrl = $el.find('img').attr('src') || '';
        const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ? 
                            `https://www.club54.ca${imageUrl}` : imageUrl;
        
        events.push({
          title,
          description,
          dateText,
          eventUrl: fullEventUrl,
          imageUrl: fullImageUrl
        });
        
      } catch (error) {
        console.error('Error parsing event element:', error.message);
      }
    });
    
    console.log(`📅 Found ${events.length} potential events`);
    
    // No fallback events - only real scraped events allowed per user rule
    
    // Process and save events
    for (const event of events) {
      const startDate = parseEventDate(event.dateText);
      
      if (!startDate) {
        console.log(`⚠️ Skipping event "${event.title}" - could not parse date`);
        continue;
      }
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      
      const eventId = generateEventId(CLUB54_VENUE.name, event.title, startDate.toISOString());
      const categories = ['Nightlife', 'Dancing', 'Music', 'Club'];
      const price = extractPrice(event.description);
      
      const eventDoc = {
        id: eventId,
        title: `Toronto - ${event.title}`,
        description: event.description,
        startDate,
        endDate,
        venue: CLUB54_VENUE,
        categories: categories,
        price: price || "Contact venue",
        officialWebsite: CLUB54_VENUE.website,
        location: CLUB54_VENUE.location,
        sourceURL: CLUB54_VENUE.website,
        lastUpdated: new Date(),
        source: 'Club 54',
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
    console.error(`❌ Error scraping Club 54 events: ${error.message}`);
  }
  
  return addedEvents;
}

// Standalone function for direct execution
async function scrapeClub54EventsStandalone() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    const addedEvents = await scrapeClub54Events(eventsCollection);
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
module.exports = { scrapeClub54Events };

// Run the scraper if executed directly
if (require.main === module) {
  scrapeClub54EventsStandalone()
    .then(addedEvents => {
      console.log(`✅ Club 54 scraper completed. Added ${addedEvents} new events.`);
    })
    .catch(error => {
      console.error('❌ Error running Club 54 scraper:', error);
      process.exit(1);
    });
}
