/**
 * Calgary City Event Scrapers Coordinator
 * Manages all working Calgary venue scrapers
 */

const { toISODate } = require('../../utils/dateNormalizer');

// All working Calgary scrapers (13 total)
const scrapeJubileeAuditorium = require('./scrape-jubilee-auditorium');
const scrapeCalgaryZoo = require('./scrape-calgary-zoo');
const scrapeHeritagePark = require('./scrape-heritage-park');
const scrapePalaceTheatreEvents = require('./scrape-the-palace-theatre-events');
const scrapeSpruceMeadows = require('./scrape-spruce-meadows-events');
const scrapeGreyEagle = require('./scrape-grey-eagle-resort-events');
const scrapeCommonwealthNightlife = require('./scrape-commonwealth-bar-stage-nightlife');
const scrapeBrokenCityNightlife = require('./scrape-broken-city-nightlife');
const scrapeCowboysNightlife = require('./scrape-cowboys-music-festival-nightlife');
const scrapeDickensPubNightlife = require('./scrape-dickens-pub-nightlife');
const scrapeNationalOn10thNightlife = require('./scrape-national-on-10th-nightlife');
const scrapeHiFiClubNightlife = require('./scrape-the-hifi-club-nightlife');
const scrapeShipAndAnchor = require('./scrape-the-ship-and-anchor');
const scrapeLastBestBrewing = require('./scrape-last-best-brewing');
const scrapeSaddledome = require('./scrape-saddledome');
const scrapeArtsCommons = require('./scrape-arts-commons');
const scrapeNationalMusicCentre = require('./scrape-national-music-centre');

const scrapers = [
    // Major event venues
    { name: 'Saddledome', scraper: scrapeSaddledome },
    { name: 'Arts Commons', scraper: scrapeArtsCommons },
    { name: 'National Music Centre', scraper: scrapeNationalMusicCentre },
    { name: 'Jubilee Auditorium', scraper: scrapeJubileeAuditorium },
    { name: 'Palace Theatre', scraper: scrapePalaceTheatreEvents },
    { name: 'Grey Eagle Resort', scraper: scrapeGreyEagle },
    // Attractions
    { name: 'Calgary Zoo', scraper: scrapeCalgaryZoo },
    { name: 'Heritage Park', scraper: scrapeHeritagePark },
    { name: 'Spruce Meadows', scraper: scrapeSpruceMeadows },
    // Nightlife venues
    { name: 'Commonwealth Bar & Stage Nightlife', scraper: scrapeCommonwealthNightlife },
    { name: 'Broken City Nightlife', scraper: scrapeBrokenCityNightlife },
    { name: 'Cowboys Music Festival Nightlife', scraper: scrapeCowboysNightlife },
    { name: 'Dickens Pub Nightlife', scraper: scrapeDickensPubNightlife },
    { name: 'National on 10th Nightlife', scraper: scrapeNationalOn10thNightlife },
    { name: 'HiFi Club Nightlife', scraper: scrapeHiFiClubNightlife },
    { name: 'The Ship and Anchor Pub', scraper: scrapeShipAndAnchor },
    { name: 'Last Best Brewing & Distilling', scraper: scrapeLastBestBrewing }
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
    
    // DEDUPLICATION: Remove duplicate events (by title + date)
    const seenEvents = new Set();
    const dedupedEvents = [];
    let duplicateCount = 0;
    
    for (const event of allEvents) {
        const key = `${event.title?.toLowerCase()?.trim()}|${event.date?.toLowerCase()?.trim()}`;
        if (!seenEvents.has(key)) {
            seenEvents.add(key);
            dedupedEvents.push(event);
        } else {
            duplicateCount++;
        }
    }
    
    if (duplicateCount > 0) {
        console.log(`🧹 Removed ${duplicateCount} duplicate events`);
    }
    
    // DATE VALIDATION: Filter out events with unparseable dates ONLY
    // Keep ALL events with valid dates (past, present, future) - many are ongoing exhibitions/shows
    const validEvents = [];
    let skippedCount = 0;
    
    for (const event of dedupedEvents) {
        const dateStr = event.date || event.startDate;
        if (!dateStr) {
            skippedCount++;
            continue;
        }
        
        const normalizedDate = toISODate(dateStr);
        if (normalizedDate && normalizedDate !== '1970-01-01') {
            event.date = normalizedDate;
            validEvents.push(event);
        } else {
            skippedCount++;
        }
    }
    
    if (skippedCount > 0) {
        console.log(`✅ ${validEvents.length} valid events (skipped ${skippedCount} with bad dates)`);
    }
    
    return validEvents;
}

module.exports = scrapeCalgaryCityEvents;
