console.log('<<<< SERVER.JS EXECUTION STARTED >>>>');
console.log(`Node version: ${process.version}`);
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
const publicPath = path.join(__dirname, 'public');
const fs = require('fs');
console.log('📁 Serving static files from:', publicPath);
console.log('📁 Public folder exists:', fs.existsSync(publicPath));
if (fs.existsSync(publicPath)) {
  const files = fs.readdirSync(publicPath).filter(f => f.endsWith('.html'));
  console.log('📄 HTML files in public:', files);
}
app.use(express.static(publicPath));

// Import authentication middleware
const { apiKeyAuth, anyAuth } = require('./middleware/auth');

// DNS test function to check if we can resolve the MongoDB hostname
const dns = require('dns');
const { execSync } = require('child_process');

// Extract hostname from MongoDB URI for testing
let mongoHostname = 'discovr.vzlnmqb.mongodb.net';
if (process.env.MONGODB_URI) {
  try {
    const uriMatch = process.env.MONGODB_URI.match(/@([^/]+)/); 
    if (uriMatch && uriMatch[1]) {
      mongoHostname = uriMatch[1];
    }
  } catch (e) {
    console.error('Error extracting hostname from MONGODB_URI:', e);
  }
}

// Basic network diagnostics
console.log('Running basic network diagnostics...');

// Perform DNS lookup test
console.log(`Testing DNS resolution for MongoDB hostname: ${mongoHostname}`);
dns.lookup(mongoHostname, (err, address, family) => {
  if (err) {
    console.error('DNS lookup error:', err);
  } else {
    console.log(`MongoDB hostname ${mongoHostname} resolves to ${address} (IPv${family})`);
  }
});

// Define global MongoDB connection state
let isMongoConnected = false;
let mongoConnectionAttempts = 0;
const MAX_MONGO_RETRIES = 5;

// MongoDB connection function with retry logic
const connectWithRetry = (retryCount = 0, maxRetries = MAX_MONGO_RETRIES) => {
  mongoConnectionAttempts++;
  console.log(`MongoDB connection attempt ${retryCount + 1} of ${maxRetries}`);
  
  // Check if MongoDB URI is available
  if (!process.env.MONGODB_URI) {
    console.log('❌ ERROR: MONGODB_URI environment variable is not defined!');
    console.log('API will run in limited functionality mode without database access');
    return Promise.resolve(false);
  }

  console.log('Connecting to MongoDB with URI:', 
    process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@')); // Hide password in logs
  
  // Use the MongoDB URI from environment variable
  let mongoUri = process.env.MONGODB_URI;
  
  // FORCE database name to 'discovr' - remove any existing DB name and add discovr
  // This ensures we always use the correct database regardless of the URI format
  mongoUri = mongoUri.replace(/\.net\/[^?]*/, '.net/discovr'); // Replace .net/ or .net/anything with .net/discovr
  console.log('📊 FORCED database name to "discovr"');
  console.log('📊 Modified URI:', mongoUri.replace(/:([^:@]+)@/, ':***@'));
  
  // Connection options based on successful test configuration
  const connectionOptions = {
    serverSelectionTimeoutMS: 20000, // 20 seconds timeout for server selection
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 30000,
    retryWrites: true,
    w: 'majority'
    // Note: useNewUrlParser and useUnifiedTopology are deprecated in newer mongoose versions
    // We're removing them based on the warning from our test script
  };
  
  console.log('Using optimized MongoDB connection options');
  
  return mongoose.connect(mongoUri, connectionOptions)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB!');
    isMongoConnected = true;
    
    // AUTO-CLEANUP: Remove events without 'id' field on startup
    (async () => {
      try {
        const Event = require('./models/Event');
        const missingIdCount = await Event.countDocuments({ id: { $exists: false } });
        if (missingIdCount > 0) {
          console.log(`🧹 CLEANING DATABASE: Found ${missingIdCount} events without 'id' field`);
          const result = await Event.deleteMany({ id: { $exists: false } });
          console.log(`✅ DELETED ${result.deletedCount} events without 'id' field`);
          const remaining = await Event.countDocuments({});
          console.log(`📊 Database now has ${remaining} clean events`);
        } else {
          console.log('✅ All events have id field - database is clean');
        }
      } catch (cleanupError) {
        console.error('⚠️ Error during auto-cleanup:', cleanupError.message);
      }
    })();
    
    if (mongoose.connection.db) {
      const dbName = mongoose.connection.db.databaseName || 'unknown';
      console.log('🗄️  ACTUAL DATABASE CONNECTED:', dbName);
      if (dbName !== 'discovr') {
        console.error('❌❌❌ ERROR: Connected to WRONG database:', dbName, '(expected: discovr)');
      }
      
      // Safely log server version if available
      try {
        if (mongoose.connection.db.admin) {
          mongoose.connection.db.admin().serverInfo()
            .then(info => {
              console.log('MongoDB server version:', info.version);
            })
            .catch(e => {
              console.log('⚠️ Could not retrieve MongoDB server info:', e.message);
            });
        }
      } catch (e) {
        console.log('⚠️ Error checking MongoDB server:', e.message);
      }
    }
    
    return true;
  })
  .catch(error => {
    console.log(`❌ MongoDB connection error: ${error.message}`);
    console.log(`Error name: ${error.name}`);
    console.log(`Error code: ${error.code || 'undefined'}`);
    
    // If network error or timeout, likely IP whitelist issue
    if (error.name === 'MongoNetworkError' || 
        error.message.includes('timeout') || 
        error.message.includes('ENOTFOUND')) {
      console.log('\n❗ LIKELY CAUSE: MongoDB Atlas network access restrictions');
      console.log('Cloud Run uses dynamic IPs that need to be allowed in MongoDB Atlas.');
      console.log('Consider setting "Allow Access from Anywhere" (0.0.0.0/0) in MongoDB Atlas Network Access');
    }
    
    if (retryCount < maxRetries) {
      console.log(`Retrying connection in 5 seconds...`);
      setTimeout(() => connectWithRetry(retryCount + 1, maxRetries), 5000);
    } else {
      console.log('❌ Failed to connect to MongoDB after multiple attempts');
      console.log('API will run with limited functionality, database features unavailable');
    }
    
    return false;
  });
};

