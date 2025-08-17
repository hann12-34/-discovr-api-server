/**
 * Toronto city scraper coordinator - CLEAN RECONSTRUCTION
 * Uses only verified, existing scrapers
 */

// WORKING TORONTO SCRAPERS ONLY - VERIFIED FUNCTIONAL
const AGOEvents = require('./scrape-ago-events');
const CasaLomaEvents = require('./scrape-casa-loma-events');
const CNTowerEvents = require('./scrape-cn-tower');
const DanforthMusicHall = require('./scrape-danforth-music-hall');
const DistilleryDistrict = require('./scrape-distillery-district-events');

class TorontoScrapers {
    constructor(scrapersToRun) {
        this.city = 'Toronto';
        this.province = 'ON';
        this.sourceIdentifier = 'Toronto';
        
        // Working scrapers with proper export format
        const allScrapers = [
            {
                name: 'AGO Events',
                scrape: AGOEvents.scrapeEvents || AGOEvents,
                source: 'Art Gallery of Ontario'
            },
            {
                name: 'Casa Loma Events', 
                scrape: CasaLomaEvents.scrapeEvents || CasaLomaEvents,
                source: 'Casa Loma'
            },
            {
                name: 'CN Tower Events',
                scrape: CNTowerEvents.scrapeEvents || CNTowerEvents,
                source: 'CN Tower'
            },
            {
                name: 'Danforth Music Hall',
                scrape: DanforthMusicHall.scrapeEvents || DanforthMusicHall,
                source: 'Danforth Music Hall'
            },
            {
                name: 'Distillery District',
                scrape: DistilleryDistrict.scrapeEvents || DistilleryDistrict,
                source: 'Distillery District'
            }
        ];

        this.scrapers = scrapersToRun || allScrapers;

        console.log(`🎆 Toronto Scrapers initialized with ${this.scrapers.length} clean scrapers!`);
        console.log(`🎯 Target: Clean Toronto events from verified venues`);
    }

    async scrape() {
        console.log('🏙️ Starting Toronto scrapers...');
        const allEvents = [];

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.constructor.name || 'Unknown Scraper';
                console.log(`📍 Running scraper for ${source}...`);
                const events = await scraper.scrape();

                if (Array.isArray(events) && events.length > 0) {
                    // Ensure all events have Toronto city and venue info for mobile app filtering
                    const processedEvents = events.map(event => ({
                        ...event,
                        city: 'Toronto',
                        location: event.location || `Toronto, ${this.province}`,
                        venue: {
                            ...event.venue,
                            name: event.venue?.name || source,
                            address: event.venue?.address || 'Toronto, ON',
                            city: 'Toronto',
                            state: this.province
                        },
                        categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                    }));

                    allEvents.push(...processedEvents);
                    console.log(`✅ Found ${events.length} events from ${source}`);
                } else {
                    console.log(`⚠️ No events found from ${source}`);
                }
            } catch (error) {
                const source = scraper.source || scraper.constructor.name || 'Unknown Scraper';
                console.error(`❌ Error running scraper for ${source}:`, error.message);
            }
        }

        console.log(`🎉 Toronto scrapers found ${allEvents.length} events in total`);
        return allEvents;
    }
}

module.exports = new TorontoScrapers();
