/**
 * Report Generator for Scraper Diagnostics
 * Creates JSON and HTML reports from scraper results
 */

const path = require('path');
const fs = require('fs');

/**
 * Create a JSON report from scraper results
 */
function createJsonReport(results, options = {}) {
  const { startTime, endTime } = options;
  
  // Count results by status
  const totalScrapers = results.length;
  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status === 'error').length;
  const emptyCount = results.filter(r => r.status === 'empty').length;
  
  // Calculate total events
  const totalEvents = results.reduce((sum, result) => {
    return sum + (Array.isArray(result.events) ? result.events.length : 0)
  }, 0);
  
  // Calculate average duration
  const avgDuration = results.reduce((sum, result) => sum + result.duration, 0) / results.length;
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalScrapers,
      successCount,
      failureCount,
      emptyCount,
      totalEvents,
      avgScraperDuration: avgDuration,
      totalDuration: endTime - startTime,
      successRate: (successCount / totalScrapers) * 100
    },
    results: results.map(result => {
      // Limit the event data to prevent huge reports
      const limitedEvents = Array.isArray(result.events) 
        ? result.events.slice(0, 5) // Only include up to 5 sample events
        : [];
      
      return {
        ...result,
        events: limitedEvents,
        eventCount: Array.isArray(result.events) ? result.events.length : 0
      };
    })
  };
}

/**
 * Create HTML report from JSON data
 */
function createHtmlReport(reportData) {
  const { timestamp, summary, results } = reportData;
  
  // Sort results by status (error first, then empty, then success)
  const sortedResults = [...results].sort((a, b) => {
    const statusOrder = { error: 0, empty: 1, success: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  // Generate HTML for each scraper result
  const scraperHtml = sortedResults.map((result, index) => {
    const statusClass = result.status === 'success' ? 'success' : 
      (result.status === 'empty' ? 'empty' : 'failure');
    
    // Generate event sample HTML
    const eventsHtml = Array.isArray(result.events) && result.events.length > 0 
      ? `<div class="mb-3">
          <h6>Sample Event:</h6>
          <pre>${JSON.stringify(result.events[0], null, 2)}</pre>
        </div>`
      : '';
    
    // Generate error HTML if applicable
    const errorHtml = result.error 
      ? `<div class="mb-3">
          <h6>Error:</h6>
          <pre class="text-danger">${result.error}</pre>
          ${result.stack ? `<pre class="text-muted small">${result.stack}</pre>` : ''}
        </div>`
      : '';
    
    // Generate fixing suggestions based on error type
    const fixSuggestionsHtml = result.status === 'error' || result.status === 'empty' 
      ? generateFixSuggestions(result)
      : '';
    
    return `
      <div class="card scraper-card ${statusClass}">
        <div class="card-header" id="heading${index}">
          <h5 class="mb-0 d-flex justify-content-between">
            <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
              ${result.name}
            </button>
            <div>
              <span class="badge bg-${statusClass === 'success' ? 'success' : (statusClass === 'empty' ? 'warning' : 'danger')}">
                ${result.status.toUpperCase()}
              </span>
              <span class="badge bg-secondary ms-2">
                ${result.eventCount} events
              </span>
              <span class="badge bg-info ms-2">
                ${result.duration}ms
              </span>
            </div>
          </h5>
        </div>
        <div id="collapse${index}" class="collapse" data-parent="#scraperAccordion">
          <div class="card-body">
            <div class="mb-3">
              <strong>URL:</strong> <a href="${result.url}" target="_blank">${result.url}</a>
            </div>
            <div class="mb-3">
              <strong>Duration:</strong> ${result.duration}ms
            </div>
            <div class="mb-3">
              <strong>Events Found:</strong> ${result.eventCount}
            </div>
            ${errorHtml}
            ${eventsHtml}
            ${fixSuggestionsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
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
            
            <div class="row">
                <div class="col-md-3">
                    <div class="card stats-card bg-primary text-white">
                        <div class="card-body">
                            <h5 class="card-title">Total Scrapers</h5>
                            <h2>${summary.totalScrapers}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stats-card bg-success text-white">
                        <div class="card-body">
                            <h5 class="card-title">Success</h5>
                            <h2>${summary.successCount} (${summary.successRate.toFixed(1)}%)</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stats-card bg-danger text-white">
                        <div class="card-body">
                            <h5 class="card-title">Failures</h5>
                            <h2>${summary.failureCount}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stats-card bg-warning text-dark">
                        <div class="card-body">
                            <h5 class="card-title">Empty Results</h5>
                            <h2>${summary.emptyCount}</h2>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card stats-card">
                        <div class="card-body">
                            <h5 class="card-title">Total Events Found</h5>
                            <h2>${summary.totalEvents}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card stats-card">
                        <div class="card-body">
                            <h5 class="card-title">Avg. Scraper Duration</h5>
                            <h2>${summary.avgScraperDuration.toFixed(0)}ms</h2>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3>Scraper Results</h3>
                        <div>
                            <a href="/" class="btn btn-outline-primary me-2">Home</a>
                            <a href="/scraper-tester.html" class="btn btn-outline-warning me-2">Scraper Tester</a>
                            <a href="/scraper-quickfix.html" class="btn btn-outline-success">Quick Fix Wizard</a>
                        </div>
                    </div>
                    <div class="accordion" id="scraperAccordion">
                        ${scraperHtml}
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `;
}

/**
 * Generate fix suggestions based on scraper result
 */
function generateFixSuggestions(result) {
  // No suggestions for successful scrapers
  if (result.status === 'success') return '';
  
  let suggestions = [];
  
  // Common issues and suggestions
  if (result.status === 'empty') {
    suggestions = [
      'The site might have changed its HTML structure. Check and update the CSS selectors.',
      'The site might require JavaScript to load content. Consider using Puppeteer instead of Cheerio.',
      'The site might be paginated. Make sure the scraper handles pagination correctly.',
      'Check if the scraper is accessing the correct URL.'
    ];
  } else if (result.status === 'error') {
    if (result.error) {
      const errorLower = result.error.toLowerCase();
      
      if (errorLower.includes('timeout')) {
        suggestions = [
          'Increase the scraper timeout.',
          'The site might be slow or blocking scraping requests.',
          'Consider adding delays between requests if scraping multiple pages.'
        ];
      } else if (errorLower.includes('404') || errorLower.includes('not found')) {
        suggestions = [
          'The URL is invalid or has changed. Update the scraper URL.',
          'The site might be temporarily down. Try again later.'
        ];
      } else if (errorLower.includes('captcha') || errorLower.includes('access denied') || errorLower.includes('403')) {
        suggestions = [
          'The site might be blocking scraping. Try adding a User-Agent header.',
          'Consider adding a delay between requests.',
          'Try using a proxy service if the site is aggressively blocking scrapers.'
        ];
      } else if (errorLower.includes('selector') || errorLower.includes('undefined') || errorLower.includes('null')) {
        suggestions = [
          'The site structure has changed. Update the CSS selectors.',
          'Check for nested elements or conditional rendering.',
          'Make sure error handling accounts for missing elements.'
        ];
      } else {
        suggestions = [
          'Check the error message for specific details.',
          'Review the scraper code for logical errors.',
          'Add more detailed error handling to pinpoint the issue.'
        ];
      }
    }
  }
  
  return suggestions.length > 0
    ? `<div class="fix-suggestions mb-3">
        <h6>Fix Suggestions:</h6>
        <ul>
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>`
    : '';
}

module.exports = {
  createJsonReport,
  createHtmlReport
};
