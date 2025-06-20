#!/usr/bin/env node
/**
 * Scraper Monitoring Script
 * 
 * This script runs all venue scrapers and records their performance with the monitoring system.
 * It can be run on a schedule to regularly check for broken scrapers.
 * 
 * Usage:
 *   node monitorScrapers.js [--report-only]
 * 
 * Options:
 *   --report-only  Only generate a report without running scrapers
 * 
 * Last updated: June 16, 2025
 */

const fs = require('fs');
const path = require('path');
const { recordScraperRun, getScraperStats } = require('../utils/scraperMonitoring');

// Directory containing all venue scrapers
const SCRAPERS_DIR = path.join(__dirname, '../scrapers/venues');

// Output directory for reports
const REPORT_DIR = path.join(__dirname, '../logs/scraper-reports');

// Create report directory if it doesn't exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * Gets a list of all venue scrapers
 * @returns {Array} Array of scraper modules
 */
function getAllScrapers() {
  const scraperFiles = fs.readdirSync(SCRAPERS_DIR)
    .filter(file => file.endsWith('.js'));
  
  const scrapers = [];
  
  for (const file of scraperFiles) {
    try {
      const scraperPath = path.join(SCRAPERS_DIR, file);
      const scraper = require(scraperPath);
      
      if (scraper && typeof scraper.scrape === 'function') {
        scrapers.push({
          name: scraper.name || path.basename(file, '.js'),
          url: scraper.url || 'Unknown URL',
          scrape: scraper.scrape,
          filePath: scraperPath
        });
      }
    } catch (error) {
      console.error(`Error loading scraper ${file}:`, error);
    }
  }
  
  return scrapers;
}

/**
 * Runs a single scraper and records results
 * @param {Object} scraper - Scraper object with name and scrape function
 * @returns {Promise<Array>} - Events returned by the scraper
 */
async function runScraper(scraper) {
  console.log(`Running scraper: ${scraper.name}`);
  
  const startTime = Date.now();
  let events = [];
  let error = null;
  
  try {
    events = await scraper.scrape();
    console.log(`${scraper.name} found ${events.length} events`);
  } catch (e) {
    error = e;
    console.error(`${scraper.name} failed with error:`, e);
  } finally {
    const responseTime = Date.now() - startTime;
    await recordScraperRun(scraper.name, events.length, responseTime, error);
  }
  
  return events;
}

/**
 * Runs all scrapers
 * @returns {Promise<Object>} - Object with results
 */
