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
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    let apiDataFound = false;

    const eventsPromise = new Promise((resolve, reject) => {
      page.on('response', async (response) => {
        const request = response.request();
        // This URL is specific to Next.js sites and fetches page data as JSON
        if (request.url().includes('/_next/data/') && request.url().endsWith('/shows.json')) {
          try {
            if (response.ok()) {
              apiDataFound = true;
              console.log('📊 Found Next.js data API response. Parsing...');
              const data = await response.json();
              
              // The actual event data is nested inside the pageProps
              const rawEvents = data.pageProps.page.blocks.find(b => b.type === 'upcomingShows')?.events;

              if (rawEvents && Array.isArray(rawEvents)) {
                const formattedEvents = rawEvents.map(event => {
                  return {
                    name: event.title,
                    description: event.subtitle || '',
                    venue: {
                      name: 'Commodore Ballroom',
                      address: '868 Granville St, Vancouver, BC V6Z 1K3',
                    },
                    price: event.price || 'TBA',
                    // The date is already in a usable format
                    startDate: new Date(event.date).toISOString(),
                    // The URL needs to be constructed
                    sourceUrl: `https://www.commodoreballroom.com/shows/${event.slug}`,
                    source: 'commodore-scraper',
                  };
                });
                console.log(`✅ Extracted ${formattedEvents.length} events from API data.`);
                resolve(formattedEvents);
              } else {
                 console.log('API response found, but event data is missing or in an unexpected format.');
              }
            }
          } catch (e) {
            console.error('Error parsing API response:', e);
            // Don't reject here, as other responses might be valid
          }
        }
      });
    });

    console.log('📄 Loading Commodore Ballroom events page...');
    await page.goto('https://www.commodoreballroom.com/shows', {
      waitUntil: 'networkidle2',
    });

    // Wait for either the API data to be found or a timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => {
        if (!apiDataFound) {
          reject(new Error('Timeout: Did not find the expected API response for event data after 30 seconds.'));
        }
      }, 30000)
    );

    const events = await Promise.race([eventsPromise, timeoutPromise]);
    return events;

  } catch (error) {
    console.error('❌ Error scraping Commodore Ballroom:', error.message);
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
