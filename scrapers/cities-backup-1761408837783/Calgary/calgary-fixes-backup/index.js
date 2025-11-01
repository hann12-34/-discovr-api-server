/**
 * Calgary city scraper coordinator - CLEAN RECONSTRUCTION
 * Uses only reconstructed, corruption-free scrapers
 */

// CLEAN RECONSTRUCTED SCRAPERS ONLY
const ArtsCommonsEvents = require('./scrape-arts-commons');
const SaddledomeEvents = require('./scrape-saddledome'); 
const StampedeEvents = require('./scrape-stampede');
const CalgaryZooEvents = require('./scrape-calgary-zoo');
const TelusSparkEvents = require('./scrape-telus-spark');
const GlenbowMuseumEvents = require('./scrape-glenbow-museum');
const HeritageParkEvents = require('./scrape-heritage-park');
const CalgaryTowerEvents = require('./scrape-calgary-tower');
const StudioBellEvents = require('./scrape-studio-bell');

class CalgaryScrapers {
    constructor() {
        this.city = 'Calgary';
        this.province = 'AB';
        this.sourceIdentifier = 'Calgary';
        
        // Only use clean, reconstructed scrapers
        this.venueScrapers = [
            new ArtsCommonsEvents(),
            new SaddledomeEvents(),
            new StampedeEvents(),
            new CalgaryZooEvents(),
            new TelusSparkEvents(),
            new GlenbowMuseumEvents(),
            new HeritageParkEvents(),
            new CalgaryTowerEvents(),
            new StudioBellEvents()
        ];
        
        console.log(`🎆 Calgary Scrapers initialized with ${this.venueScrapers.length} clean scrapers!`);
        console.log(`🎯 Target: 100+ Calgary events from priority venues`);
    }

    async scrape() {
        console.log('🚀 Starting Calgary scrapers...');
        const allEvents = [];
        
        for (const scraper of this.venueScrapers) {
            try {
                const source = scraper.constructor.name || 'Unknown Scraper';
                console.log(`📍 Running scraper for ${source}...`);
                const events = await scraper.scrape();
                
                if (Array.isArray(events) && events.length > 0) {
                    allEvents.push(...events);
                    console.log(`✅ Found ${events.length} events from ${source}`);
                } else {
                    console.log(`⚠️ No events found from ${source}`);
                }
            } catch (error) {
                const source = scraper.constructor.name || 'Unknown Scraper';
                console.error(`❌ Error running scraper for ${source}:`, error.message);
            }
        }
        
        console.log(`🎯 Calgary total: ${allEvents.length} events from ${this.venueScrapers.length} scrapers`);
        return allEvents;
    }
}

module.exports = new CalgaryScrapers();
