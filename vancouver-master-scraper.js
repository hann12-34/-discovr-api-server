#!/usr/bin/env node

// Improved Vancouver Master Scraper - replaces broken mass import
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Working Vancouver scrapers - mix of legacy and new clean scrapers
const reliableScrapers = [
    // New clean scrapers (guaranteed working)
    'vancouver-rogers-arena-scraper.js',
    'vancouver-science-world-scraper.js', 
    'vancouver-granville-island-scraper.js',
    'vancouver-aquarium-scraper.js',
    // Legacy scrapers that successfully import events
    'japanMarketEvents.js',
    'khatsahlanoEvents.js',
    'maritimeMuseumEvents.js',
    'vancouverCanucksEvents_clean.js',
    'vanDusenGardenEvents_clean.js'
];

// Date validation and correction
function validateAndFixDate(dateString, eventTitle) {
    if (!dateString) {
        console.log(`⚠️  No date for "${eventTitle}" - skipping`);
        return null;
    }
    
    const date = new Date(dateString);
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    // Skip events with invalid dates
    if (isNaN(date.getTime())) {
        console.log(`❌ Invalid date for "${eventTitle}": ${dateString}`);
        return null;
    }
    
    // Skip events older than 1 year or more than 1 year in future
    if (date < oneYearAgo || date > oneYearFromNow) {
        console.log(`📅 Date out of range for "${eventTitle}": ${date.toDateString()}`);
        return null;
    }
    
    return date;
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
        
        for (const scraperFile of reliableScrapers) {
            let scraperPath;
            if (scraperFile.startsWith('vancouver-') && scraperFile.includes('-scraper.js')) {
                // New clean scrapers are in the root directory
                scraperPath = path.join(__dirname, scraperFile);
            } else {
                // Legacy scrapers are in the vancouver subdirectory
                scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', scraperFile);
            }
            
            if (!fs.existsSync(scraperPath)) {
                console.log(`⚠️  Scraper not found: ${scraperFile}`);
                continue;
            }
            
            try {
                console.log(`\n🔄 Running: ${scraperFile}`);
                const scraper = require(scraperPath);
                
                let events;
                // Check if it's a class-based scraper first
                if (scraper && scraper.prototype && typeof scraper.prototype.scrape === 'function') {
                    // Handle class-based scrapers
                    try {
                        const scraperInstance = new scraper();
                        events = await scraperInstance.scrape();
                    } catch (scraperError) {
                        console.log(`❌ Runtime error in ${scraperFile}: ${scraperError.message.split('\n')[0]}`);
                        continue;
                    }
                } else if (typeof scraper === 'function') {
                    try {
                        events = await scraper('Vancouver');
                    } catch (scraperError) {
                        console.log(`❌ Runtime error in ${scraperFile}: ${scraperError.message.split('\n')[0]}`);
                        continue;
                    }
                } else {
                    console.log(`❌ ${scraperFile}: Not a valid scraper`);
                    continue;
                }
                
                if (events && events.length > 0) {
                    let scraperImported = 0;
                    let scraperSkipped = 0;
                    
                    for (const event of events) {
                        // Ensure event has required fields
                        if (!event.title || !event.venue?.name) {
                            scraperSkipped++;
                            totalSkipped++;
                            continue;
                        }
                        
                        // Skip date validation for our clean scrapers - they have good dates
                        const isCleanScraper = scraperFile.includes('vancouver-') && scraperFile.includes('-scraper.js');
                        let validStartDate;
                        
                        if (isCleanScraper) {
                            validStartDate = new Date(event.startDate);
                        } else {
                            // Legacy scrapers need date validation
                            const dateToCheck = event.startDate || event.date;
                            validStartDate = validateAndFixDate(dateToCheck, event.title);
                            
                            if (!validStartDate) {
                                scraperSkipped++;
                                totalSkipped++;
                                continue;
                            }
                        }
                        
                        // Ensure proper Vancouver tagging
                        let endDate;
                        if (isCleanScraper) {
                            endDate = event.endDate ? new Date(event.endDate) : validStartDate;
                        } else {
                            endDate = validateAndFixDate(event.endDate, event.title) || validStartDate;
                        }
                        
                        const cleanEvent = {
                            ...event,
                            startDate: validStartDate,
                            endDate: endDate,
                            venue: {
                                ...event.venue,
                                city: 'Vancouver'
                            },
                            city: 'Vancouver'
                        };
                        
                        try {
                            // Debug for clean scrapers
                            if (isCleanScraper) {
                                console.log(`🐛 Attempting import: ${cleanEvent.title}`);
                            }
                            
                            await collection.updateOne(
                                { 
                                    title: cleanEvent.title,
                                    'venue.name': cleanEvent.venue.name,
                                    startDate: cleanEvent.startDate
                                },
                                { $set: cleanEvent },
                                { upsert: true }
                            );
                            scraperImported++;
                            totalImported++;
                            
                            if (isCleanScraper) {
                                console.log(`✅ Successfully imported: ${cleanEvent.title}`);
                            }
                        } catch (insertError) {
                            console.log(`❌ Insert error for ${cleanEvent.title}: ${insertError.message}`);
                        }
                    }
                    
                    console.log(`✅ ${scraperFile}: ${scraperImported} imported, ${scraperSkipped} skipped`);
                } else {
                    console.log(`❌ ${scraperFile}: No events found`);
                }
            } catch (error) {
                console.log(`❌ Error in ${scraperFile}: ${error.message}`);
            }
        }
        
        // Final summary
        const vancouverCount = await collection.countDocuments({ 'venue.city': 'Vancouver' });
        const futureEvents = await collection.countDocuments({ 
            'venue.city': 'Vancouver',
            startDate: { $gte: new Date() }
        });
        
        console.log(`\n📊 IMPORT SUMMARY:`);
        console.log(`✅ Total imported: ${totalImported}`);
        console.log(`⚠️  Total skipped (bad dates): ${totalSkipped}`);
        console.log(`📈 Total Vancouver events: ${vancouverCount}`);
        console.log(`🔮 Future Vancouver events: ${futureEvents}`);
        
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    importReliableEvents();
}

module.exports = { importReliableEvents };
