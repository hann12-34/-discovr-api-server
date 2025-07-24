/**
 * EXAMPLE: How to integrate city assignment enforcement into any scraper
 * 
 * This prevents undefined cities and ensures data integrity for ALL future scrapers
 */

const { enforceCityAssignment, validateEventCity } = require('./utils/city-assignment-enforcer');

// Example scraper function - this is how ALL scrapers should be structured
async function exampleScraperWithCityEnforcement() {
    console.log('🔧 Running scraper with city enforcement...');
    
    const events = []; // Your scraped events
    
    // Example scraped event (could have missing city)
    let scrapedEvent = {
        title: "POETRY PRESENTS: SOME EVENT",
        source: "Poetry Jazz Cafe",
        venue: "Poetry Jazz Cafe",
        // city: undefined  // This would normally cause problems!
        url: "https://www.poetryjazzcafe.com/event/123"
    };
    
    // 🚨 CRITICAL: Enforce city assignment using scraper file path
    const currentScraperPath = __filename; // Gets current scraper file path
    scrapedEvent = enforceCityAssignment(scrapedEvent, currentScraperPath);
    
    // 🚨 CRITICAL: Validate that city was assigned
    if (!validateEventCity(scrapedEvent)) {
        console.error(`❌ CRITICAL: Event "${scrapedEvent.title}" has no city! Skipping.`);
        return; // Don't add events without cities
    }
    
    console.log(`✅ Event "${scrapedEvent.title}" assigned to: ${scrapedEvent.city}`);
    events.push(scrapedEvent);
    
    return events;
}

// Example for existing scrapers - how to retrofit them
function retrofitExistingScraper() {
    console.log('🔧 RETROFITTING EXISTING SCRAPER FOR CITY ENFORCEMENT');
    
    // At the END of your existing scraper, add this:
    /*
    
    // 🚨 ADD THIS TO ALL EXISTING SCRAPERS:
    const { enforceCityAssignment, validateEventCity } = require('../../../utils/city-assignment-enforcer');
    
    // Process all events to enforce city assignment
    const processedEvents = [];
    for (const event of scrapedEvents) {
        // Enforce city based on scraper location
        const processedEvent = enforceCityAssignment(event, __filename);
        
        // Only keep events with valid cities
        if (validateEventCity(processedEvent)) {
            processedEvents.push(processedEvent);
        } else {
            console.warn(`⚠️ Skipping event without city: "${processedEvent.title}"`);
        }
    }
    
    return processedEvents; // Return processed events instead of raw scraped ones
    
    */
}

// How to add new known venues
function addNewKnownVenue() {
    const { addKnownVenue } = require('./utils/city-assignment-enforcer');
    
    // Example: Adding a new known venue
    addKnownVenue('Some New Venue Name', {
        city: 'Toronto',
        address: '123 Main St, Toronto, ON M1A 1A1',
        province: 'ON',
        country: 'Canada'
    });
    
    console.log('✅ Added new known venue for future city assignment');
}

module.exports = {
    exampleScraperWithCityEnforcement,
    retrofitExistingScraper,
    addNewKnownVenue
};

/*
🚨 IMPLEMENTATION GUIDE:

1. For NEW scrapers:
   - Import city enforcement at top: 
     const { enforceCityAssignment, validateEventCity } = require('../../../utils/city-assignment-enforcer');
   - Process each event: enforceCityAssignment(event, __filename)
   - Validate before adding: validateEventCity(event)

2. For EXISTING scrapers:
   - Add the import and processing at the END
   - Replace return with processed events

3. For KNOWN venues (like Poetry Jazz Cafe):
   - Add them to KNOWN_VENUES in city-assignment-enforcer.js
   - They'll automatically get correct city/address

4. For IMPORT scripts:
   - Also use enforceCityAssignment on all events before DB insert
   - This is the FINAL safety net

🎯 RESULT: 
- NO MORE undefined cities
- Automatic city assignment based on scraper folder
- Known venues get correct addresses
- Data integrity guaranteed!
*/
