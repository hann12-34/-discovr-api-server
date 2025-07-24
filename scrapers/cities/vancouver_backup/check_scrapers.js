const fs = require('fs');
const path = require('path');

const scraperDir = __dirname;
const results = [];
const errors = [];
const skipped = [];

// Exclusion patterns
const excludeFiles = [
  'run_all_scrapers.js', 
  'run_all_scrapers_with_output.js', 
  'check_scrapers.js',
  'verify-', 
  'index.js',
  'scraper_results.txt'
];

function shouldIncludeFile(fileName) {
  if (!fileName.endsWith('.js')) return false;
  
  for (const exclude of excludeFiles) {
    if (fileName.includes(exclude)) return false;
  }
  
  return true;
}

async function runScraper(file) {
  try {
    const scraperPath = path.join(scraperDir, file);
    const ScraperClass = require(scraperPath);
    
    // Skip if not a constructor function
    if (typeof ScraperClass !== 'function') {
      skipped.push({ file, reason: 'Not a function' });
      return;
    }
    
    // Try to instantiate the scraper
    try {
      const scraper = new ScraperClass({ debug: false, logEvents: false });
      
      if (typeof scraper.scrape !== 'function') {
        skipped.push({ file, reason: 'No scrape method' });
        return;
      }
      
      // Try to run the scrape method
      console.log(`Running ${file}...`);
      const events = await scraper.scrape();
      results.push({ file, eventCount: events ? events.length : 0 });
      console.log(`✅ ${file}: Found ${events ? events.length : 0} events`);
    } catch (error) {
      errors.push({ file, error: error.message });
      console.log(`❌ ${file}: ${error.message}`);
    }
  } catch (error) {
    skipped.push({ file, reason: 'Import failed: ' + error.message });
  }
}

async function main() {
  const files = fs.readdirSync(scraperDir)
    .filter(shouldIncludeFile)
    .sort();
  
  console.log(`Found ${files.length} potential scrapers to check`);
  
  // Run each scraper sequentially
  for (const file of files) {
    await runScraper(file);
  }
  
  // Print results
  console.log('\n===== RESULTS =====\n');
  
  console.log('SUCCESSFUL SCRAPERS:');
  results.sort((a, b) => b.eventCount - a.eventCount);
  for (const scraper of results) {
    console.log(`- ${scraper.file}: ${scraper.eventCount} events`);
  }
  
  console.log('\nSCRAPER ERRORS:');
  for (const scraper of errors) {
    console.log(`- ${scraper.file}: ${scraper.error}`);
  }
  
  console.log('\nSKIPPED FILES:');
  console.log(`- ${skipped.length} files skipped (not valid scraper classes)`);
  
  // Write to a results file as well
  const fullResults = {
    successful: results,
    errors,
    skipped,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(scraperDir, 'scraper_check_results.json'), 
    JSON.stringify(fullResults, null, 2)
  );
  
  console.log('\nComplete results written to scraper_check_results.json');
}

main().catch(console.error);
