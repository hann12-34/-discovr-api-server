/**
 * Local Proxy Server for Discovr App
 * 
 * This server runs on your Mac and completely replaces the cloud API.
 * It connects directly to the cloud MongoDB to retrieve all 117 events.
 */

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PORT = 3000; // Use port 3000 for local development
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let eventsCollection = null;
let cachedEvents = null;
let lastFetchTime = null;

// Connect to MongoDB
async function connectToMongoDB() {
  if (!client || !eventsCollection) {
    try {
      await client.connect();
      console.log('✅ Connected to cloud MongoDB');
      
      const db = client.db('discovr');
      eventsCollection = db.collection('events');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      return false;
    }
  }
  return true;
}

// Get all events from MongoDB with caching
async function getAllEvents() {
  // Check if we have a recent cache (less than 5 minutes old)
  const now = new Date();
  if (cachedEvents && lastFetchTime && (now - lastFetchTime) < 5 * 60 * 1000) {
    return cachedEvents;
  }

  try {
    const connected = await connectToMongoDB();
    if (!connected) {
      throw new Error('MongoDB connection failed');
    }
    
    // Get all events from MongoDB
    const events = await eventsCollection.find({}).toArray();
    console.log(`📊 Found ${events.length} events in cloud database`);
    
    // Update cache
    cachedEvents = events;
    lastFetchTime = now;
    
    // Save events to a local file for backup
    const backupPath = path.join(__dirname, 'events-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(events, null, 2));
    
    return events;
  } catch (error) {
    console.error('❌ Error getting events:', error.message);
    
    // Try to use backup file if available
    try {
      const backupPath = path.join(__dirname, 'events-backup.json');
      if (fs.existsSync(backupPath)) {
        const backupData = fs.readFileSync(backupPath, 'utf8');
        const backupEvents = JSON.parse(backupData);
        console.log(`⚠️ Using backup events file with ${backupEvents.length} events`);
        return backupEvents;
      }
    } catch (backupError) {
      console.error('❌ Backup file error:', backupError.message);
    }
    
    return [];
  }
}

// API routes

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Local Proxy API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Get all events
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('📥 Received request for all events');
  
  try {
    const events = await getAllEvents();
    console.log(`📤 Returning ${events.length} events`);
    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Catch-all for any other API routes
app.get('/api/v1/*', (req, res) => {
  console.log(`📥 Received request for: ${req.path}`);
  res.status(200).json({ message: 'API endpoint not implemented in local proxy' });
});

// Serve a simple status page
app.get('/', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = [];
  
  // Get all local IP addresses to show connection options
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        ipAddresses.push({
          name: interfaceName,
          address: iface.address
        });
      }
    }
  });
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Discovr Local Proxy Server</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .success { color: green; }
        .warning { color: orange; }
        h1 { color: #333; }
        code { background: #eee; padding: 2px 5px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>Discovr Local Proxy Server</h1>
      
      <div class="card">
        <h2>✅ Server Status</h2>
        <p>Local proxy server is <span class="success">running</span> on port ${PORT}</p>
        <p>API endpoint: <code>http://localhost:${PORT}/api/v1</code></p>
      </div>
      
      <div class="card">
        <h2>📱 Connect Your App</h2>
        <p>To use this server with the Discovr app, connect using one of these addresses:</p>
        <ul>
          <li>Local: <code>http://localhost:${PORT}/api/v1</code></li>
          ${ipAddresses.map(ip => `<li>${ip.name}: <code>http://${ip.address}:${PORT}/api/v1</code></li>`).join('\n')}
        </ul>
        <p class="warning">Important: You must change the API URL in your app.</p>
      </div>
      
      <div class="card">
        <h2>🔍 Available Endpoints</h2>
        <ul>
          <li><a href="/api/v1/health">Health Check</a> - <code>/api/v1/health</code></li>
          <li><a href="/api/v1/venues/events/all">All Events</a> - <code>/api/v1/venues/events/all</code></li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 DISCOVR LOCAL PROXY SERVER                             ║
║                                                            ║
║  ✅ Server running at: http://localhost:${PORT}              ║
║  ✅ API endpoint: http://localhost:${PORT}/api/v1            ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📱 TO USE WITH YOUR APP:                                  ║
║  1. Edit your app's DiscovrConfig.swift                    ║
║  2. Change the API URL to: http://localhost:${PORT}         ║
║                                                            ║
║  Open http://localhost:${PORT} in your browser for more info ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  // Connect to MongoDB on startup
  await connectToMongoDB();
  
  // Load events on startup
  const events = await getAllEvents();
  console.log(`📊 Loaded ${events.length} events from database`);
});
