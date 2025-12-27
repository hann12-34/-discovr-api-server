/**
 * Calgary City Event Scrapers Coordinator
 * Manages all working Calgary venue scrapers
 */

const { toISODate } = require('../../utils/dateNormalizer');
const axios = require('axios');
const cheerio = require('cheerio');

// BLACKLIST: Generic logos/placeholders that are NOT event-specific images
const genericImagePatterns = [
    /logo/i, /placeholder/i, /favicon/i, /icon/i,
    /default\.(jpg|png|gif|webp)/i,  // Only block default.jpg etc, not /sites/default/ paths
    /RN_LOGO/i, /HIT_LOGO/i, /WR_LOGO/i, /FL_LOGO/i,
    /roughneck/i, /doughneck/i, /saddledome/i,
    /scotiabanksaddledome\.com/i  // Block ALL images from saddledome - they're all team logos
];

// Helper function to fetch image from event URL (og:image only, NO FALLBACKS)
async function fetchEventImage(url) {
    if (!url || !url.startsWith('http')) return null;
    
    // Skip generic listing pages - these return venue images, not event images
    const listingPatterns = [/\/events\/?$/i, /\/calendar\/?$/i, /\/shows\/?$/i, /\/whats-on\/?$/i, /\/schedule\/?$/i];
    if (listingPatterns.some(p => p.test(url))) return null;
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);
        const ogImage = $('meta[property="og:image"]').attr('content');
        
        // Check if image is a generic logo/placeholder - if so, return null (NO FALLBACK)
        if (ogImage && genericImagePatterns.some(pattern => pattern.test(ogImage))) {
            return null; // Block generic logos
        }
        
        return ogImage || null;
    } catch (e) {
        return null;
    }
}

// All working Calgary scrapers (13 total)
const scrapeJubileeAuditorium = require('./scrape-jubilee-v2');
const scrapeCalgaryZoo = require('./scrape-calgary-zoo');
const scrapeHeritagePark = require('./scrape-heritage-park');
const scrapePalaceTheatreEvents = require('./scrape-palace-theatre-nightlife');
// const scrapeSpruceMeadows = require('./scrape-spruce-meadows-events'); // Removed by user
const scrapeGreyEagle = require('./scrape-grey-eagle-resort-events');
const scrapeCommonwealthNightlife = require('./scrape-commonwealth-puppeteer');
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
const scrapeCalgaryPhilharmonic = require('./scrape-calgary-philharmonic');
const scrapeCalgaryDowntown = require('./scrape-calgary-downtown');
const scrapeDecidedlyJazz = require('./scrape-decidedly-jazz');
const scrapeBeakerhead = require('./scrape-beakerhead');
const scrapeTheGrandYYC = require('./scrape-the-grand-yyc');
const scrapeLougheedHouse = require('./scrape-lougheed-house-v2');
const scrapeCalgaryFringe = require('./scrape-calgary-fringe');
const scrapeYYCBeer = require('./scrape-yyc-beer');
const scrapeTheatreJunction = require('./scrape-theatre-junction');
const scrapeCalgaryLibrary = require('./scrape-calgary-library');

const scrapers = [
    // Major event venues
    { name: 'Saddledome', scraper: scrapeSaddledome },
    { name: 'Arts Commons', scraper: scrapeArtsCommons },
    { name: 'National Music Centre', scraper: scrapeNationalMusicCentre },
    { name: 'Jubilee Auditorium', scraper: scrapeJubileeAuditorium }, // V2 with images
    { name: 'Calgary Philharmonic', scraper: scrapeCalgaryPhilharmonic }, // Has images
    { name: 'Calgary Downtown', scraper: scrapeCalgaryDowntown }, // Has images
    { name: 'Decidedly Jazz', scraper: scrapeDecidedlyJazz }, // Has images
    { name: 'Beakerhead', scraper: scrapeBeakerhead }, // Has images
    { name: 'The Grand YYC', scraper: scrapeTheGrandYYC }, // Has images
    { name: 'Lougheed House', scraper: scrapeLougheedHouse }, // Has images
    { name: 'Calgary Fringe', scraper: scrapeCalgaryFringe }, // Has images
    { name: 'YYC Beer', scraper: scrapeYYCBeer }, // Has images
    { name: 'Theatre Junction', scraper: scrapeTheatreJunction }, // Has images
    { name: 'Calgary Library', scraper: scrapeCalgaryLibrary }, // Has images
    { name: 'Palace Theatre', scraper: scrapePalaceTheatreEvents },
    { name: 'Grey Eagle Resort', scraper: scrapeGreyEagle },
    // Attractions
    { name: 'Calgary Zoo', scraper: scrapeCalgaryZoo },
    { name: 'Heritage Park', scraper: scrapeHeritagePark },
    // Spruce Meadows removed by user
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
                // Process images - fetch if missing, FILTER OUT generic logos
                for (const event of events) {
                    // If event already has image, check if it's a generic logo
                    if (event.image && genericImagePatterns.some(p => p.test(event.image))) {
                        event.image = null; // Remove generic logo
                        event.imageUrl = null;
                    }
                    if (event.imageUrl && genericImagePatterns.some(p => p.test(event.imageUrl))) {
                        event.image = null;
                        event.imageUrl = null;
                    }
                    
                    // Fetch og:image if missing (will also be filtered by blacklist)
                    if (!event.image && !event.imageUrl && event.url) {
                        event.image = await fetchEventImage(event.url);
                    }
                }
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
    
    // Bad venue/title patterns to filter out
    const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i];
    const badTitlePatterns = [
        /^funded by/i, /^government of/i, /^sponsored by/i,
        /^advertisement/i, /^subscribe/i, /^newsletter/i,
        /^par le/i, /^le gouvernement/i  // French junk
    ];
    const badAddressPatterns = [/^TBA$/i, /^various/i, /^calgary,?\s*ab$/i];
    
    // DATE VALIDATION + VENUE/ADDRESS VALIDATION
    const validEvents = [];
    let skippedCount = 0;
    
    for (const event of dedupedEvents) {
        // Skip bad titles
        if (badTitlePatterns.some(p => p.test(event.title || ''))) {
            skippedCount++;
            continue;
        }
        
        // Skip bad venue names
        const venueName = event.venue?.name || '';
        if (badVenuePatterns.some(p => p.test(venueName))) {
            skippedCount++;
            continue;
        }
        
        // Skip bad addresses
        const venueAddress = event.venue?.address || '';
        if (badAddressPatterns.some(p => p.test(venueAddress))) {
            skippedCount++;
            continue;
        }
        
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
    
    console.log(`✅ ${validEvents.length} valid events (skipped ${skippedCount} bad events)`);
    
    return validEvents;
}

// Export as object with scrape method for compatibility with cities/index.js
module.exports = {
    scrape: scrapeCalgaryCityEvents
};
