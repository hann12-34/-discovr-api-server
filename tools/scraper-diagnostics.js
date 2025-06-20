/**
 * Scraper Diagnostic Tool
 * 
 * This script runs each scraper individually and provides detailed debugging information
 * to help identify and fix broken scrapers.
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { performance } = require('perf_hooks');

// Import the scraper manager
const scraperManager = require('../scrapers/scraperManager');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Run a single scraper with detailed error reporting
 * @param {Object} scraper - The scraper to run
 * @returns {Promise<Object>} - Result of running the scraper
 */
async function testScraper(scraper) {
  console.log(`\n${colors.cyan}======= Testing ${colors.magenta}${scraper.name}${colors.cyan} =======`);
  console.log(`URL: ${colors.yellow}${scraper.url}${colors.reset}`);
  
  // Check if the URL is accessible
  let urlAccessible = false;
  try {
    const urlCheckResponse = await axios.get(scraper.url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    urlAccessible = urlCheckResponse.status === 200;
    console.log(`URL Accessible: ${urlAccessible ? colors.green + 'Yes' : colors.red + 'No'} (Status: ${urlCheckResponse.status})${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}URL Error: ${error.message}${colors.reset}`);
  }
  
  // Measure the scraper performance
  const startTime = performance.now();
  let events = [];
  let success = false;
  let errorDetails = null;
  
  try {
    events = await Promise.race([
      scraper.scrape(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 60 seconds')), 60000))
    ]);
    
    success = true;
    console.log(`${colors.green}Scraper executed successfully${colors.reset}`);
    
    if (!events || !Array.isArray(events)) {
      console.log(`${colors.yellow}Warning: Scraper did not return an array${colors.reset}`);
      events = [];
    }
  } catch (error) {
    success = false;
    errorDetails = {
      message: error.message,
      stack: error.stack
    };
    
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.log(`${colors.red}Stack: ${error.stack}${colors.reset}`);
  }
  
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000; // Convert to seconds
  
  console.log(`Duration: ${colors.cyan}${duration.toFixed(2)} seconds${colors.reset}`);
  console.log(`Events found: ${colors.cyan}${events.length}${colors.reset}`);
  
  if (events.length > 0) {
    // Display sample event
    console.log(`\n${colors.green}Sample event:${colors.reset}`);
    const sampleEvent = events[0];
    console.log(JSON.stringify(sampleEvent, null, 2));
  }
  
  return {
    name: scraper.name,
    url: scraper.url,
    success,
    urlAccessible,
    eventsCount: events.length,
    duration,
    error: errorDetails,
    events: events,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run all scrapers and generate a report
 */
async function runAllScrapers() {
  console.log(`${colors.magenta}===== SCRAPER DIAGNOSTICS TOOL =====\n${colors.reset}`);
  console.log(`Total scrapers loaded: ${colors.yellow}${scraperManager.scrapers.length}${colors.reset}`);
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  let emptyResultsCount = 0;
  
  // Create results directory if it doesn't exist
  const resultsDir = path.join(__dirname, '../diagnostics');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }
  
  // Process scrapers in sequence to avoid overwhelming the system
  for (const scraper of scraperManager.scrapers) {
    try {
      const result = await testScraper(scraper);
      results.push(result);
      
      if (result.success) {
        successCount++;
        if (result.eventsCount === 0) {
          emptyResultsCount++;
        }
      } else {
        failureCount++;
      }
    } catch (error) {
      console.log(`${colors.red}Critical error testing scraper ${scraper.name}: ${error.message}${colors.reset}`);
      results.push({
        name: scraper.name,
        url: scraper.url,
        success: false,
        urlAccessible: false,
        eventsCount: 0,
        duration: 0,
        error: {
          message: error.message,
          stack: error.stack
        },
        events: [],
        timestamp: new Date().toISOString()
      });
      failureCount++;
    }
  }
  
  // Generate summary
  console.log(`\n${colors.magenta}===== DIAGNOSTICS SUMMARY =====\n${colors.reset}`);
  console.log(`Total scrapers tested: ${colors.yellow}${results.length}${colors.reset}`);
  console.log(`Successful scrapers: ${colors.green}${successCount}${colors.reset}`);
  console.log(`Failed scrapers: ${colors.red}${failureCount}${colors.reset}`);
  console.log(`Scrapers with 0 events: ${colors.yellow}${emptyResultsCount}${colors.reset}`);
  
  // Generate success rate
  const successRate = (successCount / results.length) * 100;
  console.log(`Success rate: ${colors.cyan}${successRate.toFixed(1)}%${colors.reset}`);
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsFile = path.join(resultsDir, `scraper-results-${timestamp}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(`\nResults saved to: ${colors.yellow}${resultsFile}${colors.reset}`);
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(results);
  const htmlFile = path.join(resultsDir, `scraper-report-${timestamp}.html`);
  fs.writeFileSync(htmlFile, htmlReport);
  
  console.log(`HTML report saved to: ${colors.yellow}${htmlFile}${colors.reset}`);
  console.log(`\nYou can open the HTML report in a browser to see detailed results.`);
  
  // Copy the HTML report to the public directory for easy access
  const publicReportFile = path.join(__dirname, '../public/scraper-diagnostics.html');
  fs.writeFileSync(publicReportFile, htmlReport);
  console.log(`HTML report also available at: ${colors.green}http://localhost:3000/scraper-diagnostics.html${colors.reset}`);
}

/**
 * Generate HTML report from scraper results
 * @param {Array} results - Results from running scrapers
 * @returns {string} HTML report
 */
function generateHtmlReport(results) {
  // Calculate statistics
  const totalScrapers = results.length;
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const emptyResultsCount = results.filter(r => r.success && r.eventsCount === 0).length;
  const successRate = (successCount / totalScrapers) * 100;
  
  const timestamp = new Date().toISOString();
  
  // Sort results by success status, then by name
  results.sort((a, b) => {
    if (a.success !== b.success) {
      return a.success ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  // Generate HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scraper Diagnostics Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding: 20px; }
        .header { margin-bottom: 30px; }
        .stats-card { margin-bottom: 20px; }
        .scraper-card { margin-bottom: 15px; }
        .scraper-card.success { border-left: 5px solid #198754; }
        .scraper-card.failure { border-left: 5px solid #dc3545; }
        .scraper-card.empty { border-left: 5px solid #ffc107; }
        pre { white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
        .fix-suggestions { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row header">
            <div class="col-12">
                <h1>Scraper Diagnostics Report</h1>
                <p class="text-muted">Generated on ${timestamp}</p>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-white bg-primary stats-card">
                    <div class="card-body">
                        <h5 class="card-title">Total Scrapers</h5>
                        <h2>${totalScrapers}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-success stats-card">
                    <div class="card-body">
                        <h5 class="card-title">Success Rate</h5>
                        <h2>${successRate.toFixed(1)}%</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-danger stats-card">
                    <div class="card-body">
                        <h5 class="card-title">Failed Scrapers</h5>
                        <h2>${failureCount}</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-warning stats-card">
                    <div class="card-body">
                        <h5 class="card-title">Empty Results</h5>
                        <h2>${emptyResultsCount}</h2>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Common Issues & Solutions</h4>
                    </div>
                    <div class="card-body fix-suggestions">
                        <h5>URL Accessibility Issues</h5>
                        <p>If a scraper's URL is not accessible, check if:</p>
                        <ul>
                            <li>The website is still active</li>
                            <li>The URL has changed</li>
                            <li>The site blocks automated requests (consider adding headers)</li>
                        </ul>

                        <h5>Scraper Errors</h5>
                        <p>Common causes of scraper failures:</p>
                        <ul>
                            <li>HTML structure changes on the target website</li>
                            <li>Missing error handling for null/undefined values</li>
                            <li>Selectors no longer match the website structure</li>
                            <li>Timeout issues for slow-loading sites</li>
                        </ul>

                        <h5>Empty Results</h5>
                        <p>If a scraper runs but returns no events:</p>
                        <ul>
                            <li>The site might genuinely have no events</li>
                            <li>The scraper might be looking at the wrong page section</li>
                            <li>The date parsing might be failing</li>
                            <li>The scraper might need updated selectors</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <h3>Scraper Results</h3>
                <div class="accordion" id="scraperAccordion">
                    ${results.map((result, index) => {
                      let statusClass = result.success ? 'success' : 'failure';
                      if (result.success && result.eventsCount === 0) {
                        statusClass = 'empty';
                      }
                      
                      let statusBadge = result.success 
                        ? `<span class="badge bg-success">Success</span>` 
                        : `<span class="badge bg-danger">Failed</span>`;
                      
                      if (result.success && result.eventsCount === 0) {
                        statusBadge += ` <span class="badge bg-warning">No Events</span>`;
                      }
                      
                      if (!result.urlAccessible) {
                        statusBadge += ` <span class="badge bg-danger">URL Inaccessible</span>`;
                      }
                      
                      return `
                        <div class="card scraper-card ${statusClass}">
                            <div class="card-header" id="heading${index}">
                                <h5 class="mb-0 d-flex justify-content-between">
                                    <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                                        ${result.name}
                                    </button>
                                    <div>${statusBadge} <span class="badge bg-info">${result.eventsCount} events</span></div>
                                </h5>
                            </div>
                            <div id="collapse${index}" class="collapse" data-bs-parent="#scraperAccordion">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>URL:</strong> <a href="${result.url}" target="_blank">${result.url}</a></p>
                                            <p><strong>Duration:</strong> ${result.duration.toFixed(2)} seconds</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>Status:</strong> ${result.success ? 'Success' : 'Failed'}</p>
                                            <p><strong>Events:</strong> ${result.eventsCount}</p>
                                        </div>
                                    </div>
                                    
                                    ${result.error ? `
                                    <div class="mt-3">
                                        <h6>Error Details</h6>
                                        <div class="alert alert-danger">
                                            <p><strong>Message:</strong> ${result.error.message}</p>
                                            <pre>${result.error.stack}</pre>
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    ${result.events && result.events.length > 0 ? `
                                    <div class="mt-3">
                                        <h6>Sample Event</h6>
                                        <pre>${JSON.stringify(result.events[0], null, 2)}</pre>
                                    </div>
                                    ` : ''}
                                    
                                    ${!result.success ? `
                                    <div class="mt-3 fix-suggestions">
                                        <h6>Suggested Fixes</h6>
                                        <ul>
                                            <li>Check if URL is still valid and accessible</li>
                                            <li>Review the HTML structure of the target website</li>
                                            <li>Update selectors to match current page structure</li>
                                            <li>Add more comprehensive error handling</li>
                                        </ul>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                      `;
                    }).join('')}
                </div>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
  `;
}

// Run the script
runAllScrapers().catch(error => {
  console.error('Fatal error:', error);
});
