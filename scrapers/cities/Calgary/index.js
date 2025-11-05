/**
 * Calgary City Event Scrapers Coordinator
 * Manages all working Calgary venue scrapers
 */

// All working Calgary scrapers (13 total)
const scrapeJubileeAuditorium = require('./scrape-jubilee-auditorium');
const scrapeCalgaryZoo = require('./scrape-calgary-zoo');
const scrapeHeritagePark = require('./scrape-heritage-park');
const scrapePalaceTheatreEvents = require('./scrape-the-palace-theatre-events');
const scrapePalaceTheatreNightlife = require('./scrape-the-palace-theatre-nightlife');
const scrapeSpruceMeadows = require('./scrape-spruce-meadows-events');
const scrapeGreyEagle = require('./scrape-grey-eagle-resort-events');
const scrapeCommonwealthNightlife = require('./scrape-commonwealth-bar-stage-nightlife');
const scrapeBrokenCityNightlife = require('./scrape-broken-city-nightlife');
const scrapeCowboysNightlife = require('./scrape-cowboys-music-festival-nightlife');
const scrapeDickensPubNightlife = require('./scrape-dickens-pub-nightlife');
const scrapeNationalOn10thNightlife = require('./scrape-national-on-10th-nightlife');
const scrapeHiFiClubNightlife = require('./scrape-the-hifi-club-nightlife');

const scrapers = [
    { name: 'Jubilee Auditorium', scraper: scrapeJubileeAuditorium },
    { name: 'Calgary Zoo', scraper: scrapeCalgaryZoo },
    { name: 'Heritage Park', scraper: scrapeHeritagePark },
    { name: 'Palace Theatre Events', scraper: scrapePalaceTheatreEvents },
    { name: 'Palace Theatre Nightlife', scraper: scrapePalaceTheatreNightlife },
    { name: 'Spruce Meadows', scraper: scrapeSpruceMeadows },
    { name: 'Grey Eagle Resort', scraper: scrapeGreyEagle },
    { name: 'Commonwealth Bar & Stage Nightlife', scraper: scrapeCommonwealthNightlife },
    { name: 'Broken City Nightlife', scraper: scrapeBrokenCityNightlife },
    { name: 'Cowboys Music Festival Nightlife', scraper: scrapeCowboysNightlife },
    { name: 'Dickens Pub Nightlife', scraper: scrapeDickensPubNightlife },
    { name: 'National on 10th Nightlife', scraper: scrapeNationalOn10thNightlife },
    { name: 'HiFi Club Nightlife', scraper: scrapeHiFiClubNightlife }
];

async function scrapeCalgaryCityEvents() {
    console.log('🍁 Starting Calgary city event scraping...');
    const allEvents = [];
    let successfulScrapers = 0;

    for (const { name, scraper } of scrapers) {
        try {
            console.log(`📍 Scraping ${name}...`);
            const events = await scraper();
            
            if (Array.isArray(events) && events.length > 0) {
                allEvents.push(...events);
                successfulScrapers++;
                console.log(`✅ ${name}: ${events.length} events`);
            } else {
                console.log(`⚠️  ${name}: 0 events`);
            }
        } catch (error) {
            console.error(`❌ ${name}: ${error.message}`);
        }
    }
    
    console.log(`\n🏆 CALGARY RESULTS:`);
    console.log(`Working scrapers: ${successfulScrapers}/${scrapers.length}`);
    console.log(`Total events: ${allEvents.length}`);
    
    return allEvents;
}

module.exports = scrapeCalgaryCityEvents;
