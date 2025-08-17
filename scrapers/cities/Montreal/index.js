/**
 * Montreal city scraper coordinator - CLEAN RECONSTRUCTION
 * Nuclear reconstruction approach due to massive syntax corruption across scrapers
 */

class MontrealScrapers {
    constructor(scrapersToRun) {
        this.city = 'Montreal';
        this.province = 'QC';
        this.sourceIdentifier = 'Montreal';
        
        // RECONSTRUCTED MONTREAL SCRAPERS - VERIFIED WORKING
        const OlympiaDeMontrealEvents = require('./scrape-lympiademontreal-clean');
        
        const allScrapers = [
            new OlympiaDeMontrealEvents()
        ];

        this.scrapers = scrapersToRun || allScrapers;

        console.log(`🎆 Montreal Scrapers initialized - ${this.scrapers.length} clean scrapers`);
        console.log(`⚠️ Montreal scrapers require nuclear reconstruction due to massive syntax corruption`);
    }

    async scrape() {
        console.log('🏙️ Starting Montreal scrapers...');
        const allEvents = [];

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working Montreal scrapers available - all require syntax reconstruction');
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
                        city: 'Montreal',
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

        console.log(`🎉 Montreal scrapers found ${allEvents.length} events in total`);
        return allEvents;
    }
}

module.exports = new MontrealScrapers();