// Start MongoDB connection in the background without blocking server startup
setTimeout(() => connectWithRetry(), 100);

// Middleware to check DB connection status before processing API requests
const checkDbConnection = (req, res, next) => {
  // If MongoDB is required for this route but not connected
  if (!isMongoConnected && req.path.includes('/api/v1/')) {
    // Allow certain endpoints to work without database connection
    if (req.path === '/api/v1/health' || req.path === '/api/v1/db-status' ||
        req.path === '/api/v1/ping' || req.path.startsWith('/api/v1/static')) {
      return next();
    }
    
    console.log(`API database request received while disconnected: ${req.path}`);
    return res.status(503).json({
      error: 'Database connection unavailable',
      status: 'error',
      message: 'The API is temporarily unable to connect to the database. Please try again later.'
    });
  }
  next();
};

// Add a global DB connection status endpoint that doesn't require connection
app.get('/api/v1/db-status', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1; // 1 = connected
  res.json({
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    database: mongoose.connection.db ? mongoose.connection.db.databaseName : 'Not connected',
    mongooseVersion: mongoose.version,
  });
});

// Import routes
const eventsRouter = require('./routes/events');
const authRouter = require('./routes/auth');
const venuesRouter = require('./routes/venues');
const adminScraperRouter = require('./routes/admin-scraper');
const directDbRouter = require('./routes/direct-db');
const freshEventsRouter = require('./routes/fresh-events');
const diagnosticRouter = require('./routes/diagnostic');
// const artGalleryRoutes = require('./routes/artGalleryRoutes'); // Temporarily disabled - missing scrapers

// Import static routes that don't require MongoDB connection
const staticRoutes = require('./routes/staticRoutes');

// Set up dynamic API routes that need DB connection
const apiRoutes = express.Router();

// Only use DB routes when MongoDB is connected
apiRoutes.use('/events', checkDbConnection, eventsRouter);
apiRoutes.use('/venues', checkDbConnection, venuesRouter);
// apiRoutes.use('/art-galleries', checkDbConnection, artGalleryRoutes); // Temporarily disabled

// Mount static routes that work even without DB (no DB check middleware)
app.use('/api/v1/static', staticRoutes);

