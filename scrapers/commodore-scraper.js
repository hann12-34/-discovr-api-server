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
  console.log('🕵️‍♂️ Starting Commodore Ballroom scraper in debug mode...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Listen for all network responses
    page.on('response', async (response) => {
      const url = response.url();
      // Log URLs that are likely to be data APIs
      if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
        console.log(`📡 Network request (fetch/XHR): ${url}`);
        // Also log the first 100 chars of the response to see if it's JSON
        try {
          const text = await response.text();
          console.log(`   Response body preview: ${text.substring(0, 100)}...`);
        } catch (e) {
          // Ignore errors for responses with no body
        }
      }
    });

    console.log('📄 Loading Commodore Ballroom events page to inspect traffic...');
    await page.goto('https://www.commodoreballroom.com/shows', {
      waitUntil: 'networkidle2',
    });

    console.log('✅ Page loaded. Network requests have been logged.');
    // In this debug run, we are not returning events, just logging URLs.
    return [];

  } catch (error) {
    console.error('❌ Error during scraper debug run:', error.message);
    return [];
  } finally {
    console.log('Closing browser.');
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
