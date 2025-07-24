const fs = require('fs');
const path = require('path');

// Directory containing the scrapers
const scrapersDir = path.join(__dirname, 'scrapers/cities/vancouver');
const resultsDir = path.join(__dirname, 'test-output');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Log file for overall results
const logFile = path.join(resultsDir, 'vancouver-scrapers-log.txt');
fs.writeFileSync(logFile, `Vancouver Scrapers Test Run\nDate: ${new Date().toISOString()}\n\n`);

// Get all JS files in the Vancouver scrapers directory
const scraperFiles = fs.readdirSync(scrapersDir)
  .filter(file => file.endsWith('.js') && !file.startsWith('fix_') && !file.startsWith('check_'));

// Function to run a single scraper
async function runScraper(scraperFile) {
  const scraperPath = path.join(scrapersDir, scraperFile);
  let scraper;
  
  console.log(`\n------------------------------------------------------------`);
  console.log(`Testing: ${scraperFile}`);
  
  // Append to log file
  fs.appendFileSync(logFile, `\n------------------------------------------------------------\n`);
  fs.appendFileSync(logFile, `Testing: ${scraperFile}\n`);
  
  try {
    // Try to require the scraper
    scraper = require(scraperPath);
    
    if (typeof scraper.scrape !== 'function') {
      throw new Error('Scraper does not have a scrape method');
    }
    
    // Run the scraper
    console.log(`Running ${scraperFile}...`);
    fs.appendFileSync(logFile, `Running ${scraperFile}...\n`);
    
    const startTime = Date.now();
    let events = await scraper.scrape();
    const duration = Date.now() - startTime;
    
    // Ensure events is an array
    events = Array.isArray(events) ? events : [];
    
    // Log results
    const resultMessage = `✅ Scraper '${scraper.name || scraperFile}' finished successfully.\n   Processed ${events.length} events.\n   Duration: ${duration / 1000}s`;
    console.log(resultMessage);
    fs.appendFileSync(logFile, `${resultMessage}\n`);
    
    // Save the events to a file
    const outputFile = path.join(resultsDir, `${path.basename(scraperFile, '.js')}-results.json`);
    fs.writeFileSync(outputFile, JSON.stringify(events, null, 2));
    console.log(`Results saved to ${outputFile}`);
    
    if (events.length > 0) {
      console.log(`Sample event: ${JSON.stringify(events[0], null, 2)}`);
      fs.appendFileSync(logFile, `Sample event: ${JSON.stringify(events[0], null, 2)}\n`);
    }
    
    return { success: true, eventsCount: events.length };
  } catch (error) {
    const errorMessage = `❌ Error with scraper ${scraperFile}: ${error.message}`;
    console.error(errorMessage);
    if (error.stack) {
      console.error(error.stack);
    }
    fs.appendFileSync(logFile, `${errorMessage}\n${error.stack || ''}\n`);
    return { success: false, error: error.message };
  }
}

// Run scrapers with a delay between each to avoid overwhelming resources
async function runAllScrapers() {
  const results = {
    success: [],
    failed: []
  };
  
  // Track overall stats
  let totalScrapers = scraperFiles.length;
  let successCount = 0;
  let failCount = 0;
  let totalEvents = 0;
  
  console.log(`Found ${totalScrapers} scrapers to test.`);
  fs.appendFileSync(logFile, `Found ${totalScrapers} scrapers to test.\n`);
  
  for (let i = 0; i < scraperFiles.length; i++) {
    const file = scraperFiles[i];
    console.log(`\n[${i+1}/${totalScrapers}] Testing ${file}`);
    
    const result = await runScraper(file);
    
    if (result.success) {
      results.success.push({ file, eventsCount: result.eventsCount });
      successCount++;
      totalEvents += result.eventsCount;
    } else {
      results.failed.push({ file, error: result.error });
      failCount++;
    }
    
    // Add a small delay between scrapers to avoid resource conflicts
    if (i < scraperFiles.length - 1) {
      console.log('Waiting 5 seconds before next scraper...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Log summary
  const summaryMessage = `
========== SUMMARY ==========
Total scrapers tested: ${totalScrapers}
Successful: ${successCount}
Failed: ${failCount}
Total events scraped: ${totalEvents}

Successful scrapers:
${results.success.map(s => `- ${s.file} (${s.eventsCount} events)`).join('\n')}

Failed scrapers:
${results.failed.map(s => `- ${s.file}: ${s.error}`).join('\n')}
`;

  console.log(summaryMessage);
  fs.appendFileSync(logFile, summaryMessage);
  
  // Create summary JSON
  const summaryJson = path.join(resultsDir, 'vancouver-scrapers-summary.json');
  fs.writeFileSync(summaryJson, JSON.stringify(results, null, 2));
  console.log(`Summary saved to ${summaryJson}`);
}

// Run the scrapers
runAllScrapers().then(() => {
  console.log('All scrapers tested!');
}).catch(error => {
  console.error('Error running scrapers:', error);
});