// Add a direct route for static venues to avoid 404
app.get('/api/v1/static/venues', (req, res) => {
  const staticVenues = [
    {
      id: 'kootenay-gallery',
      name: 'Kootenay Gallery of Art',
      location: {
        address: '120 Heritage Way, Castlegar, BC V1N 4M5',
        city: 'Castlegar',
        postalCode: 'V1N 4M5'
      },
      url: 'https://www.kootenaygallery.com'
    },
    {
      id: 'vancouver-art-gallery',
      name: 'Vancouver Art Gallery',
      location: {
        address: '750 Hornby St, Vancouver, BC V6Z 2H7',
        city: 'Vancouver',
        postalCode: 'V6Z 2H7'
      },
      url: 'https://www.vanartgallery.bc.ca'
    },
    {
      id: 'surrey-art-gallery',
      name: 'Surrey Art Gallery',
      location: {
        address: '13750 88 Ave, Surrey, BC V3W 3L1',
        city: 'Surrey',
        postalCode: 'V3W 3L1'
      },
      url: 'https://www.surrey.ca/arts-culture/surrey-art-gallery'
    }
  ];
  
  res.json({
    status: 'ok',
    message: 'Static venues data (MongoDB not connected)',
    count: staticVenues.length,
    venues: staticVenues
  });
});
app.use('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Discovr API',
    dbConnected: isMongoConnected,
    version: '1.1.0' // Increment to force cache invalidation
  });
});

// FORCE CACHE CLEAR
app.get('/api/admin/clear-cache', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Force process exit to restart server and clear all caches
  res.json({ 
    success: true, 
    message: 'Server restarting to clear all caches...',
    timestamp: new Date().toISOString()
  });
  
  setTimeout(() => {
    console.log('🔄 FORCE RESTART - Clearing all caches');
    process.exit(0); // Render will automatically restart
  }, 100);
});

// Mount all API routes under /api/v1
app.use('/api/v1', apiRoutes);
app.use('/api/v1/auth', authRouter); // Auth routes don't need DB checking
app.use('/api/admin', adminScraperRouter); // Admin scraper routes
app.use('/api/direct', directDbRouter); // Direct database access - bypasses all caches
app.use('/api/fresh', freshEventsRouter); // BRAND NEW PATH - cannot be cached
app.use('/api/diagnostic', diagnosticRouter); // Shows exactly what database Render is using

// DEBUG route - test if file is readable
app.get('/test-file', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'featured-events-admin.html');
  console.log('🔍 Test route - file path:', filePath);
  console.log('🔍 File exists:', fs.existsSync(filePath));
  res.sendFile(filePath);
});

// Admin - ONLY the city-based featured events manager (handle both /admin and /admin/)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'featured-events-admin.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'featured-events-admin.html'));
});

// Root redirects to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Import and initialize the scraper manager
const scraperManager = require('./scrapers/scraperManager');

// Only initialize scrapers if MongoDB is connected AND we're in production or explicitly enabled
if (isMongoConnected && (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCRAPERS === 'true')) {
  console.log('MongoDB connected and ENABLE_SCRAPERS is true - initializing scrapers');
  // Wait a bit to ensure stable database connection before starting scrapers
  setTimeout(() => {
    try {
      scraperManager.initializeScrapers();
      console.log('✅ Scrapers successfully initialized');
    } catch (error) {
      console.error('❌ Error initializing scrapers:', error.message);
    }
  }, 5000); // 5 second delay to ensure stable DB connection
} else {
  if (!isMongoConnected) {
    console.log('Scrapers disabled: MongoDB not connected');
  } else {
    console.log('Scrapers disabled in development mode. Set ENABLE_SCRAPERS=true to enable.');
  }
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
console.log(`Attempting to listen on 0.0.0.0:${PORT}`);
// Start server immediately without waiting for MongoDB
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server listening on port ${PORT}`);
  console.log(`API base URL: http://0.0.0.0:${PORT}/api/v1`);
  console.log('Server started successfully, Cloud Run health checks should now pass');
});

// Server shutdown handling
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing connections...');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false)
      .then(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error during MongoDB connection closure:', err);
        process.exit(1);
      });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
