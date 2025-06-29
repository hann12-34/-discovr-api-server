/**
 * Discovr Proxy API Server
 * 
 * This server connects directly to the cloud MongoDB and provides
 * a local API that returns all events without pagination limits.
 * It serves as a drop-in replacement for the cloud API.
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection URI
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Create Express app
const app = express();
const PORT = process.env.PORT || 3050;

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

// Database connection state
let dbConnected = false;
let eventsCollection = null;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    const db = client.db('discovr');
    eventsCollection = db.collection('events');
    dbConnected = true;
    
    // Get count of events
    const eventsCount = await eventsCollection.countDocuments();
    console.log(`📊 Found ${eventsCount} events in cloud database`);
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    dbConnected = false;
  }
}

// API health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbConnected });
});

// Get all events endpoint
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('📥 Received request for all events');
  
  try {
    if (!dbConnected) {
      // Try to reconnect if disconnected
      await connectToMongoDB();
      if (!dbConnected) {
        return res.status(500).json({ error: 'Database connection is not available' });
      }
    }
    
    // Get all events without any limit
    const events = await eventsCollection.find({}).toArray();
    console.log(`📤 Returning ${events.length} events`);
    
    // Return events as an array (same format as cloud API)
    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get events by venue endpoint
app.get('/api/v1/venues/:venueId/events', async (req, res) => {
  const { venueId } = req.params;
  console.log(`📥 Received request for events from venue: ${venueId}`);
  
  try {
    if (!dbConnected) {
      await connectToMongoDB();
      if (!dbConnected) {
        return res.status(500).json({ error: 'Database connection is not available' });
      }
    }
    
    // Find events by venue ID
    const events = await eventsCollection.find({
      'venue.id': venueId
    }).toArray();
    
    console.log(`📤 Returning ${events.length} events for venue ${venueId}`);
    res.status(200).json(events);
  } catch (error) {
    console.error(`❌ Error fetching events for venue ${venueId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch events for venue' });
  }
});

// Add more endpoints as needed to match the cloud API

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Proxy API Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/v1/venues/events/all`);
  
  // Connect to MongoDB on startup
  await connectToMongoDB();
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});
