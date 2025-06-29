/**
 * App Connection Checker
 * 
 * This script injects a special response to verify if the app is actually using the proxy.
 * It adds an extra field to prove the data is coming from the proxy.
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');

// Create Express app
const app = express();
const PORT = 3051;
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Track requests
let requestCount = 0;

// Log all requests
app.use((req, res, next) => {
  requestCount++;
  const currentTime = new Date().toISOString();
  console.log(`\n[${'='.repeat(30)}]`);
  console.log(`[${currentTime}] REQUEST #${requestCount}: ${req.method} ${req.path}`);
  console.log(`[${'='.repeat(30)}]`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Create a MongoDB client
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB
async function getEvents() {
  try {
    await client.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Get all events
    const events = await eventsCollection.find({}).toArray();
    console.log(`📊 Found ${events.length} events in cloud database`);
    
    return events;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return [];
  }
}

// Handle health endpoint
app.get('/api/v1/health', (req, res) => {
  console.log('Health check - responding with proxy indicator');
  res.json({ 
    status: 'ok',
    source: '*** PROXY SERVER ***',
    timestamp: new Date().toISOString(),
    message: 'If you see this in your app, it means your app is using the proxy!'
  });
});

// Handle events endpoint
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('🔍 Events request received - adding proxy indicator to events');
  
  try {
    // Get events from MongoDB
    const events = await getEvents();
    
    // Add a proxy indicator to each event
    const taggedEvents = events.map(event => ({
      ...event,
      _proxySource: 'This event came through the proxy server',
      _proxyTimestamp: new Date().toISOString(),
      // Important: Make the title clearly show it's from proxy
      title: event.title + ' [PROXY]',
    }));
    
    console.log(`📤 Returning ${taggedEvents.length} modified events from proxy`);
    res.json(taggedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

// Serve a test page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Proxy Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Discovr Proxy Test Server</h1>
        <p>This server is running at http://localhost:${PORT}</p>
        <p>Request count: ${requestCount}</p>
        <p>Test the API endpoints:</p>
        <ul>
          <li><a href="/api/v1/health" target="_blank">Health Check</a></li>
          <li><a href="/api/v1/venues/events/all" target="_blank">All Events (with proxy tags)</a></li>
        </ul>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Make sure your app is configured to use <code>http://localhost:${PORT}</code></li>
          <li>Run your app</li>
          <li>If you see events with "[PROXY]" in the title, your app is using the proxy!</li>
        </ol>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📢 PROXY TEST SERVER RUNNING AT http://localhost:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log('This server will add "[PROXY]" to event titles coming through it');
  console.log('If you see "[PROXY]" in your app event titles, your app is using the proxy!');
  console.log('\n🌐 Available endpoints:');
  console.log(`- Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`- Events (tagged): http://localhost:${PORT}/api/v1/venues/events/all`);
  console.log(`- Test page: http://localhost:${PORT}/`);
});
