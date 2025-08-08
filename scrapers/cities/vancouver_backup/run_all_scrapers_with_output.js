const { getCityFromArgs } = require('../../utils/city-util.js');
const fs = require('fs');
const path = require('path');
const util = require('util');

const vancouverScrapersDir = __dirname;
const outputFile = path.join(__dirname, 'scraper_results.txt');

// List of files to exclude from running
const excludeFiles = [
  'run_all_scrapers.js',
  'run_all_scrapers_with_output.js',
  'index.js',
  'scraper_results.txt',
];

const scraperPrefixesToExclude = ['import-', 'test-', 'run-'];

// Redirect console output to a file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const logStream = fs.createWriteStream(outputFile, { flags: 'w' });

function logToFileAndConsole(...args) {
  const formatted = util.format(...args);
  logStream.write(formatted + '\n');
  originalConsoleLog(...args);
}

function errorToFileAndConsole(...args) {
  const formatted = util.format(...args);
  logStream.write('ERROR: ' + formatted + '\n');
  originalConsoleError(...args);
}

async function runAllScrapers() {
  console.log = logToFileAndConsole;
  console.error = errorToFileAndConsole;

  logToFileAndConsole('Starting to run all Vancouver scrapers...');
  const files = fs.readdirSync(vancouverScrapersDir);

  const scraperFiles = files.filter(file => {
    const isJsFile = file.endsWith('.js');
    const isExcluded = excludeFiles.includes(file);
    const hasExcludedPrefix = scraperPrefixesToExclude.some(prefix => file.startsWith(prefix));
    const isDirectory = fs.statSync(path.join(vancouverScrapersDir, file)).isDirectory();

    return isJsFile && !isExcluded && !hasExcludedPrefix && !isDirectory;
  });

  logToFileAndConsole(`Found ${scraperFiles.length} scrapers to run.`);

  // Create a summary section at the start of the file
  logToFileAndConsole('\n\n===== SCRAPERS SUMMARY =====\n');
  
  // Track results for summary
  const results = {
    successful: [],
    errors: [],
    skipped: []
  };

  for (const file of scraperFiles) {
    const scraperPath = path.join(vancouverScrapersDir, file);
    try {
      const ScraperClass = require(scraperPath);
      
      // Check if it's a class
      if (typeof ScraperClass !== 'function' || !/^[A-Z]/.test(ScraperClass.name)) {
        logToFileAndConsole(`- Skipping ${file} (not a valid scraper class).`);
        results.skipped.push({ file, reason: 'Not a valid scraper class' });
        continue;
      }

      logToFileAndConsole(`\n\n===== RUNNING SCRAPER: ${file} =====\n`);
      const scraper = new ScraperClass({ debug: false, logEvents: true });

      if (typeof scraper.scrape !== 'function') {
        logToFileAndConsole(`- ${file} does not have a 'scrape' method. Skipping.`);
        results.skipped.push({ file, reason: 'No scrape method' });
        continue;
      }

      const events = await scraper.scrape();
      logToFileAndConsole(`\n===== RESULT: ${file}: Found ${events.length} events =====`);
      results.successful.push({ file, eventCount: events.length });

    } catch (error) {
      logToFileAndConsole(`\n===== ERROR running scraper ${file}: ${error.message} =====\n`);
      results.errors.push({ file, error: error.message });
    }
    logToFileAndConsole('\n' + '='.repeat(80) + '\n');
  }

  // Write summary section
  logToFileAndConsole('\n\n===== FINAL SUMMARY =====\n');
  
  logToFileAndConsole('Successful scrapers:');
  results.successful.sort((a, b) => b.eventCount - a.eventCount);
  for (const scraper of results.successful) {
    logToFileAndConsole(`- ${scraper.file}: ${scraper.eventCount} events`);
  }
  
  logToFileAndConsole('\nScrapers with errors:');
  for (const scraper of results.errors) {
    logToFileAndConsole(`- ${scraper.file}: ${scraper.error}`);
  }
  
  logToFileAndConsole('\nSkipped scrapers:');
  for (const scraper of results.skipped) {
    logToFileAndConsole(`- ${scraper.file}: ${scraper.reason}`);
  }

  logToFileAndConsole('\nAll scrapers have been run.');
  
  // Restore original console functions
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

runAllScrapers().then(() => {
  logStream.end();
  console.log(`\nFull output saved to: ${outputFile}`);
  console.log('Use "cat scraper_results.txt" to view the complete output.');
});
