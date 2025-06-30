const puppeteer = require('puppeteer');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Get MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required');
  process.exit(1);
}

async function scrapeCommodore() {
  console.log('🔍 Starting Commodore Ballroom scraper...');
  
  const browser = await puppeteer.launch({
    headless: 'new', // Use the new headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport to ensure we get desktop view
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the shows page
    console.log('📄 Loading Commodore Ballroom events page...');
    await page.goto('https://www.commodoreballroom.com/shows', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for the events to load
    await page.waitForSelector('[data-test="event-row"]', { timeout: 15000 });
    
    console.log('📊 Extracting event data...');
    
    // Extract event data
    const events = await page.evaluate(() => {
      const eventRows = Array.from(document.querySelectorAll('[data-test="event-row"]'));
      
      return eventRows.map(row => {
        // Get the event date
        const dateElement = row.querySelector('[data-test="date"]');
        const dateText = dateElement ? dateElement.textContent.trim() : '';
        
        // Get the month and day
        const monthDay = dateText.match(/^([A-Za-z]+)\s+(\d+)/);
        const month = monthDay ? monthDay[1] : '';
        const day = monthDay ? monthDay[2] : '';
        
        // Get the year (current or next year)
        const now = new Date();
        let year = now.getFullYear();
        // If the month is earlier in the year than current month, it's probably next year's event
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          .findIndex(m => month.startsWith(m));
        if (monthIndex !== -1 && monthIndex < now.getMonth()) {
          year += 1;
        }
        
        // Get the event name and opener/subtitle
        const titleElement = row.querySelector('[data-test="event-link"]');
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // Get the support act / opener info
        const openerElement = row.querySelector('[data-test="supporting-acts"]');
        const opener = openerElement ? openerElement.textContent.trim() : '';
        
        // Get the link to the event page
        const link = titleElement ? titleElement.href : '';
        
        // Get the price
        const priceElement = row.querySelector('[data-test="price-range"]');
        const price = priceElement ? priceElement.textContent.trim() : '';
        
        // Check if sold out
        const isSoldOut = row.querySelector('[data-test="sold-out-label"]') !== null;
        
        // Format a complete date string
        let startDate = null;
        if (month && day && year) {
          // Try to parse the time if available
          const timeMatch = dateText.match(/(\d+):(\d+)\s*(PM|AM)/i);
          let hours = 0;
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            if (timeMatch[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
            minutes = parseInt(timeMatch[2]);
          }
          
          // Create date object
          const date = new Date(year, monthIndex, parseInt(day), hours, minutes);
          startDate = date.toISOString();
        }
        
        return {
          name: title,
          description: opener ? `With: ${opener}` : '',
          venue: {
            name: 'Commodore Ballroom',
            address: '868 Granville St, Vancouver, BC V6Z 1K3'
          },
          price: price || (isSoldOut ? 'Sold Out' : 'TBA'),
          startDate,
          sourceUrl: link,
          source: 'commodore-scraper'
        };
      });
    });
    
    console.log(`✅ Found ${events.length} events at Commodore Ballroom`);
    return events;
    
  } catch (error) {
    console.error('❌ Error scraping Commodore Ballroom:', error);
    return [];
  } finally {
    await browser.close();
  }
}

async function saveEvents(events) {
  // Only proceed if there are events to save
  if (!events.length) {
    console.log('No events to save');
    return { success: false, message: 'No events found' };
  }
  
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Add timestamps and prepare bulk operations
    const now = new Date();
    const operations = events.map(event => {
      // Unique identifier for the event to avoid duplicates
      const uniqueIdentifier = {
        name: event.name,
        'venue.name': event.venue.name,
        startDate: event.startDate
      };
      
      return {
        updateOne: {
          filter: uniqueIdentifier,
          update: {
            $set: {
              ...event,
              updatedAt: now
            },
            $setOnInsert: {
              createdAt: now
            }
          },
          upsert: true
        }
      };
    });
    
    // Perform the bulk operation
    const result = await collection.bulkWrite(operations);
    console.log(`Events saved: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
    
    return { 
      success: true, 
      inserted: result.upsertedCount,
      updated: result.modifiedCount
    };
  } catch (error) {
    console.error('Error saving events to MongoDB:', error);
    return { success: false, error: error.message };
  } finally {
    await client.close();
  }
}

// Execute the scraper if run directly
if (require.main === module) {
  (async () => {
    try {
      const events = await scrapeCommodore();
      if (events.length > 0) {
        await saveEvents(events);
      }
    } catch (error) {
      console.error('Error running scraper:', error);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeCommodore, saveEvents };
