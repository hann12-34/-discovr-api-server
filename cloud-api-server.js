/**
 * Discovr Cloud API Server
 * 
 * Production-ready API server that connects to your MongoDB
 * and serves events to your TestFlight app.
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
// Use environment variable PORT or default to 3000
const PORT = process.env.PORT || 3000;

// MongoDB connection URI (from environment variable)
const MONGODB_URI = process.env.MONGODB_URI;

// Crash if the environment variable is not set
if (!MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Enable CORS
app.use(cors());
app.use(express.json());

// Create MongoDB client
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let eventsCollection = null;
let cachedEvents = null;
let lastFetchTime = null;
let dbConnected = false;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    eventsCollection = db.collection('events');
    dbConnected = true;
    
    const eventsCount = await eventsCollection.countDocuments();
    console.log(`📊 Found ${eventsCount} events in database`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    dbConnected = false;
    return false;
  }
}

// Start MongoDB connection in the background
setTimeout(() => connectToMongoDB(), 100);

// Get all events from MongoDB with caching
async function getAllEvents() {
  if (!dbConnected || !eventsCollection) {
    await connectToMongoDB();
  }
  
  try {
    // Cache events for 5 minutes
    const currentTime = new Date().getTime();
    if (cachedEvents && lastFetchTime && (currentTime - lastFetchTime) < 5 * 60 * 1000) {
      console.log('📋 Returning cached events');
      return cachedEvents;
    }
    
    // Fetch all events from MongoDB
    const events = await eventsCollection.find({}).toArray();
    
    // Format events: ensure each event has an id and venue is an object
    const formattedEvents = events.map(event => {
      // Add id if missing
      if (!event.id && event._id) {
        event.id = event._id.toString();
      }
      
      // Fix venue format: ensure venue is always an object, not a string
      if (typeof event.venue === 'string') {
        const venueName = event.venue;
        event.venue = {
          name: venueName,
          id: venueName.toLowerCase().replace(/[^a-z0-9]/gi, '-'),
          location: event.location || { address: 'Vancouver, BC' }
        };
      } else if (!event.venue) {
        // Handle missing venue
        event.venue = {
          name: 'Unknown Venue',
          id: 'unknown-venue',
          location: event.location || { address: 'Vancouver, BC' }
        };
      }
      
      return event;
    });
    
    // Update cache
    cachedEvents = formattedEvents;
    lastFetchTime = currentTime;
    
    return formattedEvents;
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    throw error;
  }
}

// API Routes

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Discovr Cloud API is healthy',
    timestamp: new Date().toISOString(),
    mongoConnected: dbConnected
  });
});

// Get all events endpoint
app.get('/api/v1/venues/events/all', async (req, res) => {
  console.log('📥 Received request for ALL events');
  
  try {
    const events = await getAllEvents();
    console.log(`📤 Returning ${events.length} events`);
    res.status(200).json({ events: events });
  } catch (error) {
    console.error('❌ Error serving events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Basic root route
app.get('/', (req, res) => {
  res.send('Discovr API Server is running');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server listening on port ${PORT}`);
  console.log(`API base URL: http://0.0.0.0:${PORT}/api/v1`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/v1/health`);
  console.log(`All events: http://0.0.0.0:${PORT}/api/v1/venues/events/all`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});
