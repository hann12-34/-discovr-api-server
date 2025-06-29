/**
 * Direct Proxy Server
 * 
 * This server intercepts requests to the cloud API URL and returns all events.
 * No app code changes required - just runs locally and overrides the cloud API.
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const axios = require('axios');
const http = require('http');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Cloud API details - we'll intercept these
const CLOUD_HOST = 'discovr-api-test-531591199325.northamerica-northeast2.run.app';
const PORT = 80;

// Create a MongoDB client
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let eventsCollection = null;

// Connect to MongoDB on startup
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

// Track requests
let requestCount = 0;

// Log all requests
app.use((req, res, next) => {
  requestCount++;
  console.log(`\n[REQUEST ${requestCount}] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Handle the main events endpoint
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('🎯 Intercepted request for events - returning ALL events');
  
  try {
    if (!eventsCollection) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(500).json({ error: 'Database connection failed' });
      }
    }
    
    // Get all events without any limit
    const events = await eventsCollection.find({}).toArray();
    console.log(`✅ Successfully returning ${events.length} events`);
    
    // Return all events
    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Proxy all other requests to the original cloud API
app.all('*', async (req, res) => {
  const originalUrl = `https://${CLOUD_HOST}${req.originalUrl}`;
  console.log(`🔄 Proxying request to: ${originalUrl}`);
  
  try {
    const response = await axios({
      method: req.method,
      url: originalUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: CLOUD_HOST
      },
      responseType: 'arraybuffer'
    });
    
    // Copy headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Send response
    res.status(response.status).send(response.data);
    console.log(`✅ Proxy response: Status ${response.status}`);
  } catch (error) {
    console.error(`❌ Proxy error: ${error.message}`);
    res.status(error.response?.status || 500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

// Start the server
http.createServer(app).listen(PORT, () => {
  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                    ┃
┃  🚀 DIRECT PROXY SERVER RUNNING                    ┃
┃                                                    ┃
┃  🔑 NEXT STEP:                                     ┃
┃  You need to edit your hosts file to redirect      ┃
┃  the cloud API to your local machine.              ┃
┃                                                    ┃
┃  Run this command in a new terminal:               ┃
┃  sudo sh -c 'echo "127.0.0.1 discovr-api-test-531591199325.northamerica-northeast2.run.app" >> /etc/hosts' ┃
┃                                                    ┃
┃  Then run your app - it will automatically use     ┃
┃  this proxy and show ALL events!                   ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);

  // Connect to MongoDB
  connectToMongoDB();
});
