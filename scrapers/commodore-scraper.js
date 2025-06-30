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
  console.log('🕵️‍♂️ Starting Commodore Ballroom scraper in GraphQL discovery mode...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // We need to intercept requests to get the payload
    await page.setRequestInterception(true);

    const queryPromise = new Promise((resolve, reject) => {
      page.on('request', (request) => {
        if (request.url().includes('api.livenation.com/graphql') && request.method() === 'POST') {
          console.log('📡 Found GraphQL request to:', request.url());
          const payload = request.postData();
          console.log('✅ GraphQL Query Payload:', payload);
          // Resolve the promise with the payload to stop the scraper
          resolve(payload);
        }
        request.continue();
      });

      // Add a timeout in case the request isn't found
      setTimeout(() => {
        reject(new Error('Timeout: Did not find GraphQL request after 30 seconds.'));
      }, 30000);
    });

    console.log('📄 Loading Commodore Ballroom events page to find GraphQL query...');
    await page.goto('https://www.commodoreballroom.com/shows', {
      waitUntil: 'networkidle2',
    });

    // Wait for the query to be found
    await queryPromise;

    console.log('✅ GraphQL query has been logged.');
    // In this debug run, we are not returning events, just logging the query.
    return [];

  } catch (error) {
    console.error('❌ Error during GraphQL discovery:', error.message);
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
