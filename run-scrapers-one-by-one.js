const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Directory containing the Vancouver scrapers
const scrapersDir = path.join(__dirname, 'scrapers/cities/vancouver');
const resultsDir = path.join(__dirname, 'scraper-results');

// Create results directory if it doesn't exist
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Get all .js files in the Vancouver scrapers directory
const scraperFiles = fs.readdirSync(scrapersDir)
  .filter(file => file.endsWith('.js') && !file.includes('fix_') && !file.includes('check_'));

// Summary log file
const summaryLogPath = path.join(resultsDir, 'summary.log');
fs.writeFileSync(summaryLogPath, `Vancouver Scrapers Test Run\nTimestamp: ${new Date().toISOString()}\n\n`);

// Function to run a single scraper and capture its output
async function runScraper(scraperFile) {
  const outputLogPath = path.join(resultsDir, `${path.basename(scraperFile, '.js')}.log`);
  const command = `node test-single-scraper.js ${scraperFile}`;
  
  console.log(`\n=================================================================`);
  console.log(`Running scraper: ${scraperFile}`);
  console.log(`=================================================================`);
  
  try {
    const { stdout, stderr } = await execPromise(command);
    
    // Write output to scraper-specific log file
    fs.writeFileSync(outputLogPath, stdout);
    
    if (stderr) {
      fs.appendFileSync(outputLogPath, `\nSTDERR:\n${stderr}`);
    }
    
    // Append summary to summary log
    const summary = `✅ ${scraperFile}: ${stdout.includes('events.') ? stdout.match(/Processed (\d+) events/)?.[1] || '0' : '0'} events\n`;
    fs.appendFileSync(summaryLogPath, summary);
    
    // Print to console
    console.log(stdout);
    
    return {
      file: scraperFile,
      success: true,
      events: stdout.includes('events.') ? parseInt(stdout.match(/Processed (\d+) events/)?.[1] || '0') : 0
    };
  } catch (error) {
    // Write error to scraper-specific log file
    fs.writeFileSync(outputLogPath, `ERROR: ${error.message}\n\n${error.stdout || ''}\n\n${error.stderr || ''}`);
    
    // Append error summary to summary log
    const summary = `❌ ${scraperFile}: ${error.message}\n`;
    fs.appendFileSync(summaryLogPath, summary);
    
    // Print to console
    console.error(`Error running ${scraperFile}: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    
    return {
      file: scraperFile,
      success: false,
      error: error.message
    };
  }
}

// Run each scraper one by one
async function runAllScrapers() {
  const results = {
    success: [],
    failed: []
  };
  
  for (let i = 0; i < scraperFiles.length; i++) {
    const file = scraperFiles[i];
    console.log(`\nRunning scraper ${i+1}/${scraperFiles.length}: ${file}`);
    
    const result = await runScraper(file);
    
    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }
    
    // Small delay between scrapers to avoid resource conflicts
    if (i < scraperFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Write final results summary
  const summaryOutput = `
========== FINAL SUMMARY ==========
Total scrapers: ${scraperFiles.length}
Successful: ${results.success.length}
Failed: ${results.failed.length}
Total events scraped: ${results.success.reduce((sum, r) => sum + r.events, 0)}

Successful scrapers:
${results.success.map(s => `- ${s.file}: ${s.events} events`).join('\n')}

Failed scrapers:
${results.failed.map(s => `- ${s.file}: ${s.error}`).join('\n')}
`;
  
  console.log(summaryOutput);
  fs.appendFileSync(summaryLogPath, summaryOutput);
  
  // Write JSON summary
  const jsonSummaryPath = path.join(resultsDir, 'summary.json');
  fs.writeFileSync(jsonSummaryPath, JSON.stringify(results, null, 2));
}

// Run the scrapers
runAllScrapers().catch(console.error);
