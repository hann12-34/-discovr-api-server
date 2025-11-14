/**
 * Vancouver city scraper coordinator
 * Loads all available scrapers from directory and normalizes dates
 */

const fs = require('fs');
const path = require('path');
const { toISODate } = require('../../utils/dateNormalizer');

class VancouverScrapers {
    constructor(scrapersToRun) {
        this.city = 'Vancouver';
        this.province = 'BC';
        this.sourceIdentifier = 'Vancouver';
        
        // Dynamically load all scrapers from directory
        const allScrapers = [];
        const scraperFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && 
                           file !== 'index.js' && 
                           !file.includes('test') && 
                           !file.includes('backup') && 
                           !file.includes('template'));
        
        console.log(`🍁 Found ${scraperFiles.length} potential Vancouver scrapers`);
        
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
        console.log(`✅ Loaded ${this.scrapers.length} working Vancouver scrapers`);
    }

    async scrape() {
        console.log('🍁 Starting Vancouver scrapers...');
        const allEvents = [];
        let successCount = 0;
        let failCount = 0;

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working Vancouver scrapers available');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Vancouver'));

                if (Array.isArray(events) && events.length > 0) {
                    const processedEvents = events.map(event => {
                        // NO FALLBACKS - only use real poster images from scrapers
                        // If scraper didn't find an image, leave it null
                        return {
                            ...event,
                            imageUrl: event.imageUrl || event.image || null,
                            image: event.imageUrl || event.image || null,
                            city: 'Vancouver',
                            venue: event.venue || { name: source },
                            categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                        };
                    });

                    allEvents.push(...processedEvents);
                    successCount++;
                    console.log(`✅ ${source}: ${events.length} events`);
                } else {
                    // Silently skip scrapers with 0 events
                }
            } catch (error) {
                failCount++;
                if (process.env.NODE_ENV !== 'production') {
                    const source = scraper.source || scraper.name || 'Unknown';
                    console.error(`❌ ${source}: ${error.message.substring(0, 50)}`);
                }
            }
        }
        
        // CRITICAL: Normalize dates to ISO format for consistent iOS parsing
        const validEvents = [];
        
        for (const event of allEvents) {
            // Convert date to ISO format
            if (event.date) {
                const isoDate = toISODate(event.date);
                if (isoDate) {
                    event.date = isoDate; // Replace with ISO format: YYYY-MM-DD
                } else {
                    // Skip events with unparseable dates
                    console.log(`  ❌ Skipping event with bad date: "${event.date}" - ${event.title}`);
                    continue;
                }
            } else {
                // Skip events with no date
                continue;
            }
            
            validEvents.push(event);
        }
        
        console.log(`\n🏆 Vancouver: ${successCount} working, ${failCount} failed, ${allEvents.length} raw events`);
        console.log(`✅ ${validEvents.length} valid events (skipped ${allEvents.length - validEvents.length} with bad dates)`);
        
        return validEvents;
    }
}

module.exports = async () => {
    const scraper = new VancouverScrapers();
    return scraper.scrape();
};
