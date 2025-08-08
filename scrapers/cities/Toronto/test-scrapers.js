const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname);
const allScrapers = require('./index');

const testScrapers = async () => {
    const results = [];
    let totalEvents = 0;

    for (const scraper of allScrapers) {
        try {
            console.log(`⚡ Running ${scraper.venue} scraper...`);
            const events = await scraper.scrape();
            totalEvents += events.length;
            results.push({
                venue: scraper.venue,
                venueId: scraper.venueId,
                eventCount: events.length,
                status: 'success'
            });
        } catch (error) {
            console.error(`❌ Error running ${scraper.venue} scraper:`, error.message);
            results.push({
                venue: scraper.venue,
                venueId: scraper.venueId,
                eventCount: 0,
                status: 'error',
                error: error.message
            });
        }
    }

    console.log('\n--- Toronto Scraper Test Complete ---');
    console.log(`Successfully scraped ${totalEvents} total events.`);
    console.log('📈 Scraper results:', JSON.stringify(results, null, 2));
};

testScrapers();
