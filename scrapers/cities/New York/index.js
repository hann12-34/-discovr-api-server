/**
 * New York city scraper coordinator - CLEAN RECONSTRUCTION
 * Nuclear reconstruction approach due to massive syntax corruption across scrapers
 */

class NewYorkScrapers {
    constructor(scrapersToRun) {
        this.city = 'New York';
        this.province = 'NY';
        this.sourceIdentifier = 'NewYork';
        
        // RECONSTRUCTED NEW YORK SCRAPERS - VERIFIED WORKING
        const ApolloTheaterEvents = require('./apollotheater-clean');
        const CarnegieHallEvents = require('./carnegiehall-clean');
        const LincolnCenterEvents = require('./lincolncenter-clean');
        
        const allScrapers = [
            new ApolloTheaterEvents(),
            new CarnegieHallEvents(),
            new LincolnCenterEvents()
        ];

        this.scrapers = scrapersToRun || allScrapers;

        console.log(`🎆 New York Scrapers initialized - ${this.scrapers.length} clean scrapers`);
        console.log(`⚠️ New York scrapers require nuclear reconstruction due to massive syntax corruption`);
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
