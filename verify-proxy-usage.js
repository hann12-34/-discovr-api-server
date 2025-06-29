/**
 * Verify if the app is actually connecting to the proxy
 * This script monitors proxy server requests to determine if your app is connecting
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const axios = require('axios');

// MongoDB connection URI
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Create Express app
const app = express();
const PORT = 3051; // Different port than the main proxy

// Enable CORS
app.use(cors());
app.use(express.json());

// Create a MongoDB client
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Log each request to see if the app is connecting
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📥 REQUEST: ${req.method} ${req.originalUrl}`);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  
  // Add special logging for the response
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${timestamp}] 📤 RESPONSE: ${res.statusCode}`);
    if (typeof body === 'string' && body.length < 100) {
      console.log('📄 Body:', body);
    } else {
      console.log('📄 Body length:', typeof body === 'string' ? body.length : 'not a string');
    }
    
    return originalSend.call(this, body);
  };
  
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

// Test routes
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', source: 'testing-proxy' });
});

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
    
    // Return events as an array
    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Testing Proxy running on http://localhost:${PORT}`);
  console.log(`📡 Test API endpoint: http://localhost:${PORT}/api/v1/venues/events/all`);
  
  // Check if the original proxy is running
  try {
    console.log('🧪 Testing connection to your original proxy...');
    const response = await axios.get('http://localhost:3050/api/v1/health');
    console.log(`✅ Original proxy is running: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error('❌ Original proxy does not appear to be running:', error.message);
  }
  
  console.log('\n📱 INSTRUCTIONS:');
  console.log('1. Update DiscovrConfig.swift to use port 3051:');
  console.log('   static let proxyAPIBaseURL = "http://localhost:3051"');
  console.log('2. Run your app');
  console.log('3. Check console output to verify if your app connects to this test proxy');
});
