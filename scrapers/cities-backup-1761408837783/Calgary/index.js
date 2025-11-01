/**
 * Calgary City Event Scrapers Coordinator
 * Manages all working Calgary venue scrapers
 */

// Working Calgary scrapers
const scrapeSaddledome = require('./scrape-saddledome');
const scrapeJubileeAuditorium = require('./scrape-jubilee-auditorium');
const scrapeTheatreCalgary = require('./scrape-theatre-calgary');
const scrapeCalgaryZoo = require('./scrape-calgary-zoo');
const scrapeHeritagePark = require('./scrape-heritage-park');
const scrapeArtsCommons = require('./scrape-calgary-centre-for-performing-arts');
const scrapeCommonwealth = require('./scrape-commonwealth-bar-stage');
const scrapeCalgaryStampede = require('./scrape-calgary-stampede');
const scrapePalaceTheatre = require('./scrape-palace-theatre');

const scrapers = [
    { name: 'Scotiabank Saddledome', scraper: scrapeSaddledome },
    { name: 'Jubilee Auditorium', scraper: scrapeJubileeAuditorium },
    { name: 'Theatre Calgary', scraper: scrapeTheatreCalgary },
    { name: 'Calgary Zoo', scraper: scrapeCalgaryZoo },
    { name: 'Heritage Park', scraper: scrapeHeritagePark },
    { name: 'Arts Commons Calgary', scraper: scrapeArtsCommons },
    { name: 'Commonwealth Bar & Stage', scraper: scrapeCommonwealth },
    { name: 'Calgary Stampede', scraper: scrapeCalgaryStampede },
    { name: 'Palace Theatre', scraper: scrapePalaceTheatre }
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
