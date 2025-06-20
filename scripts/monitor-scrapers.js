/**
 * Venue Scrapers Monitor Utility
 * 
 * This script runs all venue scrapers periodically and logs their results.
 * It can be used to monitor scraper health over time without manual intervention.
 * Run with: node scripts/monitor-scrapers.js
 */
const fs = require('fs');
const path = require('path');
const { scrapeLogger } = require('../scrapers/utils/logger');

// Setup logger for monitoring
const monitorLogger = scrapeLogger.child({ component: 'monitor' });

// Get all venue scraper files
const venuePath = path.join(__dirname, '..', 'scrapers', 'venues');
const venueFiles = fs.readdirSync(venuePath)
  .filter(file => file.endsWith('.js'))
  .map(file => file.replace('.js', ''));

// Import all venue scrapers
const venueScrapers = venueFiles.map(file => {
  const scraper = require(`../scrapers/venues/${file}`);
  return {
    name: scraper.name || file,
    id: file,
    scrape: scraper.scrape,
    url: scraper.url || ''
  };
});

/**
 * Run a single scraper and log the results
 * @param {Object} scraper - Scraper to run
 * @returns {Promise<Object>} - Scraper results
 */
async function runScraper(scraper) {
  const logger = monitorLogger.child({ scraper: scraper.name });
  logger.info(`Testing scraper: ${scraper.name} (${scraper.id})`);
  
  const startTime = Date.now();
  let events = [];
  let success = false;
  let error = null;
  
  try {
    events = await scraper.scrape();
    success = true;
    
    logger.info({
      scraperId: scraper.id,
      scraperName: scraper.name,
      eventCount: events.length,
      duration: `${Date.now() - startTime}ms`
    }, `Found ${events.length} events`);
  } catch (err) {
    error = err.message;
    logger.error({
      error,
      scraperId: scraper.id,
      scraperName: scraper.name
    }, `Error running scraper: ${err.message}`);
  }
  
  return {
    id: scraper.id,
    name: scraper.name,
    url: scraper.url,
    success,
    eventCount: events.length,
    error,
    duration: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run all scrapers and generate a report
 */
async function runAllScrapers() {
  monitorLogger.info(`Starting venue scrapers monitoring run at ${new Date().toISOString()}`);
  
  const results = {};
  let totalEvents = 0;
  let successCount = 0;
  let failureCount = 0;
  
  for (const scraper of venueScrapers) {
    const result = await runScraper(scraper);
    results[scraper.id] = result;
    
    if (result.success) {
      totalEvents += result.eventCount;
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalScrapers: venueScrapers.length,
    successCount,
    failureCount,
    totalEvents,
    results
  };
  
  // Log summary report
  monitorLogger.info({
    totalScrapers: venueScrapers.length,
    successCount,
    failureCount,
    totalEvents
  }, `Completed monitoring run: ${successCount}/${venueScrapers.length} scrapers successful, ${totalEvents} total events`);
  
  // Save report to file
  const reportDir = path.join(__dirname, '..', 'logs', 'reports');
  try {
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `scraper-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    monitorLogger.info(`Report saved to ${reportFile}`);
  } catch (err) {
    monitorLogger.error({ error: err.message }, `Error saving report: ${err.message}`);
  }
  
  return report;
}

/**
 * Main monitor function
 * @param {Object} options - Monitor options
 * @param {number} options.interval - Interval in minutes between runs
 * @param {number} options.runs - Number of runs (0 for infinite)
 */
function startMonitor({ interval = 60, runs = 0 }) {
  let runCount = 0;
  
  monitorLogger.info(`Starting venue scrapers monitor with interval ${interval} minutes`);
  
  // Run immediately
  runAllScrapers().then(() => {
    runCount++;
    monitorLogger.info(`Completed run ${runCount}${runs > 0 ? `/${runs}` : ''}`);
  });
  
  // Schedule periodic runs
  const intervalId = setInterval(async () => {
    if (runs > 0 && runCount >= runs) {
      clearInterval(intervalId);
      monitorLogger.info(`Monitor completed after ${runs} runs`);
      return;
    }
    
    await runAllScrapers();
    runCount++;
    monitorLogger.info(`Completed run ${runCount}${runs > 0 ? `/${runs}` : ''}`);
  }, interval * 60 * 1000);
  
  // Handle termination
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    monitorLogger.info(`Monitor stopped after ${runCount} runs`);
    process.exit();
  });
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    interval: 60, // Default: 60 minutes
    runs: 0       // Default: infinite
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--interval' && i + 1 < args.length) {
      options.interval = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--runs' && i + 1 < args.length) {
      options.runs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: node monitor-scrapers.js [options]

Options:
  --interval <minutes>   Set interval between runs in minutes (default: 60)
  --runs <number>        Set number of runs (default: 0 = infinite)
  --help                 Show this help message
      `);
      process.exit(0);
    }
  }
  
  startMonitor(options);
}

module.exports = {
  runAllScrapers,
  startMonitor
};
