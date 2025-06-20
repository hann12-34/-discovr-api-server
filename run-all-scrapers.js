/**
 * Main script to run all registered scrapers and save events to database
 */
const scraperSystem = require('./scrapers');

async function runAllScrapers() {
  try {
    console.log("Starting Discovr API scraper system...");
    console.log(`Running ${scraperSystem.scrapers.length} registered scrapers`);
    
    // Run all scrapers and save events to database
    const results = await scraperSystem.runAll(true);
    
    // Print results
    console.log("\nScraping Results:");
    console.log("=====================================");
    
    let totalEvents = 0;
    let successfulScrapers = 0;
    let failedScrapers = 0;
    
    for (const scraperName in results) {
      const result = results[scraperName];
      if (result.success) {
        console.log(`✅ ${scraperName}: ${result.count} events`);
        totalEvents += result.count;
        successfulScrapers++;
      } else {
        console.log(`❌ ${scraperName}: Failed - ${result.error}`);
        failedScrapers++;
      }
    }
    
    console.log("\nSummary:");
    console.log(`- Total scrapers run: ${successfulScrapers + failedScrapers}`);
    console.log(`- Successful: ${successfulScrapers}`);
    console.log(`- Failed: ${failedScrapers}`);
    console.log(`- Total events scraped: ${totalEvents}`);
    
  } catch (error) {
    console.error("Error running scrapers:", error);
  }
}

// Run all scrapers
runAllScrapers();
