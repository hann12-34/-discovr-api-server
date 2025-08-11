/**
 * Import Toronto Events to Database
 * 
 * Imports events from the 18 confirmed working Toronto scrapers
 * with proper "Toronto" city tagging to resolve mobile app
 * city filtering showing 0 Toronto events.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority";

// Event model
const eventSchema = new mongoose.Schema({
  id: String,
  title: String,
  venue: mongoose.Schema.Types.Mixed,
  location: String,
  city: String,
  date: String,
  category: String,
  description: String,
  link: String,
  source: String
}, { 
  collection: 'events',
  timestamps: true 
});

const Event = mongoose.model('Event', eventSchema);

// 18 Confirmed working Toronto scrapers with proper city tagging
const CONFIRMED_WORKING_SCRAPERS = [
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

async function importTorontoEvents() {
    console.log('\n🍁 IMPORTING TORONTO EVENTS TO DATABASE');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Add Toronto events so mobile app city filtering shows results');
    
    try {
        // Connect to MongoDB
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        
        // Check current state
        const beforeCount = await Event.countDocuments();
        const torontoBeforeCount = await Event.countDocuments({ city: 'Toronto' });
        console.log(`📊 Events before import: ${beforeCount} total, ${torontoBeforeCount} Toronto`);
        
        let totalEvents = 0;
        let totalScrapers = 0;
        let errorCount = 0;
        
        // Import from each working scraper
        for (const scraperFilename of CONFIRMED_WORKING_SCRAPERS) {
            try {
                console.log(`\n🔄 Importing from ${scraperFilename}...`);
                
                const scraperModule = require(`./scrapers/cities/Toronto/${scraperFilename}`);
                
                // Handle different export structures
                let events = [];
                if (scraperModule.scrape && typeof scraperModule.scrape === 'function') {
                    // Function-based export: { scrape: function }
                    events = await scraperModule.scrape('Toronto');
                } else if (typeof scraperModule === 'function') {
                    // Class-based export: module.exports = Class
                    const scraper = new scraperModule();
                    events = await scraper.scrape();
                } else if (scraperModule.default) {
                    // ES6 export: export default Class
                    const scraper = new scraperModule.default();
                    events = await scraper.scrape();
                } else {
                    throw new Error('Unknown export structure');
                }
                
                if (!events || events.length === 0) {
                    console.log(`⚠️ ${scraperFilename}: No events found`);
                    continue;
                }
                
                // Validate and save events
                let savedCount = 0;
                for (const eventData of events) {
                    try {
                        // Ensure proper city tagging
                        const eventToSave = {
                            ...eventData,
                            city: eventData.city || 'Toronto', // Fallback to Toronto
                            id: eventData.id || `${scraperFilename}-${eventData.title}-${Date.now()}`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        
                        const event = new Event(eventToSave);
                        await event.save();
                        savedCount++;
                        
                    } catch (saveError) {
                        console.log(`⚠️ Failed to save event: ${saveError.message}`);
                    }
                }
                
                console.log(`✅ ${scraperFilename}: Imported ${savedCount}/${events.length} events`);
                totalEvents += savedCount;
                totalScrapers++;
                
            } catch (error) {
                console.log(`❌ ${scraperFilename}: Error - ${error.message}`);
                errorCount++;
            }
        }
        
        // Final count
        const afterCount = await Event.countDocuments();
        const torontoAfterCount = await Event.countDocuments({ city: 'Toronto' });
        
        console.log(`\n📊 TORONTO EVENTS IMPORT RESULTS`);
        console.log('='.repeat(60));
        console.log(`✅ Successful scrapers: ${totalScrapers}`);
        console.log(`❌ Failed scrapers: ${errorCount}`);
        console.log(`📈 Events imported: ${totalEvents}`);
        console.log(`📊 Database before: ${beforeCount} total, ${torontoBeforeCount} Toronto`);
        console.log(`📊 Database after: ${afterCount} total, ${torontoAfterCount} Toronto`);
        
        if (torontoAfterCount > 0) {
            console.log('\n🎉 SUCCESS! Toronto events imported to database!');
            console.log('📱 Mobile app should now show Toronto events when filtering by city');
            console.log('🧪 Test by selecting "Toronto" in mobile app city filter');
        } else {
            console.log('\n⚠️ No Toronto events imported - check scraper issues above');
        }
        
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run import
importTorontoEvents()
    .then(() => {
        console.log('\n🏁 Toronto events import complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    });
