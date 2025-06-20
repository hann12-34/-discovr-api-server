/**
 * Scheduled Scraper Diagnostics Job
 * Runs all scrapers and generates a diagnostic report
 * Can be scheduled via cron job to run periodically
 */

const path = require('path');
const fs = require('fs');
const { createHtmlReport, createJsonReport } = require('./report-generator');
const scraperManager = require('../scrapers/scraperManager');
const { getFormattedDate } = require('../utils/dateUtils');
const emailService = require('../services/emailService');
const config = require('../config');

// Define threshold constants for alerts
const ALERT_THRESHOLD_FAILURE_PERCENT = 20; // Alert if more than 20% of scrapers fail
const ALERT_THRESHOLD_ZERO_EVENTS = 30; // Alert if more than 30% of scrapers return zero events
const ALERT_THRESHOLD_SPECIFIC_SCRAPERS = ['Celebrities Nightclub', 'Commodore Ballroom']; // Always alert on these scrapers

class DiagnosticJob {
  constructor(options = {}) {
    this.options = {
      generateReport: options.generateReport !== false,
      saveResults: options.saveResults !== false,
      sendNotifications: options.sendNotifications !== false,
      runSpecificScrapers: options.runSpecificScrapers || null,
      diagnosticDir: options.diagnosticDir || path.join(__dirname, '..', 'diagnostics'),
      publicDir: options.publicDir || path.join(__dirname, '..', 'public'),
      timeout: options.timeout || 45000, // Default 45s timeout per scraper
      batchSize: options.batchSize || 3, // Run scrapers in batches to avoid overloading server
    };
    
    // Ensure directories exist
    if (!fs.existsSync(this.options.diagnosticDir)) {
      fs.mkdirSync(this.options.diagnosticDir, { recursive: true });
    }
    
    // Init scraper list
    this.scrapers = scraperManager.scrapers;
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run all scrapers and collect results
   */
  async runAllScrapers() {
    console.log(`Starting scheduled diagnostic job at ${new Date().toISOString()}`);
    console.log(`Total scrapers to run: ${this.scrapers.length}`);
    this.startTime = Date.now();
    
    // Filter scrapers if specific ones requested
    let scrapersToRun = this.scrapers;
    if (this.options.runSpecificScrapers && this.options.runSpecificScrapers.length > 0) {
      scrapersToRun = this.scrapers.filter(scraper => 
        this.options.runSpecificScrapers.includes(scraper.name)
      );
      console.log(`Filtered to ${scrapersToRun.length} specific scrapers`);
    }
    
    // Process scrapers in batches to avoid overwhelming the server
    const { batchSize } = this.options;
    for (let i = 0; i < scrapersToRun.length; i += batchSize) {
      const batch = scrapersToRun.slice(i, i + batchSize);
      console.log(`Running batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(scrapersToRun.length/batchSize)}`);
      
      await Promise.all(batch.map(scraper => this.runScraper(scraper)));
      
      // Add a brief delay between batches to let the server breathe
      if (i + batchSize < scrapersToRun.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.endTime = Date.now();
    console.log(`Diagnostic job completed in ${(this.endTime - this.startTime)/1000} seconds`);
    
    // Generate reports and send notifications
    if (this.options.generateReport) {
      await this.generateReports();
    }
    
    if (this.options.sendNotifications) {
      await this.sendNotifications();
    }
    
    return this.results;
  }
  
  /**
   * Run a single scraper with timeout protection
   */
  async runScraper(scraper) {
    const startTime = Date.now();
    let result = {
      name: scraper.name,
      url: scraper.url || (scraper.urls ? scraper.urls[0] : ''),
      status: 'pending',
      events: [],
      errorType: null,
      error: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Setup timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scraper timed out')), this.options.timeout);
      });
      
      // Run the scraper
      console.log(`Running scraper: ${scraper.name}`);
      const scrapePromise = scraper.scrape();
      const events = await Promise.race([scrapePromise, timeoutPromise]);
      
      // Process successful result
      result.status = 'success';
      result.events = Array.isArray(events) ? events : [];
      
      if (result.events.length === 0) {
        result.status = 'empty'; // Successful run but no events found
      }
      
      console.log(`√ ${scraper.name}: Found ${result.events.length} events`);
    } catch (error) {
      // Handle error
      result.status = 'error';
      result.errorType = error.name || 'UnknownError';
      result.error = error.message || 'An unknown error occurred';
      result.stack = error.stack;
      console.error(`× ${scraper.name}: ${error.message}`);
    }
    
    // Calculate duration
    result.duration = Date.now() - startTime;
    
    // Save result
    this.results.push(result);
    
    return result;
  }
  
  /**
   * Generate diagnostic reports
   */
  async generateReports() {
    const timestamp = getFormattedDate();
    const jsonFilename = `scraper-diagnostic-${timestamp}.json`;
    const htmlFilename = `scraper-diagnostic-${timestamp}.html`;
    
    // Create JSON report
    const jsonReport = createJsonReport(this.results, {
      startTime: this.startTime,
      endTime: this.endTime
    });
    
    // Save JSON report
    const jsonPath = path.join(this.options.diagnosticDir, jsonFilename);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`JSON report saved to ${jsonPath}`);
    
    // Create HTML report
    const htmlReport = createHtmlReport(jsonReport);
    
    // Save HTML report to diagnostics folder
    const htmlPath = path.join(this.options.diagnosticDir, htmlFilename);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`HTML report saved to ${htmlPath}`);
    
