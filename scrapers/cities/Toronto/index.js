/**
 * Toronto city scraper coordinator - DYNAMIC LOADER
 * Loads all available scrapers from directory
 */

const fs = require('fs');
const path = require('path');

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
            const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Toronto'));
            
            if (Array.isArray(events) && events.length > 0) {
                const processedEvents = events.map(event => ({
                    ...event,
                    city: 'Toronto'
                }));
                
                allEvents.push(...processedEvents);
                successCount++;
            }
        } catch (error) {
            failCount++;
            // Silently skip errors in production
        }
    }
    
    console.log(`\n🏆 Toronto: ${successCount} working, ${failCount} failed, ${allEvents.length} events`);
    return allEvents;
}

module.exports = scrapeTorontoCityEvents;
