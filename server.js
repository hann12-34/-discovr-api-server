const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cron = require('node-cron');
const config = require('./config');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
// Always use 8080 for Cloud Run - this is important
const PORT = process.env.PORT || 8080;

// Log the port at startup
console.log(`Starting server with PORT=${PORT} (process.env.PORT=${process.env.PORT})`);

// Middleware
// Set up permissive CORS for development
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Origin, Accept');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logger middleware
const requestLogger = require('./middleware/request-logger');
app.use(requestLogger);

// Standard middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Import authentication middleware
const { apiKeyAuth, anyAuth } = require('./middleware/auth');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Import routes
const eventsRouter = require('./routes/events');
const authRouter = require('./routes/auth');
const venuesRouter = require('./routes/venues');

// Use routes with authentication
app.use('/api/v1/events', anyAuth, eventsRouter); // Allow either API key or JWT token
app.use('/api/v1/scrapers', require('./routes/scraper')); // For development, not requiring auth
app.use('/api/v1/auth', authRouter); // Auth routes (login doesn't require authentication)
app.use('/api/v1/venues', venuesRouter); // Venues route for direct venue access

// Basic root route
app.get('/', (req, res) => {
  res.send('Discovr Events API Server is running');
});

// Import and initialize the scraper manager
const scraperManager = require('./scrapers/scraperManager');

// Only initialize scrapers in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCRAPERS === 'true') {
  console.log('Initializing event scrapers');
  scraperManager.initializeScrapers();
} else {
  console.log('Scrapers disabled in development mode. Set ENABLE_SCRAPERS=true to enable.');
}

// Initialize scheduled diagnostics if enabled
if (config.diagnostics?.scheduledRuns || process.env.SCHEDULED_DIAGNOSTICS === 'true') {
  // Import the diagnostic job
  const DiagnosticJob = require('./tools/scheduled-diagnostics');
  
  // Schedule the daily comprehensive health check
  // Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled comprehensive diagnostics check');
    const job = new DiagnosticJob({
      generateReport: true,
      sendNotifications: true,
      timeout: config.scrapers.timeout || 45000
    });
    
    try {
      await job.runAllScrapers();
      console.log('Completed daily comprehensive diagnostics check');
    } catch (error) {
      console.error('Error running diagnostics:', error);
    }
  });
  
  // Schedule health check for critical scrapers (more frequent)
  // Run every 6 hours for important scrapers only
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running critical scrapers health check');
    const job = new DiagnosticJob({
      generateReport: false, // Don't generate full report for frequent checks
      sendNotifications: true,
      runSpecificScrapers: config.diagnostics.alertThresholds.criticalScrapers
    });
    
    try {
      await job.runAllScrapers();
      console.log('Completed critical scrapers health check');
    } catch (error) {
      console.error('Error running critical health check:', error);
    }
  });
  
  console.log('Scheduled diagnostics enabled');
} else {
  console.log('Scheduled diagnostics disabled. Set SCHEDULED_DIAGNOSTICS=true to enable.');
}

// Start server - bind to 0.0.0.0 to handle external requests
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API is available at: http://0.0.0.0:${PORT}/api/v1/events`);
  console.log('Environment: ' + process.env.NODE_ENV);
});
