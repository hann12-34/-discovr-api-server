// CLOUD RUN COMPATIBLE EXPRESS SERVER
// Replace your existing server.js or api-server.js with this code

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Import Scraper Coordinator
const scraperCoordinator = require('./scrapers');

// Import Routes
const importRoutes = require('./routes/import-routes');

// Create Express application
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register Routes
app.use('/api/v1/import', importRoutes);

// CORRECT CLOUD RUN PORT CONFIGURATION
// This is the critical fix - use environment variable PORT
const port = process.env.PORT || 8080;

console.log(`STARTUP: Discovr API starting on port ${port}`);
console.log(`STARTUP: NODE_ENV=${process.env.NODE_ENV}`);
console.log(`STARTUP: PORT=${process.env.PORT}`);

// CRITICAL: START SERVER BEFORE MongoDB connection attempt
// This ensures Cloud Run health checks pass immediately
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`API is available at: http://0.0.0.0:${port}/api/v1/events`);
  console.log(`Health check endpoint: http://0.0.0.0:${port}/api/v1/health`);
});

// MongoDB connection AFTER server is listening
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Log MongoDB URI (with sensitive parts masked)
const maskedURI = MONGODB_URI.replace(/:([^:@]+)@/, ':*****@');
console.log(`Attempting MongoDB connection to: ${maskedURI}`);

// Function to attempt MongoDB connection with retry
function connectWithRetry(retryCount = 3, delay = 5000) {
  console.log(`MongoDB connection attempt ${4 - retryCount}...`);
  
  return mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout (increased)
      connectTimeoutMS: 20000, // 20 second connection timeout (increased)
      socketTimeoutMS: 45000, // 45 second socket timeout (added)
      family: 4 // Force IPv4 (added to avoid DNS issues)
    })
    .then(() => {
      console.log('✅ Connected to MongoDB successfully');
      console.log(`Database name: ${mongoose.connection.db.databaseName}`);
      
      // Initialize ScraperCoordinator with our Event model
      return scraperCoordinator.init({
        eventModel: Event,
        autoSchedule: true
      });
    })
    .then(() => {
      console.log('✅ Scraper Coordinator initialized');
      
      // Run scrapers on startup if enabled in config
      if (scraperCoordinator.config.scheduler.runOnStartup) {
        console.log('Running initial scraper run on startup...');
        return scraperCoordinator.runScrapers()
          .then(events => console.log(`Initial scraper run complete, found ${events.length} events`))
          .catch(err => console.error('❌ Error during initial scraper run:', err));
      }
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('Error details:', err);
      
      if (retryCount > 0) {
        console.log(`⏱️ Retrying connection in ${delay/1000} seconds... (${retryCount} attempts left)`);
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(connectWithRetry(retryCount - 1, delay));
          }, delay);
        });
      } else {
        console.error('❌ Failed to connect to MongoDB after multiple attempts');
        console.log('API will continue running with limited functionality');
        // Continue server operation even if MongoDB fails
        return Promise.resolve();
      }
    });
}

// Start connection process with retry
connectWithRetry();

// Define enhanced schema for events that matches our scrapers' output format
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  image: String,
  startDate: Date,
  endDate: Date,
  season: String,
  location: String,
  venue: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String
  },
  category: String,
  priceRange: String,
  sourceURL: String,
  officialWebsite: String,
  dataSources: [String],
  lastUpdated: { type: Date, default: Date.now }
});

// This is our new Event model used by the scrapers
const Event = mongoose.model('Event', eventSchema);

// Keep the old model for backward compatibility
const seasonalActivitySchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  image: String,
  season: String,
  location: String,
  date: Date,
  category: String
});

const SeasonalActivity = mongoose.model('SeasonalActivity', seasonalActivitySchema);

// API Routes
// Health check endpoint - CRITICAL for Cloud Run
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check MongoDB connection status
app.get('/api/v1/debug/mongodb', (req, res) => {
  // Mask sensitive parts of the connection string if present
  const connectionUri = MONGODB_URI ? MONGODB_URI.replace(/:([^:@]+)@/, ':*****@') : 'Not set';
  
  res.status(200).json({
    mongoDbUri: connectionUri,
    connectionState: mongoose.connection ? mongoose.connection.readyState : -1,
    connectionStatus: getMongoConnectionStatus(),
    dbName: mongoose.connection?.db?.databaseName || 'Not connected',
    timestamp: new Date().toISOString()
  });
});

// Helper function to get MongoDB connection status
function getMongoConnectionStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