async function runAllScrapers() {
  const scrapers = getAllScrapers();
  console.log(`Found ${scrapers.length} scrapers to run`);
  
  const results = {
    totalScrapers: scrapers.length,
    successCount: 0,
    failureCount: 0,
    zeroEventCount: 0,
    totalEvents: 0,
    scrapers: []
  };
  
  for (const scraper of scrapers) {
    try {
      const events = await runScraper(scraper);
      
      const result = {
        name: scraper.name,
        url: scraper.url,
        success: true,
        eventCount: events.length,
        error: null
      };
      
      results.totalEvents += events.length;
      
      if (events.length === 0) {
        result.warning = 'No events found';
        results.zeroEventCount++;
      } else {
        results.successCount++;
      }
      
      results.scrapers.push(result);
    } catch (error) {
      results.failureCount++;
      results.scrapers.push({
        name: scraper.name,
        url: scraper.url,
        success: false,
        eventCount: 0,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Generates an HTML report from scraper results
 * @param {Object} results - Scraper results
 * @returns {string} - HTML content
 */
function generateHtmlReport(results) {
  const stats = getScraperStats();
  const date = new Date().toLocaleString();
  
  // Sort scrapers - failing ones first
  const sortedScrapers = [...results.scrapers].sort((a, b) => {
    // First sort by success (failures first)
    if (a.success !== b.success) return a.success ? 1 : -1;
    // Then by event count (zero events before events with counts)
    if ((a.eventCount === 0) !== (b.eventCount === 0)) return a.eventCount === 0 ? -1 : 1;
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Scraper Monitoring Report - ${date}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 20px;
        color: #333;
      }
      h1, h2, h3 {
        color: #1a73e8;
      }
      .summary {
        background: #f8f9fa;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 20px;
      }
      .success {
        color: #0f9d58;
      }
      .warning {
        color: #f4b400;
      }
      .error {
        color: #d23f31;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
      }
      th, td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #ddd;
      }
      th {
        background-color: #f2f2f2;
      }
      tr:hover {
        background-color: #f5f5f5;
      }
      .scraper-row-error {
        background-color: #ffebee;
      }
      .scraper-row-warning {
        background-color: #fff8e1;
      }
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      }
      .badge-success {
        background-color: #0f9d58;
        color: white;
      }
      .badge-warning {
        background-color: #f4b400;
        color: white;
      }
      .badge-error {
        background-color: #d23f31;
        color: white;
      }
    </style>
  </head>
  <body>
    <h1>Scraper Monitoring Report</h1>
    <p>Generated on: ${date}</p>
    
    <div class="summary">
      <h2>Summary</h2>
      <p>
        <strong>Total Scrapers:</strong> ${results.totalScrapers}<br>
        <strong>Successful Scrapers:</strong> <span class="success">${results.successCount}</span><br>
        <strong>Zero-Event Scrapers:</strong> <span class="warning">${results.zeroEventCount}</span><br>
        <strong>Failed Scrapers:</strong> <span class="error">${results.failureCount}</span><br>
        <strong>Total Events Found:</strong> ${results.totalEvents}
      </p>
    </div>
    
    <h2>Scraper Details</h2>
    <table>
      <thead>
        <tr>
          <th>Scraper</th>
          <th>URL</th>
          <th>Status</th>
          <th>Events</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${sortedScrapers.map(scraper => {
          let statusClass = 'success';
          let statusBadge = 'SUCCESS';
          let rowClass = '';
          
          if (!scraper.success) {
            statusClass = 'error';
            statusBadge = 'ERROR';
            rowClass = 'scraper-row-error';
          } else if (scraper.eventCount === 0) {
            statusClass = 'warning';
            statusBadge = 'NO EVENTS';
            rowClass = 'scraper-row-warning';
          }
          
          return `
            <tr class="${rowClass}">
              <td><strong>${scraper.name}</strong></td>
              <td><a href="${scraper.url}" target="_blank">${scraper.url}</a></td>
              <td><span class="badge badge-${statusClass}">${statusBadge}</span></td>
              <td>${scraper.eventCount}</td>
              <td>${scraper.error ? `<span class="error">${scraper.error}</span>` : 
                    scraper.warning ? `<span class="warning">${scraper.warning}</span>` : 
                    '✓'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <h2>Historical Data</h2>
    <p>Coming soon: Charts and trends for scraper performance over time.</p>
    
    <hr>
    <p><em>This is an automated report generated by the Discovr API Scraper Monitoring System.</em></p>
  </body>
  </html>
  `;
}

/**
 * Saves an HTML report to disk
 * @param {string} html - HTML content
 * @returns {string} - Path to saved report
 */
function saveReport(html) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `scraper-report-${timestamp}.html`);
  fs.writeFileSync(reportPath, html);
  console.log(`Report saved to: ${reportPath}`);
  
  // Also save as latest report
  const latestPath = path.join(REPORT_DIR, 'latest-report.html');
  fs.writeFileSync(latestPath, html);
  
  return reportPath;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const reportOnly = args.includes('--report-only');
  
  let results;
  
  if (reportOnly) {
    console.log('Report-only mode: Skipping scraper runs');
    results = {
      totalScrapers: 0,
      successCount: 0,
      failureCount: 0,
      zeroEventCount: 0,
      totalEvents: 0,
      scrapers: []
    };
    
    // Get stats from monitoring system
    const stats = getScraperStats();
    
    // Fill in scrapers based on statistics
    for (const scraper of stats.healthyScrapers) {
      results.scrapers.push({
        name: scraper.name,
        url: 'Unknown URL',
        success: true,
        eventCount: scraper.eventCount,
        error: null
      });
      
      results.totalScrapers++;
      results.successCount++;
      results.totalEvents += scraper.eventCount;
    }
    
    for (const scraper of stats.failingScrapers) {
      results.scrapers.push({
        name: scraper.name,
        url: 'Unknown URL',
        success: false,
        eventCount: 0,
        error: `Failed ${scraper.failureCount} times`
      });
      
      results.totalScrapers++;
      results.failureCount++;
    }
  } else {
    // Run all scrapers
    results = await runAllScrapers();
  }
  
  // Generate and save report
  const html = generateHtmlReport(results);
  const reportPath = saveReport(html);
  
  console.log(`
Scraper monitoring complete:
- Total scrapers: ${results.totalScrapers}
- Successful: ${results.successCount}
- Zero events: ${results.zeroEventCount}
- Failed: ${results.failureCount}
- Total events: ${results.totalEvents}

HTML report saved at: ${reportPath}
  `);
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('Error in main process:', error);
    process.exit(1);
  });
}

module.exports = { 
  runAllScrapers,
  generateHtmlReport,
  saveReport
};
