#!/usr/bin/env node

// Toronto Master Scraper - Test working Toronto scrapers
const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Working Toronto scrapers (syntax validated)
const workingScrapers = [
    'scrape-ago-events.js',
    'scrape-casa-loma-events.js', 
    'scrape-cn-tower.js',
    'scrape-danforth-music-hall.js',
    'scrape-distillery-district-events.js'
];

// Date validation function
function validateAndFixDate(dateString, eventTitle) {
    if (!dateString) {
        console.log(`⚠️  No date for "${eventTitle}" - skipping`);
        return null;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.log(`⚠️  Invalid date for "${eventTitle}": ${dateString} - skipping`);
        return null;
    }
    
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    const twoYearsFromNow = new Date(now.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
    
    if (date < oneYearAgo || date > twoYearsFromNow) {
        console.log(`📅 Date out of range for "${eventTitle}": ${date.toDateString()}`);
        return null;
    }
    
    return date.toISOString();
}

async function importTorontoEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        let totalImported = 0;
        let totalSkipped = 0;
        
        for (const scraperFile of workingScrapers) {
            const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'Toronto', scraperFile);
            
            try {
                console.log(`🔄 Running: ${scraperFile}`);
                
                // Import scraper module
                const scraperModule = require(scraperPath);
                let events = [];
                
                // Handle different export patterns - no city parameter needed
                if (typeof scraperModule === 'function') {
                    events = await scraperModule();
                } else if (scraperModule.scrapeEvents && typeof scraperModule.scrapeEvents === 'function') {
                    events = await scraperModule.scrapeEvents();
                } else if (scraperModule.scrape && typeof scraperModule.scrape === 'function') {
                    events = await scraperModule.scrape();
                } else {
                    console.log(`❌ ${scraperFile}: No suitable scrape method found`);
                    continue;
                }
                
                if (!events || !Array.isArray(events)) {
                    console.log(`❌ ${scraperFile}: No events returned`);
                    continue;
                }
                
                let imported = 0;
                let skipped = 0;
                
                for (const event of events) {
                    if (!event || !event.title) {
                        skipped++;
                        continue;
                    }
                    
                    // Validate date
                    const validDate = validateAndFixDate(event.startDate || event.date, event.title);
                    if (!validDate) {
                        skipped++;
                        continue;
                    }
                    
                    // Process event with Toronto tagging
                    const processedEvent = {
                        ...event,
                        id: `${event.title}-${validDate.split('T')[0]}-toronto`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        startDate: validDate,
                        city: 'Toronto',
                        venue: {
                            ...event.venue,
                            city: 'Toronto',
                            province: 'ON'
                        },
                        lastUpdated: new Date(),
                        uniqueId: `${event.title}-${validDate.split('T')[0]}-toronto`.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    };
                    
                    try {
                        await collection.replaceOne(
                            { uniqueId: processedEvent.uniqueId },
                            processedEvent,
                            { upsert: true }
                        );
                        imported++;
                    } catch (dbError) {
                        console.log(`⚠️  Database error for "${event.title}":`, dbError.message);
                        skipped++;
                    }
                }
                
                console.log(`✅ ${scraperFile}: ${imported} imported, ${skipped} skipped`);
                totalImported += imported;
                totalSkipped += skipped;
                
            } catch (error) {
                console.log(`❌ Error in ${scraperFile}:`, error.message.split('\n')[0]);
                continue;
            }
        }
        
        // Get final counts
        const torontoEvents = await collection.countDocuments({
            $or: [
                {'venue.city': 'Toronto'},
                {'city': 'Toronto'}
            ]
        });
        
        const futureTorontoEvents = await collection.countDocuments({
            $or: [
                {'venue.city': 'Toronto'},
                {'city': 'Toronto'}
            ],
            startDate: { $gte: new Date() }
        });
        
        console.log('\n📊 TORONTO IMPORT SUMMARY:');
        console.log(`✅ Total imported: ${totalImported}`);
        console.log(`⚠️  Total skipped: ${totalSkipped}`);
        console.log(`📈 Total Toronto events: ${torontoEvents}`);
        console.log(`🔮 Future Toronto events: ${futureTorontoEvents}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    importTorontoEvents();
}

module.exports = importTorontoEvents;
