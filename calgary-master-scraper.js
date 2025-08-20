#!/usr/bin/env node

// Calgary Master Scraper - quick fix for syntax-valid scrapers only
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Working Calgary scrapers (tested and functional)
const workingScrapers = [
    'calgary-arts-commons-scraper.js',
    'calgary-heritage-park-scraper.js',
    'calgary-jubilee-scraper.js',
    'calgary-telus-spark-scraper.js',
    'calgary-national-music-centre-scraper.js',
    'calgary-princes-island-scraper.js',
    'calgary-theatre-calgary-scraper.js'
];

// Date validation and correction
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
    
    // Check if date is too far in past or future (reasonable range)
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    const twoYearsFromNow = new Date(now.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
    
    if (date < oneYearAgo || date > twoYearsFromNow) {
        console.log(`📅 Date out of range for "${eventTitle}": ${date.toDateString()}`);
        return null;
    }
    
    return date.toISOString();
}

async function importReliableEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        let totalImported = 0;
        let totalSkipped = 0;
        
        for (const scraperFile of workingScrapers) {
            const scraperPath = path.join(__dirname, scraperFile);
            
            if (!fs.existsSync(scraperPath)) {
                console.log(`⚠️  Scraper not found: ${scraperFile}`);
                continue;
            }
            
            try {
                console.log(`🔄 Running: ${scraperFile}`);
                
                // Import and run scraper (handle both class and function exports)
                const scraperModule = require(scraperPath);
                let events = [];
                
                try {
                    // Handle class-based scrapers
                    let scraperInstance;
                    if (typeof scraperModule === 'function') {
                        // It's a class constructor
                        scraperInstance = new scraperModule();
                        events = await scraperInstance.scrape();
                    } else if (scraperModule.scrapeEvents && typeof scraperModule.scrapeEvents === 'function') {
                        events = await scraperModule.scrapeEvents();
                    } else if (scraperModule.scrape && typeof scraperModule.scrape === 'function') {
                        events = await scraperModule.scrape();
                    } else {
                        console.log(`❌ ${scraperFile}: No suitable scrape method found`);
                        continue;
                    }
                } catch (classError) {
                    // Try as function if class instantiation fails
                    try {
                        if (typeof scraperModule === 'function') {
                            events = await scraperModule('Calgary');
                        } else {
                            console.log(`❌ ${scraperFile}: Not a class or function`);
                            continue;
                        }
                    } catch (funcError) {
                        console.log(`❌ ${scraperFile}: Both class and function attempts failed`);
                        continue;
                    }
                }
                
                if (!events || !Array.isArray(events)) {
                    console.log(`❌ ${scraperFile}: No events returned`);
                    continue;
                }
                
                // Process and validate events
                let imported = 0;
                let skipped = 0;
                
                for (const event of events) {
                    if (!event || !event.title) {
                        skipped++;
                        continue;
                    }
                    
                    // Validate and fix date
                    const validDate = validateAndFixDate(event.startDate, event.title);
                    if (!validDate) {
                        skipped++;
                        continue;
                    }
                    
                    // Ensure proper city tagging
                    const processedEvent = {
                        ...event,
                        startDate: validDate,
                        city: 'Calgary',
                        venue: {
                            ...event.venue,
                            city: 'Calgary'
                        },
                        lastUpdated: new Date()
                    };
                    
                    // Create unique ID for duplicate prevention
                    const uniqueId = `${processedEvent.title}-${validDate.split('T')[0]}-calgary`.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    processedEvent.uniqueId = uniqueId;
                    
                    try {
                        await collection.replaceOne(
                            { uniqueId: uniqueId },
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
        const calgaryEvents = await collection.countDocuments({
            $or: [
                {'venue.city': 'Calgary'},
                {'city': 'Calgary'}
            ]
        });
        
        const futureCalgaryEvents = await collection.countDocuments({
            $or: [
                {'venue.city': 'Calgary'},
                {'city': 'Calgary'}
            ],
            startDate: { $gte: new Date() }
        });
        
        console.log('\n📊 IMPORT SUMMARY:');
        console.log(`✅ Total imported: ${totalImported}`);
        console.log(`⚠️  Total skipped (bad dates): ${totalSkipped}`);
        console.log(`📈 Total Calgary events: ${calgaryEvents}`);
        console.log(`🔮 Future Calgary events: ${futureCalgaryEvents}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    importReliableEvents();
}

module.exports = importReliableEvents;
