/**
 * New York city scraper coordinator - DYNAMIC LOADER
 * Loads all available scrapers from directory
 */

const fs = require('fs');
const path = require('path');
const { toISODate } = require('../../utils/dateNormalizer');

class NewYorkScrapers {
    constructor(scrapersToRun) {
        this.city = 'New York';
        this.province = 'NY';
        this.sourceIdentifier = 'NewYork';
        
        // Dynamically load all scrapers from directory
        const allScrapers = [];
        const scraperFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && 
                           file !== 'index.js' && 
                           !file.includes('test') && 
                           !file.includes('backup') && 
                           !file.includes('template'));
        
        console.log(`🗽 Found ${scraperFiles.length} potential New York scrapers`);
        
        for (const file of scraperFiles) {
            try {
                const scraperPath = path.join(__dirname, file);
                const scraper = require(scraperPath);
                allScrapers.push(scraper);
            } catch (error) {
                // Skip broken scrapers silently
            }
        }

        this.scrapers = scrapersToRun || allScrapers;
        console.log(`✅ Loaded ${this.scrapers.length} working New York scrapers`);
    }

    async scrape() {
        console.log('🗽 Starting New York scrapers...');
        const allEvents = [];
        let successCount = 0;
        let failCount = 0;

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working New York scrapers available');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('New York'));

                if (Array.isArray(events) && events.length > 0) {
                    const processedEvents = events.map(event => ({
                        ...event,
                        city: 'New York',
                        venue: event.venue || { name: source },
                        categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                    }));

                    allEvents.push(...processedEvents);
                    successCount++;
                    console.log(`✅ ${source}: ${events.length} events`);
                } else {
                    // Silently skip scrapers with 0 events (many are stubs)
                }
            } catch (error) {
                failCount++;
                // Only log errors in development, not production
                if (process.env.NODE_ENV !== 'production') {
                    const source = scraper.source || scraper.name || 'Unknown';
                    console.error(`❌ ${source}: ${error.message.substring(0, 50)}`);
                }
            }
        }
        
        // GLOBAL DEDUPLICATION: Remove duplicates across all scrapers
        const seen = new Set();
        const uniqueEvents = [];
        
        for (const event of allEvents) {
            // Convert date to ISO format for reliable iOS parsing
            if (event.date) {
                const isoDate = toISODate(event.date);
                if (isoDate) {
                    event.date = isoDate; // Replace with ISO format: YYYY-MM-DD
                }
            }
            
            // Create unique key: title + date + venue (case-insensitive, normalized)
            const normalizedTitle = event.title.toLowerCase().trim().replace(/\s+/g, ' ');
            const normalizedDate = (event.date || '').toLowerCase().trim().replace(/\s+/g, ' ');
            const venueName = (event.venue?.name || event.source || '').toLowerCase().trim();
            
            const key = `${normalizedTitle}|${normalizedDate}|${venueName}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
            }
        }
        
        const duplicatesRemoved = allEvents.length - uniqueEvents.length;
        if (duplicatesRemoved > 0) {
            console.log(`\n🧹 Removed ${duplicatesRemoved} duplicate events`);
        }
        
        console.log(`\n🏆 NY: ${successCount} working, ${failCount} failed, ${uniqueEvents.length} events`);
        return uniqueEvents;
    }
}

module.exports = async function scrapeNewYorkCityEvents() {
    const scraper = new NewYorkScrapers();
    return await scraper.scrape();
};
