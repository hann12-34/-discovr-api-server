/**
 * Intercepting HTTPS Proxy
 * 
 * This server listens on a non-privileged port (8443) and intercepts
 * all cloud API requests, returning the full set of events.
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";
const PORT = 8443;

// Create MongoDB client
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let eventsCollection = null;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    const db = client.db('discovr');
    eventsCollection = db.collection('events');
    
    const eventsCount = await eventsCollection.countDocuments();
    console.log(`📊 Found ${eventsCount} events in cloud database`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

// Track and log requests
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  console.log(`\n[${requestCount}] ${req.method} ${req.path}`);
  next();
});

// Handle the events endpoint specifically
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('🎯 Intercepted request for events - returning ALL events from MongoDB');
  
  try {
    if (!eventsCollection) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(500).json({ error: 'Database connection failed' });
      }
    }
    
    // Get all events without pagination
    const events = await eventsCollection.find({}).toArray();
    console.log(`🚀 Successfully returning ${events.length} events`);
    
    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Proxy all other API requests to the cloud API
const apiProxy = createProxyMiddleware({
  target: 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app',
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying to: ${req.method} ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Proxy response: ${proxyRes.statusCode}`);
  }
});

// Use the proxy for all other requests
app.use('/api/v1', (req, res, next) => {
  if (req.path === '/venues/events/all') {
    // Skip proxy for the events endpoint we handle directly
    next();
  } else {
    apiProxy(req, res, next);
  }
});

// Serve a simple test page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Discovr API Proxy</title></head>
      <style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}</style>
      <body>
        <h1>✅ Discovr API Proxy Running</h1>
        <p>Proxy server is running on port ${PORT}</p>
        <p>Request count: ${requestCount}</p>
        <h2>Instructions</h2>
        <p>Configure your iOS Network Proxy in Settings:</p>
        <ol>
          <li>Open Settings on your iOS device</li>
          <li>Go to Wi-Fi</li>
          <li>Tap the (i) icon next to your Wi-Fi network</li>
          <li>Scroll down to "Configure Proxy" and tap "Manual"</li>
          <li>Set Server to your Mac's IP address</li>
          <li>Set Port to ${PORT}</li>
          <li>Leave Authentication OFF</li>
          <li>Tap "Save"</li>
        </ol>
        <p>Once configured, your app will use this proxy and show all 117 events!</p>
      </body>
    </html>
  `);
});

// Start the server and connect to MongoDB
app.listen(PORT, async () => {
  console.log(`
🚀 Intercepting proxy running on http://localhost:${PORT}
📱 To use with your app:

1. Configure your iOS Network Proxy in Settings:
   - Go to Wi-Fi > Your Network > Configure Proxy > Manual
   - Enter your computer's IP address and port ${PORT}
   - Leave Authentication OFF
   - Tap Save

2. Run the Discovr app - it will now show all 117 events!

3. Visit http://localhost:${PORT} for instructions
`);

  // Connect to MongoDB
  connectToMongoDB();
});
