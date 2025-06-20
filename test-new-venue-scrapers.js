/**
 * Test script for new venue scrapers in the /scrapers/venues/new directory
 * This script runs all scrapers in the new directory and logs the results
 */

const fs = require('fs');
const path = require('path');
const { scrapeLogger } = require('./scrapers/utils/logger');

const logger = scrapeLogger.child({ script: 'test-new-venue-scrapers' });

// Required fields for each event
const requiredFields = ['title', 'date', 'url', 'venue'];

/**
 * Load all scrapers from the new venues directory
 * @returns {Array} Array of scraper modules
 */
function loadNewVenueScrapers() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'venues', 'new');
  
  try {
    if (!fs.existsSync(scrapersDir)) {
      logger.error(`Directory doesn't exist: ${scrapersDir}`);
      return [];
    }
    
    const scraperFiles = fs.readdirSync(scrapersDir)
      .filter(file => file.endsWith('.js'));
      
    logger.info(`Found ${scraperFiles.length} scraper files in new venues directory`);
    
    const scrapers = scraperFiles.map(file => {
      try {
        const scraperPath = path.join(scrapersDir, file);
        const scraper = require(scraperPath);
        logger.info(`Loaded scraper: ${scraper.name || file}`);
        return scraper;
      } catch (error) {
        logger.error({ error: error.message }, `Failed to load scraper: ${file}`);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    return scrapers;
  } catch (error) {
    logger.error({ error: error.message }, 'Error loading scrapers');
    return [];
  }
}

/**
 * Validate an event object to ensure it has all required fields
 * @param {Object} event The event to validate
 * @returns {boolean} True if valid, false if missing required fields
 */
function validateEvent(event) {
  const missingFields = requiredFields.filter(field => !event[field]);
  
  if (missingFields.length > 0) {
    logger.warn({
      event: event.title || 'Unknown event',
      missingFields
    }, 'Event missing required fields');
    return false;
  }
  
  return true;
}

/**
 * Run a single scraper and log the results
 * @param {Object} scraper The scraper module to run
 * @returns {Promise<Object>} Results of the scraper run
 */
async function runScraper(scraper) {
  const startTime = Date.now();
  logger.info(`Running scraper: ${scraper.name}`);
  
  try {
    const events = await scraper.scrape();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Filter for valid events
    const validEvents = events.filter(validateEvent);
    
    const result = {
      name: scraper.name,
      url: scraper.url,
      eventCount: events.length,
      validEventCount: validEvents.length,
      duration: `${duration.toFixed(2)}s`,
      success: events.length > 0,
      hasInvalidEvents: events.length !== validEvents.length
    };
    
    logger.info({
      scraper: scraper.name,
      result
    }, `Scraper finished with ${validEvents.length} valid events (${events.length} total) in ${duration.toFixed(2)}s`);
    
    // Log sample event if available
    if (validEvents.length > 0) {
      logger.info({
        scraper: scraper.name,
        sampleEvent: validEvents[0]
      }, 'Sample event');
    }
    
    return result;
  } catch (error) {
    logger.error({
      scraper: scraper.name,
      error: error.message,
      stack: error.stack
    }, 'Error running scraper');
    
    return {
      name: scraper.name,
      url: scraper.url,
      eventCount: 0,
      validEventCount: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Run all new venue scrapers and log the summary
 */
async function runAllNewVenueScrapers() {
  const scrapers = loadNewVenueScrapers();
  
  if (scrapers.length === 0) {
    logger.error('No scrapers found to test');
    return;
  }
  
  logger.info(`Starting test run for ${scrapers.length} new venue scrapers`);
  
  const startTime = Date.now();
  
  // Run each scraper and collect results
  const results = [];
  for (const scraper of scrapers) {
    const result = await runScraper(scraper);
    results.push(result);
  }
  
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  // Generate summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const totalEvents = results.reduce((sum, r) => sum + r.validEventCount, 0);
  
  logger.info({
    totalScrapers: scrapers.length,
    successCount,
    failCount,
    totalEvents,
    duration: `${totalDuration.toFixed(2)}s`
  }, `Test run complete: ${successCount}/${scrapers.length} scrapers successful, ${totalEvents} valid events found`);
  
  // Log detailed results table
  console.log('\n===== NEW VENUE SCRAPERS TEST RESULTS =====');
  console.log('Name                        | Success | Events | Duration');
  console.log('----------------------------+---------+--------+----------');
  
  results.forEach(r => {
    const name = r.name.padEnd(26, ' ').substring(0, 26);
    const success = r.success ? 'YES' : 'NO ';
    const events = String(r.validEventCount).padStart(6, ' ');
    console.log(`${name} | ${success}    | ${events} | ${r.duration || 'ERROR'}`);
  });
  
  console.log('\n===== SUMMARY =====');
  console.log(`Total Scrapers: ${scrapers.length}`);
  console.log(`Successful: ${successCount} (${Math.round(successCount / scrapers.length * 100)}%)`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total Valid Events: ${totalEvents}`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log('=====================\n');
  
  // Check for any scrapers with no events
  const noEventScrapers = results.filter(r => r.success && r.validEventCount === 0);
  if (noEventScrapers.length > 0) {
    logger.warn(`${noEventScrapers.length} scrapers returned 0 events:`);
    noEventScrapers.forEach(s => {
      logger.warn(`- ${s.name} (${s.url})`);
    });
  }
  
  // Check for any scrapers with invalid events
  const invalidEventScrapers = results.filter(r => r.hasInvalidEvents);
  if (invalidEventScrapers.length > 0) {
    logger.warn(`${invalidEventScrapers.length} scrapers returned some invalid events:`);
    invalidEventScrapers.forEach(s => {
      logger.warn(`- ${s.name}: ${s.eventCount - s.validEventCount} invalid events`);
    });
  }
}

// Run the tests
runAllNewVenueScrapers().catch(error => {
  logger.error({ error: error.message }, 'Error running tests');
  process.exit(1);
});
