/**
 * Discovr Cloud API Server
 * 
 * Production-ready API server that connects to your MongoDB
 * and serves events to your TestFlight app.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

// Serve static files from the public directory
app.use('/admin', express.static(path.join(__dirname, 'public'), { index: 'all-events-dashboard.html' }));

// Serve the unified admin interface
app.get('/admin/unified', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-admin.html'));
});

// Add route for featured events admin page
app.get('/admin/featured', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'featured-events-admin.html'));
});

// Create MongoDB client
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let eventsCollection = null;
let featuredCollection = null;
let cachedEvents = null;
let lastFetchTime = null;
let dbConnected = false;
let collections = {}; // Store all collections

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    console.log('Getting database reference...');
    const db = client.db('discovr');
    
    // Initialize collections
    console.log('Initializing collections...');
    eventsCollection = db.collection('events');
    console.log('Events collection initialized');
    
    // IMPORTANT: The collection name in MongoDB is 'featured_events'
    featuredCollection = db.collection('featured_events');
    console.log('Featured events collection initialized');
    
    // Store collections in the collections object for easier access
    collections = {
      cloud: eventsCollection,
      featured: featuredCollection
    };
    console.log('Collections mapped:', Object.keys(collections));
    
    dbConnected = true;
    
    // Check if collections are accessible
    try {
      const eventsCount = await eventsCollection.countDocuments();
      console.log(`📊 Found ${eventsCount} events in database`);
    } catch (err) {
      console.error('Error counting events:', err);
    }
    
    try {
      const featuredCount = await featuredCollection.countDocuments();
      console.log(`📊 Found ${featuredCount} featured events in database`);
    } catch (err) {
      console.error('Error counting featured events:', err);
    }
    
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

// ===== FEATURED EVENTS API ENDPOINTS =====

// Get all featured events
app.get('/api/v1/featured-events', async (req, res) => {
  console.log('GET /api/v1/featured-events - Getting featured events');
  
  try {
    if (!dbConnected) {
      console.log('Database not connected, attempting to connect...');
      await connectToMongoDB();
    }
    
    console.log('Collections available:', Object.keys(collections));
    
    // Check if featured collection exists
    if (!collections.featured) {
      console.error('Featured collection is not initialized!');
      return res.status(500).json({ error: 'Featured collection not initialized', events: [] });
    }
    
    console.log('Attempting to query featured_events collection...');
    
    // Get featured event IDs
    const featuredEventIds = await collections.featured.find({}).sort({ order: 1 }).toArray();
    console.log(`Found ${featuredEventIds.length} featured event IDs:`, featuredEventIds);
    
    if (featuredEventIds.length === 0) {
      console.log('No featured events found, returning empty array');
      return res.status(200).json({ events: [] });
    }
    
    // Check if cloud collection exists
    if (!collections.cloud) {
      console.error('Cloud collection is not initialized!');
      return res.status(500).json({ error: 'Cloud collection not initialized', events: [] });
    }
    
    // Get the actual events
    const featuredEvents = [];
    console.log('Fetching individual featured events...');
    
    for (const featuredEvent of featuredEventIds) {
      try {
        console.log(`Looking up event with ID: ${featuredEvent.eventId}`);
        // Try to find by ObjectId first
        let event = null;
        
        try {
          event = await collections.cloud.findOne({
            _id: new ObjectId(featuredEvent.eventId)
          });
          if (event) {
            console.log(`Found event by ObjectId: ${event.title || 'Untitled'}`);
          }
        } catch (err) {
          console.log(`Not a valid ObjectId or other error: ${err.message}, trying string ID lookup`);
          // If not a valid ObjectId, try by string id
          event = await collections.cloud.findOne({
            id: featuredEvent.eventId
          });
          if (event) {
            console.log(`Found event by string id: ${event.title || 'Untitled'}`);
          }
        }
        
        if (event) {
          featuredEvents.push(event);
        } else {
          console.log(`No event found with ID: ${featuredEvent.eventId}`);
        }
      } catch (err) {
        console.error(`Error finding featured event ${featuredEvent.eventId}:`, err);
      }
    }
    
    console.log(`Returning ${featuredEvents.length} featured events`);
    res.status(200).json({ events: featuredEvents });
  } catch (error) {
    console.error('Error getting featured events:', error);
    res.status(500).json({ error: 'Failed to get featured events' });
  }
});

// Add an event to featured
app.post('/api/v1/featured-events', async (req, res) => {
  console.log('POST /api/v1/featured-events - Adding event to featured');
  
  try {
    if (!dbConnected) {
      await connectToMongoDB();
    }
    
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    // Check if event exists
    let event = null;
    
    try {
      event = await collections.cloud.findOne({
        _id: new ObjectId(eventId)
      });
    } catch (err) {
      // If not a valid ObjectId, try by string id
      event = await collections.cloud.findOne({
        id: eventId
      });
    }
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if already featured
    const existingFeatured = await collections.featured.findOne({ eventId });
    
    if (existingFeatured) {
      return res.status(400).json({ error: 'Event is already featured' });
    }
    
    // Get current max order
    const maxOrderResult = await collections.featured.find().sort({ order: -1 }).limit(1).toArray();
    const nextOrder = maxOrderResult.length > 0 ? maxOrderResult[0].order + 1 : 0;
    
    // Add to featured
    await collections.featured.insertOne({
      eventId,
      order: nextOrder,
      addedAt: new Date()
    });
    
    res.status(201).json({ message: 'Event added to featured' });
  } catch (error) {
    console.error('Error adding event to featured:', error);
    res.status(500).json({ error: 'Failed to add event to featured' });
  }
});

// Remove an event from featured
app.delete('/api/v1/featured-events', async (req, res) => {
  console.log('DELETE /api/v1/featured-events - Removing event from featured');
  
  try {
    if (!dbConnected) {
      await connectToMongoDB();
    }
    
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    // Remove from featured
    const result = await collections.featured.deleteOne({ eventId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Event not found in featured events' });
    }
    
    // Reorder remaining featured events
    const remainingFeatured = await collections.featured.find().sort({ order: 1 }).toArray();
    
    for (let i = 0; i < remainingFeatured.length; i++) {
      await collections.featured.updateOne(
        { _id: remainingFeatured[i]._id },
        { $set: { order: i } }
      );
    }
    
    res.status(200).json({ message: 'Event removed from featured' });
  } catch (error) {
    console.error('Error removing event from featured:', error);
    res.status(500).json({ error: 'Failed to remove event from featured' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server listening on port ${PORT}`);
  console.log(`API base URL: http://0.0.0.0:${PORT}/api/v1`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/v1/health`);
  console.log(`All events: http://0.0.0.0:${PORT}/api/v1/venues/events/all`);
  console.log(`Featured events: http://0.0.0.0:${PORT}/api/v1/featured-events`);
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
