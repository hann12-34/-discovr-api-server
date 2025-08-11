/**
 * 🚀 IMPORT WORKING TORONTO SCRAPERS TO PRODUCTION
 * 
 * Import events from the 18 confirmed working Toronto scrapers directly
 * to the production database that the mobile app actually uses.
 */

const mongoose = require('mongoose');
const path = require('path');

// Production database URI (confirmed working)
const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

// List of confirmed working Toronto scrapers
const workingScrapers = [
    'scrape-moca-events.js',
    'scrape-ago-events-clean.js', 
    'scrape-rom-events-clean.js',
    'scrape-harbourfront-events-clean.js',
    'scrape-casa-loma-events-clean.js',
    'scrape-cn-tower-events-clean.js',
    'scrape-distillery-district-events-clean.js',
    'scrape-ontario-science-centre-events-clean.js',
    'scrape-toronto-zoo-events-clean.js',
    'scrape-ripley-aquarium-events-clean.js',
    'scrape-massey-hall-events-clean.js',
    'scrape-roy-thomson-hall-events-clean.js',
    'scrape-phoenix-concert-theatre-events-clean.js',
    'scrape-danforth-music-hall-events-clean.js',
    'scrape-opera-house-events-clean.js',
    'scrape-elgin-winter-garden-events-clean.js',
    'scrape-princess-of-wales-theatre-events-clean.js',
    'scrape-royal-alexandra-theatre-events-clean.js'
];

// Event schema for MongoDB
const eventSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    venue: {
        name: { type: String, required: true },
        id: { type: String },
        location: {
            address: { type: String },
            coordinates: { type: [Number], default: [0, 0] }
        }
    },
    category: { type: String, default: 'Entertainment' },
    city: { type: String, required: true },
    source: { type: String, required: true },
    price: { type: String, default: 'See website for details' },
    imageUrl: { type: String },
    eventUrl: { type: String },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

async function importWorkingTorontoScrapers() {
    console.log('🚀 IMPORTING WORKING TORONTO SCRAPERS TO PRODUCTION\n');
    console.log(`🎯 Target: Production database (mobile app database)`);
    console.log(`📊 Scrapers to import: ${workingScrapers.length}`);
    
    try {
        // Connect to production database
        console.log('\n🔌 Connecting to production database...');
        await mongoose.connect(PRODUCTION_URI);
        console.log('✅ Connected to production database');
        
        const db = mongoose.connection.db;
        console.log(`📊 Database: ${db.databaseName}`);
        
        let totalEvents = 0;
        let successfulScrapers = 0;
        
        // Import each working scraper
        for (const scraperFile of workingScrapers) {
            console.log(`\n🔍 Processing: ${scraperFile}`);
            
            try {
                const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'Toronto', scraperFile);
                
                // Import the scraper module
                delete require.cache[require.resolve(scraperPath)];
                const scraperModule = require(scraperPath);
                
                // Get the scraper function
                const scrapeFunction = scraperModule.scrapeEvents || scraperModule.scrape || scraperModule;
                
                if (typeof scrapeFunction !== 'function') {
                    console.log(`❌ No valid scrape function in ${scraperFile}`);
                    continue;
                }
                
                // Run the scraper with required city parameter
                console.log(`🕷️ Scraping events...`);
                const scrapedEvents = await scrapeFunction('Toronto');
                
                if (!Array.isArray(scrapedEvents) || scrapedEvents.length === 0) {
                    console.log(`⚠️ No events found`);
                    continue;
                }
                
                console.log(`📦 Found ${scrapedEvents.length} events`);
                
                // Import events to database
                let importedCount = 0;
                for (const eventData of scrapedEvents) {
                    try {
                        // Ensure required fields
                        if (!eventData.id || !eventData.title || !eventData.startDate) {
                            continue;
                        }
                        
                        // Ensure city is set
                        eventData.city = eventData.city || 'Toronto, ON';
                        
                        // Ensure venue structure
                        if (typeof eventData.venue === 'string') {
                            eventData.venue = { name: eventData.venue };
                        }
                        
                        // Save to database (upsert)
                        await Event.updateOne(
                            { id: eventData.id },
                            { $set: eventData },
                            { upsert: true }
                        );
                        
                        importedCount++;
                    } catch (error) {
                        // Skip invalid events
                        continue;
                    }
                }
                
                console.log(`✅ Imported ${importedCount} events`);
                totalEvents += importedCount;
                successfulScrapers++;
                
            } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
            }
            
            // Anti-bot delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 IMPORT SUMMARY:');
        console.log(`✅ Successful scrapers: ${successfulScrapers}/${workingScrapers.length}`);
        console.log(`📦 Total events imported: ${totalEvents}`);
        
        // Verify Toronto events in database
        const torontoCount = await Event.countDocuments({ 
            city: { $regex: /toronto/i } 
        });
        console.log(`🏙️ Toronto events now in database: ${torontoCount}`);
        
        // Total events in database
        const totalCount = await Event.countDocuments();
        console.log(`📊 Total events in database: ${totalCount}`);
        
        console.log('\n🎯 SUCCESS! Toronto events should now appear in mobile app!');
        console.log('📱 Restart your mobile app to see the new Toronto events.');
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the import
importWorkingTorontoScrapers().catch(console.error);
