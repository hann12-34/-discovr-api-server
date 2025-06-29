const roxyScraper = require('./scrapers/roxy-scraper');

async function testRoxyScraper() {
    console.log("Testing The Roxy scraper...");
    
    const events = await roxyScraper.scrape();
    console.log(`Found ${events.length} events.`);
    console.log(events);
}

testRoxyScraper();
