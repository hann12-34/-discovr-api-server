// Load environment config for MongoDB connection
require('./temp-env-config.js');

const { MongoClient } = require('mongodb');

// Import sample scrapers from each city (using actual existing file names)
const { scrapeBloorWestVillageEvents } = require('./scrapers/cities/Toronto/scrape-bloorwestvillage-events.js');
const { scrapeVelvetEvents } = require('./scrapers/cities/Toronto/scrape-velvet-events.js');
const { scrape: scrapeVancouverJazz } = require('./scrapers/cities/Vancouver/scrape-vancouver-international-jazz-festival.js');
const { scrape: scrapeCelebrationOfLight } = require('./scrapers/cities/Vancouver/scrape-celebration-of-light.js');
const { scrape: scrapeJustForLaughs } = require('./scrapers/cities/Montreal/scrape-just-for-laughs.js');
const { scrape: scrapeMontrealScience } = require('./scrapers/cities/Montreal/scrape-montreal-science-centre.js');
const { scrape: scrapeCalgaryStampede } = require('./scrapers/cities/Calgary/scrape-calgary-stampede.js');
const { scrape: scrapeGlenbowMuseum } = require('./scrapers/cities/Calgary/scrape-glenbow-museum.js');
const { scrape: scrapeLincolnCenter } = require('./scrapers/cities/New York/lincoln-center-fixed.js');
const { scrape: scrapeMadisonSquareGarden } = require('./scrapers/cities/New York/madison-square-garden.js');

const torontoScrapers = [
    scrapeBloorWestVillageEvents,
    scrapeVelvetEvents
];

const vancouverScrapers = [
    scrapeVancouverJazz,
    scrapeCelebrationOfLight
];

const montrealScrapers = [
    scrapeJustForLaughs,
    scrapeMontrealScience
];

const calgaryScrapers = [
    scrapeCalgaryStampede,
    scrapeGlenbowMuseum
];

const newYorkScrapers = [
    scrapeLincolnCenter,
    scrapeMadisonSquareGarden
];

async function runSampleScrapers() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Check initial count
        const initialCount = await collection.countDocuments();
        console.log(`📊 Initial event count: ${initialCount}`);
        
        // Define all scraper sets with city names (start with just Toronto and Vancouver)
        const cityConfigs = [
            { name: 'Toronto', scrapers: torontoScrapers },
            { name: 'Vancouver', scrapers: vancouverScrapers },
            { name: 'Montreal', scrapers: montrealScrapers },
            { name: 'Calgary', scrapers: calgaryScrapers },
            { name: 'New York', scrapers: newYorkScrapers }
        ];
        
        let totalEventsAdded = 0;
        
        for (const { name, scrapers } of cityConfigs) {
            console.log(`\n🏙️  Running ${name} scrapers...`);
            
            for (let i = 0; i < scrapers.length; i++) {
                const scraper = scrapers[i];
                console.log(`  🔄 Running ${name} scraper ${i + 1}/${scrapers.length}...`);
                
                try {
                    // Set up proper city argument for scrapers
                    process.argv = ['node', 'scraper', `--city=${name}`];
                    
                    // Run the scraper with city parameter
                    const result = await scraper(name);
                    
                    // Handle different return types - some scrapers return events directly, others return undefined but save internally
                    let events = [];
                    if (Array.isArray(result)) {
                        events = result;
                    } else if (result && Array.isArray(result.events)) {
                        events = result.events;
                    }
                    
                    if (events && events.length > 0) {
                        // Filter out events with missing or null IDs to prevent duplicate key errors
                        const validEvents = events.filter(event => {
                            if (!event.id || event.id === null) {
                                console.log(`    ⚠️  Skipping event without ID: ${event.title}`);
                                return false;
                            }
                            return true;
                        });
                        
                        if (validEvents.length > 0) {
                            // Use upsert logic to prevent duplicate key errors
                            let upsertedCount = 0;
                            for (const event of validEvents) {
                                const result = await collection.updateOne(
                                    { id: event.id },
                                    { $set: event },
                                    { upsert: true }
                                );
                                if (result.upsertedCount > 0 || result.modifiedCount > 0) {
                                    upsertedCount++;
                                }
                            }
                            console.log(`    ✅ Added/Updated ${upsertedCount} events for ${name}`);
                            totalEventsAdded += upsertedCount;
                            
                            // Show sample event to verify city tagging
                            const sampleEvent = validEvents[0];
                            console.log(`    📄 Sample event - City: ${sampleEvent.venue?.name || 'Unknown'}, Title: ${sampleEvent.title}`);
                        } else {
                            console.log(`    ⚠️  All events from ${name} scraper ${i + 1} had invalid IDs`);
                        }
                    } else {
                        // Check if events were saved internally by checking database count change
                        const currentCount = await collection.countDocuments();
                        const newEvents = currentCount - initialCount - totalEventsAdded;
                        if (newEvents > 0) {
                            console.log(`    ✅ Detected ${newEvents} events saved internally by ${name} scraper ${i + 1}`);
                            totalEventsAdded += newEvents;
                        } else {
                            console.log(`    ⚠️  No events returned from ${name} scraper ${i + 1}`);
                        }
                    }
                } catch (error) {
                    console.error(`    ❌ Error running ${name} scraper ${i + 1}:`, error.message);
                }
            }
        }
        
        // Check final count
        const finalCount = await collection.countDocuments();
        console.log(`\n📊 Final event count: ${finalCount}`);
        console.log(`📈 Total events added: ${totalEventsAdded}`);
        
        // Sample a few events to verify city tagging
        console.log('\n🔍 Sample events to verify city tagging:');
        const sampleEvents = await collection.find({}).limit(10).toArray();
        
        sampleEvents.forEach((event, index) => {
            console.log(`${index + 1}. ${event.title} - City: ${event.venue?.name || 'No city tag'} - Venue: ${event.venue?.venue || 'Unknown venue'}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

runSampleScrapers();
