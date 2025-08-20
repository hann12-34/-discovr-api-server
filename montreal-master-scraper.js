#!/usr/bin/env node

// Montreal Master Scraper - batch run Montreal scrapers
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Working Montreal scrapers (tested and functional)
const workingScrapers = [
    'montreal-place-des-arts-scraper.js',
    'montreal-centre-bell-scraper.js',
    'montreal-biodome-scraper.js',
    'montreal-mount-royal-scraper.js',
    'montreal-vieux-montreal-scraper.js',
    'scrapers/cities/Montreal/scrape-lacedesarts-clean.js',
    'scrapers/cities/Montreal/scrape-ellcentre-clean.js',
    'montreal-olympic-stadium-scraper.js',
    'montreal-casino-scraper.js',
    'montreal-notre-dame-scraper.js'
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
    
    // Skip events more than 2 years in the past or future
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    
    if (date < twoYearsAgo || date > twoYearsFromNow) {
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
                
                const ScraperClass = require(scraperPath);
                const scraperInstance = new ScraperClass();
                const events = await scraperInstance.scrape();
                
                let imported = 0;
                let skipped = 0;
                
                for (const event of events) {
                    // Validate date (check both startDate and date fields)
                    const dateToValidate = event.startDate || event.date;
                    const validDate = validateAndFixDate(dateToValidate, event.title);
                    if (!validDate) {
                        skipped++;
                        continue;
                    }
                    
                    // Normalize event data
                    const normalizedEvent = {
                        ...event,
                        startDate: validDate,
                        city: 'Montreal',
                        venue: {
                            ...event.venue,
                            city: 'Montreal'
                        }
                    };
                    
                    try {
                        await collection.replaceOne(
                            { id: normalizedEvent.id },
                            normalizedEvent,
                            { upsert: true }
                        );
                        imported++;
                    } catch (error) {
                        console.log(`⚠️  Error importing "${event.title}":`, error.message);
                        skipped++;
                    }
                }
                
                console.log(`✅ ${scraperFile}: ${imported} imported, ${skipped} skipped`);
                totalImported += imported;
                totalSkipped += skipped;
                
            } catch (error) {
                console.log(`❌ Error running ${scraperFile}:`, error.message);
            }
        }
        
        // Get final counts
        const totalEvents = await collection.countDocuments({ city: 'Montreal' });
        const futureEvents = await collection.countDocuments({
            city: 'Montreal',
            startDate: { $gte: new Date().toISOString() }
        });
        
        console.log('\n📊 IMPORT SUMMARY:');
        console.log(`✅ Total imported: ${totalImported}`);
        console.log(`⚠️  Total skipped (bad dates): ${totalSkipped}`);
        console.log(`📈 Total Montreal events: ${totalEvents}`);
        console.log(`🔮 Future Montreal events: ${futureEvents}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await client.close();
    }
}

// Run the import
if (require.main === module) {
    importReliableEvents();
}

module.exports = { importReliableEvents, workingScrapers };
