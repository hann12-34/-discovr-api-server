/**
 * Scraper Monitoring System
 * 
 * This module provides monitoring capabilities for all scrapers:
 * - Tracks when scrapers return zero events
 * - Sends alerts when scrapers consistently fail to find events
 * - Logs scraper performance metrics
 * 
 * Last updated: June 16, 2025
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// Configuration - can be moved to env variables
const config = {
  alertThreshold: 3, // Number of consecutive failures before alerting
  historyLength: 10, // Number of scraper runs to keep in history
  logDirectory: path.join(__dirname, '../logs/scrapers'),
  emailAlerts: {
    enabled: true,
    from: process.env.ALERT_EMAIL || 'scraper-alerts@discovr-api.com',
    to: process.env.ALERT_EMAIL_RECIPIENT || 'developers@discovr-api.com',
    smtpConfig: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },
  slackAlerts: {
    enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  }
};

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logDirectory)) {
  fs.mkdirSync(config.logDirectory, { recursive: true });
}

// Setup logger
const scraperLogger = createLogger({
  format: combine(
    timestamp(),
    printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    }),
    new transports.File({ 
      filename: path.join(config.logDirectory, 'scraper-monitoring.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// Store scraper history in memory
// In production, this would be better stored in a database
const scraperHistory = {};

/**
 * Records a scraper run result and checks if alert should be sent
 * @param {string} scraperName - Name of the scraper
 * @param {number} eventCount - Number of events found by the scraper
 * @param {number} responseTime - Time taken to run the scraper in ms
 * @param {Error|null} error - Any error that occurred during scraping
 * @returns {Promise<void>}
 */
async function recordScraperRun(scraperName, eventCount, responseTime, error = null) {
  // Initialize history for this scraper if it doesn't exist
  if (!scraperHistory[scraperName]) {
    scraperHistory[scraperName] = {
      runs: [],
      lastAlerted: null
    };
  }
  
  const history = scraperHistory[scraperName];
  const timestamp = new Date();
  
  // Add this run to history
  history.runs.push({
    timestamp,
    eventCount,
    responseTime,
    error: error ? error.message : null,
    success: !error && eventCount > 0
  });
  
  // Keep history at the configured length
  if (history.runs.length > config.historyLength) {
    history.runs.shift(); // Remove oldest entry
  }
  
  // Log the run
  const status = error ? 'ERROR' : (eventCount === 0 ? 'NO EVENTS' : 'SUCCESS');
  const logMessage = `Scraper [${scraperName}] ${status}: ${eventCount} events in ${responseTime}ms`;
  
  if (error) {
    scraperLogger.error(`${logMessage} - Error: ${error.message}`);
  } else if (eventCount === 0) {
    scraperLogger.warn(logMessage);
  } else {
    scraperLogger.info(logMessage);
  }
  
  // Check if we need to send an alert
  await checkForAlert(scraperName, history, timestamp);
}

/**
 * Checks if an alert should be sent for a scraper
 * @param {string} scraperName - Name of the scraper
 * @param {Object} history - History object for this scraper
 * @param {Date} currentTime - Current timestamp
 * @returns {Promise<void>}
 */
async function checkForAlert(scraperName, history, currentTime) {
  // Count consecutive failures (zero events or errors)
  let consecutiveFailures = 0;
  
  for (let i = history.runs.length - 1; i >= 0; i--) {
    const run = history.runs[i];
    if (!run.success) {
      consecutiveFailures++;
    } else {
      break; // Stop counting once we hit a success
    }
  }
  
  // Should we send an alert?
  if (consecutiveFailures >= config.alertThreshold) {
    // Don't alert too frequently for the same scraper
    const hoursSinceLastAlert = history.lastAlerted ? 
      (currentTime - history.lastAlerted) / (1000 * 60 * 60) : 
      24; // If never alerted, set to 24 hours
      
    if (hoursSinceLastAlert >= 24) { // Don't alert more than once per day
      // Send alert
      await sendAlert(scraperName, consecutiveFailures, history.runs);
      
      // Update last alerted time
      history.lastAlerted = currentTime;
    }
  }
}

/**
 * Sends an alert about a failing scraper
 * @param {string} scraperName - Name of the scraper
 * @param {number} failureCount - Number of consecutive failures
 * @param {Array} recentRuns - Recent run history
 * @returns {Promise<void>}
 */