// Admin endpoint to trigger specific venue scrapers
app.post('/api/v1/admin/scrape', async (req, res) => {
  try {
    const venue = req.query.venue?.toLowerCase();
    
    if (!venue) {
      return res.status(400).json({ 
        error: 'Missing venue parameter', 
        message: 'Please specify a venue to scrape using the venue query parameter',
        example: '/api/v1/admin/scrape?venue=foxcabaret'
      });
    }
    
    console.log(`🔍 Admin requested scrape for venue: ${venue}`);
    
    // Get the VancouverScrapers instance
    const vancouverScrapers = scraperCoordinator.scrapers.find(s => s.sourceIdentifier === 'city-events').citySources.vancouver;
    
    if (!vancouverScrapers) {
      return res.status(500).json({ error: 'Vancouver scrapers not found' });
    }
    
    // Find the requested venue scraper
    const targetScraper = vancouverScrapers.venueScrapers.find(scraper => 
      scraper.name.toLowerCase().replace(/\s+/g, '') === venue ||
      scraper.name.toLowerCase() === venue);
    
    if (!targetScraper) {
      return res.status(404).json({ 
        error: 'Venue scraper not found',
        availableVenues: vancouverScrapers.venueScrapers.map(s => s.name.toLowerCase())
      });
    }
    
    // Run just the specified scraper
    console.log(`✅ Running ${targetScraper.name} scraper...`);
    const rawEvents = await targetScraper.scrape();
    
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      return res.status(200).json({ 
        message: `${targetScraper.name} scraper found no events`,
        events: []
      });
    }
    
    // Format and save the events
    const formattedEvents = rawEvents.map(e => vancouverScrapers.formatEvent(e, targetScraper.name));
    const savedEvents = await scraperCoordinator.saveEventsToMongoDB(formattedEvents);
    
    console.log(`✨ ${targetScraper.name} scraper found ${rawEvents.length} events, saved ${savedEvents.length}`);
    
    res.status(200).json({ 
      message: `${targetScraper.name} scraper found ${rawEvents.length} events, saved ${savedEvents.length}`, 
      events: savedEvents
    });
  } catch (error) {
    console.error('Error running venue scraper:', error);
    res.status(500).json({ error: 'Failed to run venue scraper' });
  }
});

// Get all events - updated to use the new Event model
app.get('/api/v1/events', async (req, res) => {
  try {
    // Check if we have events in the database
    const events = await Event.find();
    
    if (events && events.length > 0) {
      // Return events from database
      res.status(200).json({ data: events });
    } else {
      // No events in database, run scrapers
      console.log('No events found in database, running scrapers');
      
      try {
        const scrapedEvents = await scraperCoordinator.runScrapers();
        if (scrapedEvents && scrapedEvents.length > 0) {
          res.status(200).json({ data: scrapedEvents });
        } else {
          res.status(200).json({ 
            data: [],
            message: 'No events currently available' 
          });
        }
      } catch (scraperError) {
        console.error('Error running scrapers:', scraperError);
        res.status(200).json({ 
          data: [],
          error: 'Error retrieving events'
        });
      }
    }
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(200).json({ data: [], error: 'Service unavailable' });
  }
});

// API route for the iOS app to get all events - now using real data from scrapers
app.get('/api/v1/venues/events/all', async (req, res) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    console.log('MongoDB connection not available, running scrapers to get real-time events');
    try {
      // Try to run scrapers on-demand if MongoDB is down
      const scrapedEvents = await scraperCoordinator.runScrapers();
      if (scrapedEvents && scrapedEvents.length > 0) {
        return res.status(200).json(scrapedEvents);
      } else {
        return res.status(200).json([]);
      }
    } catch (error) {
      console.error('Error running scrapers:', error);
      return res.status(200).json([]);
    }
  }

  try {
    // Query parameters for filtering
    const { category, season, limit = 100 } = req.query;
    const query = {};
    
    // Apply filters if provided
    if (category) query.category = category;
    if (season) query.season = season;
    
    const events = await Event.find(query).limit(parseInt(limit, 10));
    
    if (events && events.length > 0) {
      res.status(200).json(events);
      console.log(`Successfully returned ${events.length} events from MongoDB via /venues/events/all endpoint`);
    } else {
      // No events in database, run scrapers
      console.log('No events found in database, running scrapers');
      
      try {
        const scrapedEvents = await scraperCoordinator.runScrapers();
        if (scrapedEvents && scrapedEvents.length > 0) {
          res.status(200).json(scrapedEvents);
          console.log(`Returned ${scrapedEvents.length} freshly scraped events`);
        } else {
          res.status(200).json([]);
        }
      } catch (scraperError) {
        console.error('Error running scrapers:', scraperError);
        res.status(200).json({ 
          data: [], 
          error: 'Unable to retrieve events at this time'
        });
      }
    }
  } catch (err) {
    console.error('Error fetching events from /venues/events/all:', err);
    res.status(200).json([]);
  }
});

// Get event by ID
app.get('/api/v1/events/:id', async (req, res) => {
  try {
    const event = await SeasonalActivity.findOne({ id: req.params.id });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(200).json(event);
  } catch (err) {
    console.error('Error fetching event by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test event if needed
app.get('/api/v1/seed', async (req, res) => {
  try {
    // Check if we have any events
    const count = await SeasonalActivity.countDocuments();
    
    if (count === 0) {
      // Create a test event
      const testEvent = new SeasonalActivity({
        id: 'sample-1',
        title: 'Sample Summer Activity',
        description: 'This is a sample activity for testing',
        image: 'https://picsum.photos/300/200',
        season: 'Summer',
        location: 'Vancouver, BC, Canada',
        date: new Date(),
        category: 'Outdoor'
      });
      
      await testEvent.save();
      res.status(201).json({ message: 'Test event created', event: testEvent });
    } else {
      res.status(200).json({ message: `Database already has ${count} events` });
    }
  } catch (err) {
    console.error('Error creating test event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle graceful shutdown for Cloud Run
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
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
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
});

// Handle graceful shutdown for Cloud Run
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});
