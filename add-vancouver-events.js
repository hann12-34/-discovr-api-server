#!/usr/bin/env node

// Import Vancouver events from working scrapers
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Use the same connection as the server
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Working Vancouver scrapers (skip broken ones, use working clean versions)
const workingScrapers = [
    'bcLionsEvents_clean.js', 
    'bcPlaceStadiumEvents_clean.js',
    'capilanoSuspensionBridgeEvents_clean.js',
    'grouseMountainEvents_clean.js',
    'richmondOlympicOvalEvents_clean.js',
    'stevestonHeritageHarbourEvents_clean.js',
    'vanAqmEvents_clean.js',
    'vanDusenGardenEvents_clean.js'
];

async function importVancouverEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        let totalImported = 0;
        let totalErrors = 0;
        
        for (const scraperFile of workingScrapers) {
            const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', scraperFile);
            
            if (!fs.existsSync(scraperPath)) {
                console.log(`⚠️  Scraper not found: ${scraperFile}`);
                continue;
            }
            
            try {
                console.log(`\n🔄 Running scraper: ${scraperFile}`);
                
                // Clear require cache
                delete require.cache[require.resolve(scraperPath)];
                
                const scraper = require(scraperPath);
                
                if (typeof scraper === 'function') {
                    const events = await scraper('Vancouver');
                    
                    if (events && events.length > 0) {
                        // Remove duplicates and insert
                        for (const event of events) {
                            try {
                                await collection.updateOne(
                                    { 
                                        title: event.title,
                                        venue: event.venue,
                                        startDate: event.startDate
                                    },
                                    { $set: event },
                                    { upsert: true }
                                );
                                totalImported++;
                            } catch (insertError) {
                                console.log(`❌ Insert error for ${event.title}: ${insertError.message}`);
                                totalErrors++;
                            }
                        }
                        
                        console.log(`✅ ${scraperFile}: ${events.length} events processed`);
                    } else {
                        console.log(`⚠️  ${scraperFile}: No events returned`);
                    }
                } else {
                    console.log(`❌ ${scraperFile}: No scrapeEvents function`);
                }
                
            } catch (error) {
                console.log(`❌ Error with ${scraperFile}: ${error.message}`);
                totalErrors++;
            }
        }
        
        console.log(`\n📊 IMPORT SUMMARY:`);
        console.log(`✅ Total events processed: ${totalImported}`);
        console.log(`❌ Total errors: ${totalErrors}`);
        
        // Check total event count
        const totalEvents = await collection.countDocuments();
        console.log(`📈 Total events in database: ${totalEvents}`);
        
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    importVancouverEvents();
}

module.exports = { importVancouverEvents };
