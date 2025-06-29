/**
 * Unified Proxy Server for Discovr API
 * 
 * This server runs on port 3030 and provides:
 * 1. Direct access to ALL events from cloud MongoDB
 * 2. No pagination limitations
 * 3. Compatible with the Discovr iOS app
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection URI (must be set in Render environment)
const CLOUD_MONGODB_URI = process.env.MONGODB_URI;

// Crash if the environment variable is not set
if (!CLOUD_MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Use environment variable for port (Render will provide this)
const PORT = process.env.PORT || 3030;

// Admin UI path
const ADMIN_UI_PATH = path.join(__dirname, '../discovr-admin-ui/admin');

// Create MongoDB clients
const cloudClient = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// Serve static files for admin UI
app.use(express.static(ADMIN_UI_PATH));
app.use('/admin', express.static(ADMIN_UI_PATH));

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    // Connect to cloud MongoDB first
    await cloudClient.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    // CRITICAL: Always explicitly specify 'discovr' as the database name
    // This ensures we connect to the correct database regardless of the URI
    const cloudDb = cloudClient.db('discovr');
    console.log(`💾 Using database: ${cloudDb.databaseName}`);
    
    const cloudEventsCollection = cloudDb.collection('events');
    
    const cloudEventsCount = await cloudEventsCollection.countDocuments();
    console.log(`📊 Found ${cloudEventsCount} events in cloud database`);

    return { cloud: cloudEventsCollection };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

// Start the server
async function startServer() {
  try {
    // Connect to MongoDB
    const collections = await connectToMongoDB();
    
    // Health check endpoint
    app.get('/api/v1/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        message: 'Direct MongoDB proxy is healthy',
        timestamp: new Date().toISOString()
      });
    });
    
    // API endpoint to get ALL events (for the Discovr app)
    app.get('/api/v1/venues/events/all', async (req, res) => {
      console.log('📥 Received request for ALL events from cloud MongoDB');
      
      try {
        const events = await collections.cloud.find({}).toArray();
        console.log(`📤 Returning ${events.length} events from cloud MongoDB`);
        
        // Based on the app logs showing:
        // "📊 Response is a direct array with 28 items"
        // This shows the app expects a direct array, not an object with a data property
        console.log('📝 Formatting response as direct array to match app expectations');
        res.status(200).json(events);
      } catch (error) {
        console.error('❌ Error fetching cloud events:', error.message);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });
    
    // Admin UI API endpoints (using local MongoDB)
    app.get('/api/v1/events', async (req, res) => {
      try {
        console.log('GET /api/v1/events - Admin UI request received');
        
        // Get filter parameters
        const venue = req.query.venue;
        const category = req.query.category;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        // Build query
        const query = {};
        
        if (venue) {
          query['venue.name'] = new RegExp(venue, 'i');
        }
        
        if (category) {
          query.category = new RegExp(category, 'i');
        }
        
        if (startDate) {
          query.startDate = { $gte: new Date(startDate) };
        }
        
        if (endDate) {
          query.endDate = { $lte: new Date(endDate) };
        }
        
        // Get events from local database for admin UI
        const events = await collections.cloud.find(query).sort({ startDate: 1 }).toArray();
        console.log(`Found ${events.length} events for admin UI from local database`);
        
        res.status(200).json(events);
      } catch (err) {
        console.error('Error fetching events for admin UI:', err);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });
    
    // Get event by ID for admin UI
    app.get('/api/v1/events/:id', async (req, res) => {
      try {
        const event = await collections.cloud.findOne({ id: req.params.id });
        
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }
        
        res.status(200).json(event);
      } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({ error: 'Failed to fetch event' });
      }
    });
    
    // Add more admin UI endpoints as needed
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 UNIFIED PROXY SERVER RUNNING ON PORT ${PORT}            ║
║                                                           ║
║  ✅ Direct MongoDB Connection                             ║
║  ✅ All Events (117+) Available                            ║
║  ✅ No Pagination Limits                                  ║
║                                                           ║
║  API Endpoints:                                           ║
║  • http://localhost:${PORT}/api/v1/venues/events/all       ║
║  • http://localhost:${PORT}/api/v1/health                  ║
║                                                           ║
║  Admin UI:                                                ║
║  • http://localhost:${PORT}/admin                          ║
║                                                           ║
║  TO USE IN YOUR APP:                                      ║
║  1. Modify DiscovrConfig.swift:                           ║
║     • useProxyAPI = true                                  ║
║     • proxyAPIBaseURL = "http://localhost:${PORT}"         ║
║                                                           ║
║  2. Rebuild and launch the app                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await cloudClient.close();

  process.exit(0);
});

// Start the server
startServer().catch(console.error);