async function sendAlert(scraperName, failureCount, recentRuns) {
  // Prepare alert message
  const subject = `⚠️ Scraper Alert: ${scraperName} has failed ${failureCount} times`;
  
  let message = `<h2>Scraper Alert: ${scraperName}</h2>`;
  message += `<p>The scraper <strong>${scraperName}</strong> has failed to return events ${failureCount} consecutive times.</p>`;
  message += `<p>This indicates the scraper may be broken and needs attention.</p>`;
  
  message += `<h3>Recent Run History:</h3><ul>`;
  recentRuns.slice(-5).forEach(run => {
    const date = new Date(run.timestamp).toLocaleString();
    const status = run.error ? `ERROR: ${run.error}` : 
                   (run.eventCount === 0 ? 'NO EVENTS FOUND' : `${run.eventCount} events found`);
    message += `<li>${date} - ${status} (${run.responseTime}ms)</li>`;
  });
  message += `</ul>`;
  
  message += `<p>Please check the scraper code and the target website for any changes that might have broken the scraper.</p>`;
  
  // Log the alert
  scraperLogger.warn(`Sending alert for scraper ${scraperName} - ${failureCount} consecutive failures`);
  
  // Send email alert
  if (config.emailAlerts.enabled && config.emailAlerts.to) {
    try {
      await sendEmailAlert(subject, message);
    } catch (error) {
      scraperLogger.error(`Failed to send email alert: ${error.message}`);
    }
  }
  
  // Send Slack alert
  if (config.slackAlerts.enabled && config.slackAlerts.webhookUrl) {
    try {
      await sendSlackAlert(subject, scraperName, failureCount, recentRuns);
    } catch (error) {
      scraperLogger.error(`Failed to send Slack alert: ${error.message}`);
    }
  }
}

/**
 * Send an email alert
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @returns {Promise<void>}
 */
async function sendEmailAlert(subject, htmlContent) {
  if (!config.emailAlerts.smtpConfig || !config.emailAlerts.smtpConfig.auth.user) {
    scraperLogger.warn('Email alerts configured but SMTP credentials not set');
    return;
  }
  
  const transporter = nodemailer.createTransport(config.emailAlerts.smtpConfig);
  
  const mailOptions = {
    from: config.emailAlerts.from,
    to: config.emailAlerts.to,
    subject,
    html: htmlContent
  };
  
  await transporter.sendMail(mailOptions);
  scraperLogger.info(`Email alert sent to ${config.emailAlerts.to}`);
}

/**
 * Send a Slack alert
 * @param {string} subject - Alert subject
 * @param {string} scraperName - Name of the scraper
 * @param {number} failureCount - Number of consecutive failures
 * @param {Array} recentRuns - Recent run history
 * @returns {Promise<void>}
 */
async function sendSlackAlert(subject, scraperName, failureCount, recentRuns) {
  if (!config.slackAlerts.webhookUrl) {
    scraperLogger.warn('Slack alerts configured but webhook URL not set');
    return;
  }
  
  const axios = require('axios');
  
  const recentRunsText = recentRuns.slice(-3).map(run => {
    const date = new Date(run.timestamp).toLocaleString();
    const status = run.error ? `ERROR: ${run.error}` : 
                   (run.eventCount === 0 ? 'NO EVENTS FOUND' : `${run.eventCount} events found`);
    return `${date} - ${status} (${run.responseTime}ms)`;
  }).join('\n');
  
  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: subject
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `The scraper *${scraperName}* has failed to return events ${failureCount} consecutive times. This indicates the scraper may be broken and needs attention.`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Recent Run History:*\n\`\`\`${recentRunsText}\`\`\``
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Please check the scraper code and the target website for any changes."
          }
        ]
      }
    ]
  };
  
  await axios.post(config.slackAlerts.webhookUrl, message);
  scraperLogger.info('Slack alert sent');
}

/**
 * Gets the recent history of a scraper
 * @param {string} scraperName - Name of the scraper
 * @returns {Array|null} - Array of recent runs or null if no history
 */
function getScraperHistory(scraperName) {
  if (!scraperHistory[scraperName]) {
    return null;
  }
  return [...scraperHistory[scraperName].runs];
}

/**
 * Gets statistics for all scrapers
 * @returns {Object} - Object with scraper statistics
 */
function getScraperStats() {
  const stats = {
    totalScrapers: Object.keys(scraperHistory).length,
    totalRuns: 0,
    failingScrapers: [],
    healthyScrapers: []
  };
  
  for (const [name, history] of Object.entries(scraperHistory)) {
    stats.totalRuns += history.runs.length;
    
    // Check last 3 runs
    const recentRuns = history.runs.slice(-3);
    const recentFailures = recentRuns.filter(run => !run.success).length;
    
    if (recentFailures >= 2) {
      stats.failingScrapers.push({
        name,
        lastSuccess: history.runs.findLast(run => run.success)?.timestamp,
        failureCount: recentFailures
      });
    } else {
      stats.healthyScrapers.push({
        name,
        eventCount: history.runs[history.runs.length - 1]?.eventCount || 0,
        lastRun: history.runs[history.runs.length - 1]?.timestamp
      });
    }
  }
  
  return stats;
}

/**
 * Creates a wrapper function for a scraper that includes monitoring
 * @param {Function} scraperFunc - The original scraper function
 * @param {string} scraperName - Name of the scraper
 * @returns {Function} - Wrapped scraper function with monitoring
 */
function monitorScraper(scraperFunc, scraperName) {
  return async function monitoredScraper(...args) {
    const startTime = Date.now();
    let eventCount = 0;
    let error = null;
    
    try {
      const events = await scraperFunc(...args);
      eventCount = Array.isArray(events) ? events.length : 0;
      return events;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      const responseTime = Date.now() - startTime;
      await recordScraperRun(scraperName, eventCount, responseTime, error);
    }
  };
}

module.exports = {
  recordScraperRun,
  getScraperHistory,
  getScraperStats,
  monitorScraper
};
