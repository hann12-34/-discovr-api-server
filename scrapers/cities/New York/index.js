/**
 * New York city scraper coordinator - DYNAMIC LOADER
 * Loads all available scrapers from directory
 */

const fs = require('fs');
const path = require('path');

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

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working New York scrapers available - all require syntax reconstruction');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                console.log(`📍 Running scraper for ${source}...`);
                const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper());

                if (Array.isArray(events) && events.length > 0) {
                    const processedEvents = events.map(event => ({
                        ...event,
                        city: 'New York',
                        venue: event.venue || { name: source },
                        categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                    }));

                    allEvents.push(...processedEvents);
                    console.log(`✅ Found ${events.length} events from ${source}`);
                } else {
                    console.log(`⚠️ No events found from ${source}`);
                }
            } catch (error) {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                console.error(`❌ Error running scraper for ${source}:`, error.message);
            }
        }

        console.log(`🎉 New York scrapers found ${allEvents.length} events in total`);
        return allEvents;
    }
}

module.exports = new NewYorkScrapers();
