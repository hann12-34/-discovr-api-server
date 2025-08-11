/**
 * Clean New York Events Orchestrator
 * 
 * This orchestrator imports only confirmed working New York scrapers
 * that have passed syntax validation using the proven Toronto approach.
 * 
 * Total: 40 confirmed working New York scrapers
 */

// Confirmed working New York scrapers (syntax validated)
const confirmedWorkingScrapers = [
    'apollo-theater-fixed.js',
    'beacon-theatre-fixed.js',
    'broadway-theaters-fixed.js',
    'central-park-fixed.js',
    'irving-plaza-fixed.js',
    'lincoln-center-fixed.js',
    'mercury-lounge-fixed.js',
    'nyc-automotive-transportation-fixed.js',
    'nyc-beauty-fashion-fixed.js',
    'nyc-business-networking-fixed.js',
    'nyc-charity-fundraising-fixed.js',
    'nyc-com-events-fixed.js',
    'nyc-community-neighborhood-fixed.js',
    'nyc-culture-heritage-fixed.js',
    'nyc-dance-movement-fixed.js',
    'nyc-dating-singles-fixed.js',
    'nyc-education-learning-fixed.js',
    'nyc-film-cinema-fixed.js',
    'nyc-gaming-esports-fixed.js',
    'nyc-government-civic-fixed.js',
    'nyc-international-multicultural-fixed.js',
    'nyc-kids-family-fixed.js',
    'nyc-lgbtq-fixed.js',
    'nyc-luxury-lifestyle-fixed.js',
    'nyc-marathon-fixed.js',
    'nyc-media-entertainment-fixed.js',
    'nyc-museums-galleries-fixed.js',
    'nyc-photography-fixed.js',
    'nyc-professional-development-fixed.js',
    'nyc-real-estate-property-fixed.js',
    'nyc-science-technology-fixed.js',
    'nyc-seasonal-holiday-fixed.js',
    'nyc-shopping-retail-fixed.js',
    'nyc-spiritual-religious-fixed.js',
    'nyc-sports-recreation-fixed.js',
    'nyc-startups-entrepreneurship-fixed.js',
    'nyc-tours-experiences-fixed.js',
    'nyc-workshops-classes-fixed.js',
    'radio-city-music-hall-fixed.js',
    'village-vanguard-fixed.js'
];

// Import confirmed working scrapers
const scrapers = {};

confirmedWorkingScrapers.forEach(filename => {
    try {
        const scraperPath = `./${filename}`;
        const ScraperClass = require(scraperPath);
        
        // Create scraper instance 
        const scraperInstance = new ScraperClass();
        
        // Store scraper with clean name (remove -fixed.js suffix)
        const cleanName = filename.replace('-fixed.js', '').replace('.js', '');
        scrapers[cleanName] = scraperInstance;
        
        console.log(`✅ Loaded confirmed working scraper: ${cleanName}`);
    } catch (error) {
        console.log(`❌ Failed to load ${filename}: ${error.message}`);
    }
});

console.log(`\n🗽 New York Clean Orchestrator: ${Object.keys(scrapers).length}/${confirmedWorkingScrapers.length} confirmed working scrapers loaded\n`);

module.exports = scrapers;
