/**
 * Simple Local Proxy Server for Discovr App
 * 
 * Connects directly to cloud MongoDB and returns all events without pagination
 */

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

// Configuration
const PORT = 3050;
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create MongoDB client
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Track requests
let requestCount = 0;

// Log all requests
app.use((req, res, next) => {
  requestCount++;
  console.log(`\n[${requestCount}] ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    const eventsCount = await eventsCollection.countDocuments();
    console.log(`📊 Found ${eventsCount} events in cloud database`);
    
    return eventsCollection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return null;
  }
}

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Local proxy is healthy',
    timestamp: new Date().toISOString()
  });
});

// Return all events
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('📥 Received request for all events');
  
  try {
    const eventsCollection = await connectToMongoDB();
    if (!eventsCollection) {
      return res.status(500).json({ error: 'Database connection is not available' });
    }
    
    // Get all events without any limit
    const events = await eventsCollection.find({}).toArray();
    console.log(`📤 Returning ${events.length} events`);
    
    // Return events as JSON
    res.json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Handle all other routes
app.use('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Discovr Proxy Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .highlight { background: #ffff00; padding: 2px; }
        </style>
      </head>
      <body>
        <h1>Discovr Proxy Server</h1>
        <p>This server is running at <code>http://localhost:3050</code></p>
        <p>Request count: ${requestCount}</p>
        <p>API endpoints:</p>
        <ul>
          <li><a href="/api/v1/health">Health Check</a></li>
          <li><a href="/api/v1/venues/events/all">All Events</a></li>
        </ul>
        <h2>Instructions</h2>
        <p>Update your app's <code>DiscovrConfig.swift</code> file:</p>
        <pre>
// Change this line:
static let apiBaseURL = "https://discovr-api-test-531591199325.northamerica-northeast2.run.app"

// To this:
static let apiBaseURL = "http://localhost:3050"</pre>
        <p>Then restart your app to see all events!</p>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 DISCOVR PROXY SERVER RUNNING                          ║
║                                                           ║
║  Local URL: http://localhost:3050                      ║
║                                                           ║
║  API endpoint: http://localhost:3050/api/v1            ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📱 TO USE WITH YOUR APP:                                 ║
║                                                           ║
║  1. Update DiscovrConfig.swift:                           ║
║     static let apiBaseURL = "http://localhost:3050"    ║
║                                                           ║
║  2. Build and run your app - you'll see all 117 events!   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Connect to MongoDB
  connectToMongoDB();
});
