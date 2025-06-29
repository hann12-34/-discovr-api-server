/**
 * Configuration settings for the Discovr API server
 * Contains settings for various components including scrapers and notifications
 */

const config = {
  // Base application settings
  appName: 'Discovr Vancouver',
  baseUrl: process.env.BASE_URL || 'https://discovr-api-531591199325.us-west1.run.app',
  port: process.env.PORT || 3000,
  
  // MongoDB configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Admin settings
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  
  // Scraper settings
  scrapers: {
    timeout: process.env.SCRAPER_TIMEOUT || 30000, // 30 seconds
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    maxRetries: 3,
    concurrentScrapes: process.env.CONCURRENT_SCRAPES || 3
  },
  
  // Email notifications
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true' || false,
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'Discovr Scraper <noreply@example.com>'
  },
  
  // Diagnostics settings
  diagnostics: {
    reportDir: process.env.REPORT_DIR || './diagnostics',
    scheduledRuns: process.env.SCHEDULED_DIAGNOSTICS === 'true' || false,
    alertThresholds: {
      failurePercent: process.env.ALERT_FAILURE_PERCENT || 20,
      emptyPercent: process.env.ALERT_EMPTY_PERCENT || 30,
      criticalScrapers: [
        'Celebrities Nightclub',
        'Commodore Ballroom',
        'Imperial',
        'Fortune Sound Club'
      ]
    }
  }
};

module.exports = config;
