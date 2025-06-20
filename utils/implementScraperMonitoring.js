/**
 * Scraper Monitoring Implementation
 * 
 * This script demonstrates how to implement the monitoring system with venue scrapers.
 * It modifies the scraper exports to wrap them with monitoring functionality.
 * 
 * Last updated: June 16, 2025
 */

const path = require('path');
const fs = require('fs');
const { wrapScraper } = require('./scraperWrapper');

// Directory containing venue scrapers
const SCRAPERS_DIR = path.join(__dirname, '../scrapers/venues');

/**
 * Apply monitoring to all venue scrapers
 * This function demonstrates how to wrap all scrapers with monitoring
 */
function applyMonitoringToScrapers() {
  // Get all scraper files
  const scraperFiles = fs.readdirSync(SCRAPERS_DIR)
    .filter(file => file.endsWith('.js'));
  
  console.log(`Found ${scraperFiles.length} scrapers to monitor`);
  
  // Wrap each scraper with monitoring
  for (const file of scraperFiles) {
    try {
      const scraperPath = path.join(SCRAPERS_DIR, file);
      const scraper = require(scraperPath);
      
      if (scraper && typeof scraper.scrape === 'function') {
        const scraperName = scraper.name || path.basename(file, '.js');
        console.log(`Wrapping scraper: ${scraperName}`);
        
        // Replace the original scrape function with the wrapped one
        scraper.scrape = wrapScraper(scraper.scrape, scraperName);
        
        console.log(`Scraper ${scraperName} is now monitored`);
      }
    } catch (error) {
      console.error(`Error applying monitoring to scraper ${file}:`, error);
    }
  }
}

/**
 * Example usage with a single scraper
 * @param {Object} scraper - Scraper object
 */
function monitorSingleScraper(scraper) {
  if (!scraper || typeof scraper.scrape !== 'function') {
    throw new Error('Invalid scraper object');
  }
  
  const scraperName = scraper.name || 'UnknownVenue';
  console.log(`Adding monitoring to scraper: ${scraperName}`);
  
  // Store the original scrape function
  const originalScrape = scraper.scrape;
  
  // Replace with wrapped version
  scraper.scrape = wrapScraper(originalScrape, scraperName);
  
  return scraper;
}

// Example integration with main app
function integrationExample() {
  console.log('Integration example:');
  console.log(`
// In your main app.js or index.js:
const { applyMonitoringToScrapers } = require('./utils/implementScraperMonitoring');

// Apply monitoring to all scrapers at startup
applyMonitoringToScrapers();

// Then use scrapers normally - they'll have monitoring automatically
const foxCabaret = require('./scrapers/venues/foxCabaret');
foxCabaret.scrape().then(events => {
  // Events are already validated and monitored
  console.log(\`Found \${events.length} Fox Cabaret events\`);
});
`);
}

// Direct usage example
async function directUsageExample() {
  try {
    // Import a scraper
    const barNone = require('../scrapers/venues/barNone');
    
    // Wrap it with monitoring
    monitorSingleScraper(barNone);
    
    // Run it - monitoring happens automatically
    console.log('Running Bar None scraper with monitoring...');
    const events = await barNone.scrape();
    
    console.log(`Found ${events.length} Bar None events`);
    return events;
  } catch (error) {
    console.error('Error in direct usage example:', error);
    return [];
  }
}

// Automated setup
if (require.main === module) {
  console.log('Running scraper monitoring implementation...');
  applyMonitoringToScrapers();
  integrationExample();
  
  // Run direct usage example if requested
  if (process.argv.includes('--run-example')) {
    directUsageExample().then(events => {
      console.log(`Example complete, found ${events.length} events`);
    });
  }
}

module.exports = {
  applyMonitoringToScrapers,
  monitorSingleScraper,
  integrationExample
};
