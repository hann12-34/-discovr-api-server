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

// Enhanced CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS preflight requests
app.options('*', cors());

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

// Create a new event
app.post('/api/v1/events', async (req, res) => {
  try {
    console.log('POST /api/v1/events - Creating new event', req.body);
    
    if (!dbConnected) {
      await connectToMongoDB();
    }
    
    const newEvent = req.body;
    
    // Validate required fields
    if (!newEvent.name) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    
    // Add _id if missing
    if (!newEvent._id) {
      newEvent._id = new ObjectId();
    }
    
    // Add timestamps and source info
    newEvent.createdAt = new Date();
    newEvent.source = 'admin';
    
    // Check if cloud collection exists
    if (!collections.cloud) {
      console.error('Cloud collection is not initialized!');
      return res.status(500).json({ error: 'Cloud collection not initialized' });
    }
    
    // Insert event into database
    const result = await collections.cloud.insertOne(newEvent);
    console.log(`Created event with ID: ${result.insertedId}`);
    
    // Return success response
    res.status(201).json({ 
      success: true, 
      event: newEvent, 
      message: 'Event created successfully' 
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Discovr Cloud API is healthy',
    timestamp: new Date().toISOString(),
    mongoConnected: dbConnected
  });
});

// MongoDB test endpoint
app.get('/api/v1/db-test', async (req, res) => {
  try {
    console.log('Testing MongoDB connection...');
    
    if (!dbConnected) {
      console.log('Database not connected, attempting to connect...');
      await connectToMongoDB();
    }
    
    if (!dbConnected) {
      return res.status(500).json({ error: 'Failed to connect to database' });
    }
    
    // Get database info
    const db = client.db('discovr');
    const collectionsInfo = await db.listCollections().toArray();
    const collectionNames = collectionsInfo.map(col => col.name);
    
    // Check if our collections are properly initialized
    const collectionsStatus = {
      events: collections.cloud ? 'initialized' : 'not initialized',
      featured_events: collections.featured ? 'initialized' : 'not initialized'
    };
    
    // Get counts
    let eventsCount = 0;
    let featuredCount = 0;
    
    try {
      if (collections.cloud) {
        eventsCount = await collections.cloud.countDocuments();
      }
    } catch (err) {
      console.error('Error counting events:', err);
    }
    
    try {
      if (collections.featured) {
        featuredCount = await collections.featured.countDocuments();
      }
    } catch (err) {
      console.error('Error counting featured events:', err);
    }
    
    return res.status(200).json({
      dbConnected,
      collections: collectionNames,
      collectionsStatus,
      counts: {
        events: eventsCount,
        featured: featuredCount
      }
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    return res.status(500).json({ error: 'Database test failed', details: error.message });
  }
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

// Initialize featured events collection
app.post('/api/v1/featured-events/initialize', async (req, res) => {
  try {
    console.log('Attempting to initialize featured_events collection');
    
    if (!dbConnected) {
      console.log('Database not connected, attempting to connect...');
      await connectToMongoDB();
    }
    
    if (!dbConnected) {
      return res.status(500).json({ error: 'Failed to connect to database' });
    }
    
    // Check if collection exists
    const db = client.db('discovr');
    const collections = await db.listCollections({ name: 'featured_events' }).toArray();
    
    // Check if the old collection name exists
    const oldCollections = await db.listCollections({ name: 'featuredEvents' }).toArray();
    const hasOldCollection = oldCollections.length > 0;
    console.log('Old collection exists:', hasOldCollection);
    
    if (collections.length === 0) {
      console.log('Creating featured_events collection...');
      await db.createCollection('featured_events');
      
      // Migrate data from old collection if it exists
      if (hasOldCollection) {
        console.log('Migrating data from featuredEvents to featured_events...');
        const oldCollection = db.collection('featuredEvents');
        const oldDocs = await oldCollection.find({}).toArray();
        
        if (oldDocs.length > 0) {
          console.log(`Found ${oldDocs.length} documents in old collection to migrate`);
          const featCollection = db.collection('featured_events');
          
          for (const doc of oldDocs) {
            // Check if document already exists in new collection
            const exists = await featCollection.findOne({ eventId: doc.eventId });
            if (!exists) {
              await featCollection.insertOne(doc);
              console.log(`Migrated document with eventId: ${doc.eventId}`);
            }
          }
        }
      }
      console.log('Featured_events collection created successfully');
    } else {
      console.log('Featured_events collection already exists');
    }
    
    // Ensure the collection is properly initialized in our app
    featuredCollection = db.collection('featured_events');
    collections.featured = featuredCollection;
    
    // Count documents to verify access
    const count = await featuredCollection.countDocuments();
    console.log(`Featured events collection contains ${count} documents`);
    
    return res.status(200).json({ success: true, message: 'Featured events collection initialized', count });
  } catch (error) {
    console.error('Error initializing featured events collection:', error);
    return res.status(500).json({ error: 'Failed to initialize featured events collection', details: error.message });
  }
});

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
    
    console.log(`Successfully added event ${eventId} to featured events collection`);
    res.status(200).json({ success: true, message: 'Event added to featured' });
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
