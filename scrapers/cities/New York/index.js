/**
 * New York City Scrapers Coordinator
 * 
 * This module manages and orchestrates all New York venue scrapers
 */

const MadisonSquareGarden = require('./madison-square-garden');
const BarclaysCenter = require('./barclays-center');
const LincolnCenter = require('./lincoln-center');
const RadioCityMusicHall = require('./radio-city-music-hall');
const WebsterHall = require('./webster-hall');
const BoweryBallroom = require('./bowery-ballroom');

class NewYorkScrapers {
    constructor() {
        this.scrapers = [
            // Major arenas and stadiums
            new MadisonSquareGarden(),
            new BarclaysCenter(),
            
            // Cultural venues
            new LincolnCenter(),
            new RadioCityMusicHall(),
            
            // Music venues
            new WebsterHall(),
            new BoweryBallroom()
        ];
        
        console.log(`🗽 New York Scrapers initialized with ${this.scrapers.length} active scrapers!`);
        console.log(`🎯 Target: 1000+ New York events across all major venues`);
    }

    /**
     * Run all New York scrapers and aggregate events
     * @returns {Promise<Array>} Combined array of all events from all scrapers
     */
    async scrape() {
        console.log(`🚀 Starting New York scraping with ${this.scrapers.length} venue scrapers...`);
        
        const allEvents = [];
        const scraperResults = [];

        for (const scraper of this.scrapers) {
            try {
                console.log(`⚡ Running ${scraper.venueName} scraper...`);
                const events = await scraper.scrape();
                allEvents.push(...events);
                scraperResults.push({
                    venue: scraper.venueName,
                    venueId: scraper.venueId,
                    eventCount: events.length,
                    status: 'success'
                });
            } catch (error) {
                console.error(`❌ Error in ${scraper.venueName} scraper:`, error.message);
                scraperResults.push({
                    venue: scraper.venueName,
                    venueId: scraper.venueId,
                    eventCount: 0,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log(`✅ New York scraping completed!`);
        console.log(`📊 Total events found: ${allEvents.length}`);
        console.log(`📈 Scraper results:`, scraperResults);

        return allEvents;
    }

    /**
     * Get metadata about all scrapers
     * @returns {Object} Metadata about the scraper collection
     */
    getScraperMetadata() {
        return {
            city: 'New York',
            totalScrapers: this.scrapers.length,
            scrapers: this.scrapers.map(scraper => ({
                venueName: scraper.venueName,
                venueId: scraper.venueId,
                city: scraper.city,
                baseUrl: scraper.baseUrl
            }))
        };
    }
}

module.exports = NewYorkScrapers;