    // Also save a copy to public folder as latest.html
    const publicHtmlPath = path.join(this.options.publicDir, 'latest-diagnostic.html');
    fs.writeFileSync(publicHtmlPath, htmlReport);
    console.log(`Latest HTML report saved to ${publicHtmlPath}`);
    
    return { 
      jsonPath, 
      htmlPath, 
      publicHtmlPath 
    };
  }
  
  /**
   * Determine if we should send an alert based on diagnostics results
   */
  shouldSendAlert() {
    // Count failures and zero events
    const totalScrapers = this.results.length;
    const failedScrapers = this.results.filter(r => r.status === 'error').length;
    const emptyScrapers = this.results.filter(r => r.status === 'empty').length;
    
    const failurePercent = (failedScrapers / totalScrapers) * 100;
    const emptyPercent = (emptyScrapers / totalScrapers) * 100;
    
    // Check if critical scrapers are failing
    const criticalScraperResults = this.results.filter(r => 
      ALERT_THRESHOLD_SPECIFIC_SCRAPERS.includes(r.name)
    );
    
    const hasCriticalFailure = criticalScraperResults.some(r => 
      r.status === 'error' || r.status === 'empty'
    );
    
    return (
      failurePercent >= ALERT_THRESHOLD_FAILURE_PERCENT ||
      emptyPercent >= ALERT_THRESHOLD_ZERO_EVENTS ||
      hasCriticalFailure
    );
  }
  
  /**
   * Send notifications if there are issues
   */
  async sendNotifications() {
    if (!this.shouldSendAlert()) {
      console.log('No alerts needed, scrapers are within acceptable thresholds');
      return;
    }
    
    try {
      // Count results by status
      const totalScrapers = this.results.length;
      const failedScrapers = this.results.filter(r => r.status === 'error');
      const emptyScrapers = this.results.filter(r => r.status === 'empty');
      const successScrapers = this.results.filter(r => r.status === 'success');
      
      // Create email summary
      const subject = `[ALERT] Scraper Diagnostic Results: ${failedScrapers.length} failing, ${emptyScrapers.length} empty`;
      
      let emailContent = `
        <h2>Scraper Diagnostic Alert</h2>
        <p>Diagnostic job completed on ${new Date(this.endTime).toLocaleString()}</p>
        
        <h3>Summary</h3>
        <ul>
          <li><strong>Total Scrapers:</strong> ${totalScrapers}</li>
          <li><strong>Successful:</strong> ${successScrapers.length} (${((successScrapers.length/totalScrapers)*100).toFixed(1)}%)</li>
          <li><strong>Failed:</strong> ${failedScrapers.length} (${((failedScrapers.length/totalScrapers)*100).toFixed(1)}%)</li>
          <li><strong>Empty:</strong> ${emptyScrapers.length} (${((emptyScrapers.length/totalScrapers)*100).toFixed(1)}%)</li>
        </ul>
        
        <h3>Failed Scrapers</h3>
        <table border="1" cellpadding="5">
          <tr>
            <th>Scraper</th>
            <th>Error</th>
            <th>Duration (ms)</th>
          </tr>
          ${failedScrapers.map(scraper => `
            <tr>
              <td>${scraper.name}</td>
              <td>${scraper.error}</td>
              <td>${scraper.duration}</td>
            </tr>
          `).join('')}
        </table>
        
        <h3>Empty Scrapers</h3>
        <table border="1" cellpadding="5">
          <tr>
            <th>Scraper</th>
            <th>URL</th>
            <th>Duration (ms)</th>
          </tr>
          ${emptyScrapers.map(scraper => `
            <tr>
              <td>${scraper.name}</td>
              <td>${scraper.url}</td>
              <td>${scraper.duration}</td>
            </tr>
          `).join('')}
        </table>
        
        <p>
          <a href="${config.baseUrl}/latest-diagnostic.html">View full diagnostic report</a>
        </p>
      `;
      
      // Send email notification
      if (emailService && typeof emailService.sendEmail === 'function') {
        await emailService.sendEmail({
          to: config.adminEmail || 'admin@example.com',
          subject,
          html: emailContent
        });
        console.log('Alert notification email sent');
      } else {
        console.log('Email service not available. Would have sent:', subject);
      }
      
      // Add other notification channels here (Slack, SMS, etc.)
      
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

// If running directly (not imported)
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg === '--no-report') options.generateReport = false;
    if (arg === '--no-notify') options.sendNotifications = false;
    if (arg === '--no-save') options.saveResults = false;
    if (arg.startsWith('--timeout=')) options.timeout = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--scrapers=')) options.runSpecificScrapers = arg.split('=')[1].split(',');
  });
  
  // Run the diagnostic job
  const job = new DiagnosticJob(options);
  job.runAllScrapers()
    .then(() => {
      console.log('Scheduled diagnostic job completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Diagnostic job failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = DiagnosticJob;
}
