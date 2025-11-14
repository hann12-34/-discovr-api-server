/**
 * Toronto city scraper coordinator - DYNAMIC LOADER
 * Loads all available scrapers from directory
 */

const fs = require('fs');
const path = require('path');
const { toISODate } = require('../../utils/dateNormalizer');

async function scrapeTorontoCityEvents() {
    console.log('🍁 Starting Toronto scrapers...');
    const allEvents = [];
    let successCount = 0;
    let failCount = 0;
    
    // Dynamically load all scrapers from directory
    const scraperFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.js') && 
                       file !== 'index.js' && 
                       !file.includes('test') && 
                       !file.includes('backup') && 
                       !file.includes('template'));
    
    console.log(`📍 Found ${scraperFiles.length} potential Toronto scrapers`);
    
    const scrapers = [];
    for (const file of scraperFiles) {
        try {
            const scraperPath = path.join(__dirname, file);
            const scraper = require(scraperPath);
            scrapers.push(scraper);
        } catch (error) {
            // Skip broken scrapers silently
        }
    }
    
    console.log(`✅ Loaded ${scrapers.length} working Toronto scrapers`);
    
    // Run all scrapers
    for (const scraper of scrapers) {
        try {
            const source = scraper.source || scraper.name || 'Unknown Scraper';
            const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Toronto'));
            
            if (Array.isArray(events) && events.length > 0) {
                const processedEvents = events.map(event => {
                    // NO FALLBACKS - only use real poster images from scrapers
                    // If scraper didn't find an image, leave it null
                    return {
                        ...event,
                        imageUrl: event.imageUrl || event.image || null,
                        image: event.imageUrl || event.image || null,
                        city: 'Toronto'
                    };
                });
                
                allEvents.push(...processedEvents);
                successCount++;
            }
        } catch (error) {
            failCount++;
            // Silently skip errors in production
        }
    }
    
    console.log(`\n🏆 Toronto: ${successCount} working, ${failCount} failed, ${allEvents.length} raw events`);
    
    // DEDUPLICATION: Remove duplicate events (by title + date)
    const seenEvents = new Set();
    const dedupedEvents = [];
    let duplicateCount = 0;
    
    for (const event of allEvents) {
        const key = `${event.title?.toLowerCase()?.trim()}|${event.date?.toLowerCase()?.trim()}`;
        if (!seenEvents.has(key)) {
            seenEvents.add(key);
            dedupedEvents.push(event);
        } else {
            duplicateCount++;
        }
    }
    
    if (duplicateCount > 0) {
        console.log(`🧹 Removed ${duplicateCount} duplicate events`);
    }
    
    // DATE VALIDATION: Filter out events with unparseable dates ONLY
    // Keep ALL events with valid dates (past, present, future) - many are ongoing exhibitions/shows
    const filteredEvents = [];
    let skippedCount = 0;
    
    for (const event of dedupedEvents) {
        if (event.date) {
            const isoDate = toISODate(event.date);
            if (isoDate) {
                event.date = isoDate; // Normalize to YYYY-MM-DD
                filteredEvents.push(event);
            } else {
                skippedCount++;
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`  ❌ Skipped bad date: "${event.date}" - ${event.title}`);
                }
            }
        } else {
            skippedCount++; // Skip events with no date
        }
    }
    
    console.log(`✅ ${filteredEvents.length} valid events (skipped ${skippedCount} with bad dates)`);
    return filteredEvents;
}

module.exports = scrapeTorontoCityEvents;
