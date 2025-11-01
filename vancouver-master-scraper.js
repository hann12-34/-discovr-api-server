#!/usr/bin/env node

// Improved Vancouver Master Scraper - replaces broken mass import
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

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
    'vanDusenGardenEvents_clean.js',
    // Working nightlife scrapers that return real events only
    'test-runner/cities/vancouver/celebritiesNightclub.js',
    'test-runner/cities/vancouver/fortuneSoundClub.js',
    'test-runner/cities/vancouver/levelsNightclub.js',
    'test-runner/cities/vancouver/venueNightclub.js',
    'commodoreBallroomEvents.js'
];

// Title validation - filter out garbage titles like IDs
function validateEventTitle(title) {
    if (!title || typeof title !== 'string') {
        return false;
    }
    
    title = title.trim();
    
    // Skip empty or very short titles
    if (title.length < 3) {
        return false;
    }
    
    // Skip Ticketmaster event IDs (like 110062E8B17F3568)
    if (/^110062[A-F0-9]{8,}$/i.test(title)) {
        console.log(`🚫 Skipping Ticketmaster ID as title: "${title}"`);
        return false;
    }
    
    // Skip other random hex/numeric IDs
    if (/^[0-9A-F]{12,}$/i.test(title)) {
        console.log(`🚫 Skipping random ID as title: "${title}"`);
        return false;
    }
    
    // Skip pure numeric IDs
    if (/^\d{8,}$/.test(title)) {
        console.log(`🚫 Skipping numeric ID as title: "${title}"`);
        return false;
    }
    
    return true;
}

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
        
        const db = client.db('events');
        const collection = db.collection('events');
        
        let totalImported = 0;
        let totalSkipped = 0;
        
        for (const scraperFile of reliableScrapers) {
            let scraperPath;
            if (scraperFile.startsWith('vancouver-') && scraperFile.includes('-scraper.js')) {
                // New clean scrapers are in the root directory
                scraperPath = path.join(__dirname, scraperFile);
            } else if (['barNoneClub.js', 'celebritiesNightclub.js', 'redRoomEvents.js', 'fortuneSoundClub.js', 'levelsNightclub.js', 'venueNightclub.js', 'commodoreBallroomEvents.js'].includes(scraperFile)) {
                // Nightlife scrapers are in test-runner directory
                scraperPath = path.join(__dirname, 'test-runner', 'cities', 'vancouver', scraperFile);
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
                } else if (scraper && typeof scraper.scrape === 'function') {
                    // Handle instance-based scrapers (exported as instances)
                    try {
                        events = await scraper.scrape();
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
                        
                        // Validate event title to skip garbage IDs
                        if (!validateEventTitle(event.title)) {
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
                            
                            const result = await collection.updateOne(
                                { 
                                    title: cleanEvent.title,
                                    'venue.name': cleanEvent.venue.name,
                                    startDate: cleanEvent.startDate
                                },
                                { $set: cleanEvent },
                                { upsert: true }
                            );
                            
                            // Remove verbose logging to prevent EPIPE errors
                            
                            // Simple increment - stop over-complicating
                            if (result.upsertedCount > 0 || result.modifiedCount > 0) {
                                scraperImported++;
                                totalImported++;
                            } else {
                                scraperSkipped++;
                                totalSkipped++;
                            }
                            
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
        
        // Final summary - DEBUG THE ACTUAL DATABASE
        console.log(`\n🔍 DEBUGGING DATABASE CONNECTION:`);
        console.log(`Expected database: events`);
        console.log(`Actually connected to: ${db.databaseName}`);
        console.log(`Collection: events`);
        
        const vancouverCount = await collection.countDocuments({ city: 'Vancouver' });
        const totalCount = await collection.countDocuments({});
        const allCities = await collection.distinct('city');
        const futureEvents = await collection.countDocuments({ 
            city: 'Vancouver',
            startDate: { $gte: new Date() }
        });
        
        console.log(`📊 IMPORT SUMMARY:`);
        console.log(`✅ Total imported (claimed): ${totalImported}`);
        console.log(`⚠️  Total skipped (bad dates): ${totalSkipped}`);
        console.log(`📈 ACTUAL DATABASE STATS:`);
        console.log(`   - Total events in DB: ${totalCount}`);
        console.log(`   - Vancouver events in DB: ${vancouverCount}`);
        console.log(`   - All cities in DB: ${JSON.stringify(allCities)}`);
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
