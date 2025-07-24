/**
 * Unified Proxy Server for Discovr API
 * 
 * This server runs on port 3030 and provides:
 * 1. Direct access to ALL events from cloud MongoDB
 * 2. No pagination limitations
 * 3. Compatible with the Discovr iOS app
 */

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection URI (must be set in Render environment)
const CLOUD_MONGODB_URI = process.env.MONGODB_URI;

// Crash if the environment variable is not set
if (!CLOUD_MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Use environment variable for port (Render will provide this)
const PORT = process.env.PORT || 3030;

// Admin UI path
const ADMIN_UI_PATH = path.join(__dirname, '../discovr-admin-ui/admin');

// Create MongoDB clients
const cloudClient = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Serve the admin UI, setting all-events-dashboard.html as the default page
app.use('/admin', express.static(path.join(__dirname, 'public'), { index: 'all-events-dashboard.html' }));

// Serve the unified admin interface
app.get('/admin/unified', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-admin.html'));
});

// Add route for featured events admin page
app.get('/admin/featured', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'featured-events-admin.html'));
});

// Serve static files from the 'public' directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Add explicit API endpoint for proxy configuration
app.get('/api/v1/config', (req, res) => {
  // Get client IP address
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`📱 Config requested from: ${clientIp}`);
  
  // Read and serve the proxy-config.json file
  const configPath = path.join(__dirname, 'public', 'proxy-config.json');
  res.sendFile(configPath);
});

// API endpoint for TestFlight detection
app.get('/api/v1/testflight-config', (req, res) => {
  // Get client IP address and user agent
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`📱 TestFlight config requested from: ${clientIp}`);
  console.log(`📱 User agent: ${userAgent}`);
  
  // Send back configuration with Mac's IP address
  res.json({
    apiBaseUrl: `http://10.0.0.249:3030/api/v1`,
    useLocalProxy: true,
    serverType: 'direct',
    macLocalIp: '10.0.0.249',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    // Connect to cloud MongoDB first
    await cloudClient.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    // CRITICAL: Always explicitly specify 'discovr' as the database name
    // This ensures we connect to the correct database regardless of the URI
    const cloudDb = cloudClient.db('discovr');
    console.log(`💾 Using database: ${cloudDb.databaseName}`);
    
    // Check if we have both old and new collection names
    const collections = await cloudDb.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Available collections:', collectionNames);
    
    // Handle the featured events collection name inconsistency
    let featuredEventsCollection;
    
    // Check if both collections exist
    const hasFeaturedEvents = collectionNames.includes('featuredEvents');
    const hasFeatured_events = collectionNames.includes('featured_events');
    
    if (hasFeaturedEvents && hasFeatured_events) {
      console.log('⚠️ Both featuredEvents and featured_events collections exist');
      // Use the new collection name
      featuredEventsCollection = cloudDb.collection('featured_events');
    } else if (hasFeatured_events) {
      console.log('✅ Using featured_events collection');
      featuredEventsCollection = cloudDb.collection('featured_events');
    } else if (hasFeaturedEvents) {
      console.log('⚠️ Using legacy featuredEvents collection');
      featuredEventsCollection = cloudDb.collection('featuredEvents');
    } else {
      console.log('⚠️ No featured events collection found, creating featured_events');
      await cloudDb.createCollection('featured_events');
      featuredEventsCollection = cloudDb.collection('featured_events');
    }
    
    // Initialize the collections with explicit names
    const eventsCollection = cloudDb.collection('events');
    
    console.log('Collection names used:');
    console.log('- events collection: "events"');
    console.log(`- featured events collection: "${featuredEventsCollection.collectionName}"`);
    
    const eventsCount = await eventsCollection.countDocuments();
    console.log(`📊 Found ${eventsCount} events in cloud database`);

    return { 
      cloud: eventsCollection, // This is the correct name used throughout the code
      events: eventsCollection, // Adding an alias for clarity
      featured: featuredEventsCollection
    };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

// Start the server
async function startServer() {
  try {
    // Connect to MongoDB
    const collections = await connectToMongoDB();
    
    // Health check endpoint
    app.get('/api/v1/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        message: 'Direct MongoDB proxy is healthy',
        timestamp: new Date().toISOString()
      });
    });
    
    // Database test endpoint
    app.get('/api/v1/db-test', async (req, res) => {
      try {
        console.log('Testing MongoDB connection...');
        
        // Get database info
        const cloudDb = cloudClient.db('discovr');
        const collectionsInfo = await cloudDb.listCollections().toArray();
        const collectionNames = collectionsInfo.map(col => col.name);
        
        // Get counts
        let eventsCount = 0;
        let featuredCount = 0;
        
        try {
          eventsCount = await collections.cloud.countDocuments();
        } catch (err) {
          console.error('Error counting events:', err);
        }
        
        try {
          featuredCount = await collections.featured.countDocuments();
        } catch (err) {
          console.error('Error counting featured events:', err);
        }
        
        return res.status(200).json({
          dbConnected: true,
          collections: collectionNames,
          collectionsStatus: {
            events: collections.cloud ? 'initialized' : 'not initialized',
            featured_events: collections.featured ? 'initialized' : 'not initialized'
          },
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
    
    // API endpoint to get ALL events (for the Discovr app)
    app.get('/api/v1/venues/events/all', async (req, res) => {
      console.log('📥 Received request for ALL events from cloud MongoDB');
      
      try {
        // Get featured events first
        const featuredEventIds = await collections.featured.find({}).toArray();
        const featuredIds = featuredEventIds.map(fe => fe.eventId);
        
        // Get all events
        let events = await collections.cloud.find({}).toArray();
        
        if (!events || events.length === 0) {
          console.log('⚠️ No events found in database');
          return res.status(404).json({ message: 'No events found' });
        }

        // COMPREHENSIVE DATA NORMALIZATION (APPLIED: 2025-07-23)
        const validatedEvents = events.map(event => {
          const validatedEvent = { ...event };

          // 1. Normalize Venue and Location
          let normalizedVenue = {
            name: 'Unknown Venue',
            id: null,
            location: {
              address: 'Unknown Address',
              coordinates: [0.0, 0.0] // Use 0.0 to satisfy Swift's non-nullable Double requirement
            }
          };

          if (event.venue) {
            if (typeof event.venue === 'string') {
              normalizedVenue.name = event.venue;
            } else if (typeof event.venue === 'object' && event.venue !== null) {
              normalizedVenue.name = event.venue.name || 'Unknown Venue';
              normalizedVenue.id = event.venue.id || null;

              if (typeof event.venue.location === 'string') {
                normalizedVenue.location.address = event.venue.location;
              } else if (typeof event.venue.location === 'object' && event.venue.location !== null) {
                normalizedVenue.location.address = event.venue.location.address || 'Unknown Address';
                let coords = event.venue.location.coordinates;
                if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                  normalizedVenue.location.coordinates = coords;
                }
              }
            }
          } else if (event.location && typeof event.location === 'string') {
            normalizedVenue.location.address = event.location;
          }
          validatedEvent.venue = normalizedVenue;

          // 2. Ensure ID exists
          if (!validatedEvent.id) {
            if (validatedEvent._id) {
              validatedEvent.id = validatedEvent._id.toString();
            } else {
              validatedEvent.id = `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            }
          }

          // 3. Mark as Featured
          const eventId = validatedEvent._id ? validatedEvent._id.toString() : validatedEvent.id;
          validatedEvent.featured = featuredIds.includes(eventId);

          return validatedEvent;
        });
        
        // Sort events to put featured ones first
        validatedEvents.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          
          // For featured events, maintain the order from featuredIds
          if (a.featured && b.featured) {
            const aIndex = featuredIds.indexOf(a._id ? a._id.toString() : a.id);
            const bIndex = featuredIds.indexOf(b._id ? b._id.toString() : b.id);
            return aIndex - bIndex;
          }
          
          // For non-featured events, sort by date
          return new Date(a.startDate || a.date || 0) - new Date(b.startDate || b.date || 0);
        });
        
        console.log(`📤 Returning ${validatedEvents.length} events (${featuredIds.length} featured)`);
        console.log('📝 Formatting response as object with events key to match app expectations');
        res.status(200).json({ events: validatedEvents });
      } catch (error) {
        console.error('❌ Error serving events:', error.message);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });
    
    // Admin UI API endpoints (using local MongoDB)
    app.get('/api/v1/events', async (req, res) => {
      try {
        console.log('GET /api/v1/events - Admin UI request received');
        
        // Get filter parameters
        const venue = req.query.venue;
        const category = req.query.category;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        // Build query
        const query = {};
        
        if (venue) {
          query['venue.name'] = new RegExp(venue, 'i');
        }
        
        if (category) {
          query.category = new RegExp(category, 'i');
        }
        
        if (startDate) {
          query.startDate = { $gte: new Date(startDate) };
        }
        
        if (endDate) {
          query.endDate = { $lte: new Date(endDate) };
        }
        
        // Get events from local database for admin UI
        const events = await collections.cloud.find(query).sort({ startDate: 1 }).toArray();
        console.log(`Found ${events.length} events for admin UI from local database`);
        
        // Format response in the structure expected by the admin dashboard
        res.status(200).json({ events: events });
      } catch (err) {
        console.error('Error fetching events for admin UI:', err);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });
    
    // Get event by ID for admin UI
    app.get('/api/v1/events/:id', async (req, res) => {
      try {
        const event = await collections.cloud.findOne({ id: req.params.id });
        
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }
        
        res.status(200).json(event);
      } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({ error: 'Failed to fetch event' });
      }
    });
    
    // Create a new event
    app.post('/api/v1/events', async (req, res) => {
      try {
        console.log('POST /api/v1/events - Creating new event', req.body);
        
        const newEvent = req.body;
        
        // Validate required fields
        if (!newEvent.name) {
          return res.status(400).json({ error: 'Event name is required' });
        }
        
        // Generate a unique ID if not provided
        if (!newEvent._id) {
          newEvent._id = new require('mongodb').ObjectId();
        }
        
        // Add timestamp for creation
        newEvent.createdAt = new Date();
        newEvent.source = 'admin';
        
        const result = await collections.cloud.insertOne(newEvent);
        
        console.log(`Created event with ID: ${result.insertedId}`);
        res.status(201).json({ 
          success: true, 
          event: newEvent,
          message: 'Event created successfully' 
        });
      } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: 'Failed to create event' });
      }
    });
    
    // Update an event
    app.put('/api/v1/events/:id', async (req, res) => {
      try {
        console.log(`PUT /api/v1/events/${req.params.id} - Updating event`);
        
        const eventId = req.params.id;
        const updates = req.body;
        
        // Add timestamp for update
        updates.updatedAt = new Date();
        
        // Remove _id from updates if present
        delete updates._id;
        
        const result = await collections.cloud.updateOne(
          { _id: new require('mongodb').ObjectId(eventId) },
          { $set: updates }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Event not found' });
        }
        
        console.log(`Updated event with ID: ${eventId}`);
        res.status(200).json({ 
          success: true, 
          message: 'Event updated successfully' 
        });
      } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ error: 'Failed to update event' });
      }
    });
    
    // Delete an event
    app.delete('/api/v1/events/:id', async (req, res) => {
        // Delete an event
        console.log(`DELETE /api/v1/events/${req.params.id} - Deleting event`);
        
        try {
            const result = await collections.cloud.deleteOne({
                _id: new ObjectId(req.params.id)
            });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Event not found' });
            }
            
            // Also remove from featured if it was featured
            await collections.featured.deleteOne({ eventId: req.params.id });
            
            res.json({ success: true, message: 'Event deleted successfully' });
        } catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    // ===== FEATURED EVENTS API ENDPOINTS =====
    
    // Featured events API endpoints
    
    // Initialize featured events collection
    app.post('/api/v1/featured-events/initialize', async (req, res) => {
      try {
        console.log('Attempting to initialize featured_events collection');
        
        // Check if collection exists
        const cloudDb = cloudClient.db('discovr');
        const collectionsInfo = await cloudDb.listCollections().toArray();
        const collectionNames = collectionsInfo.map(c => c.name);
        
        // Check if both collections exist
        const hasFeaturedEvents = collectionNames.includes('featuredEvents');
        const hasFeatured_events = collectionNames.includes('featured_events');
        
        // Create the new collection if it doesn't exist
        if (!hasFeatured_events) {
          console.log('Creating featured_events collection...');
          await cloudDb.createCollection('featured_events');
          console.log('Featured_events collection created successfully');
        } else {
          console.log('Featured_events collection already exists');
        }
        
        // Reinitialize the collection reference
        collections.featured = cloudDb.collection('featured_events');
        
        // Migrate data from old collection if needed
        if (hasFeaturedEvents) {
          const oldCollection = cloudDb.collection('featuredEvents');
          const oldCount = await oldCollection.countDocuments();
          
          if (oldCount > 0) {
            console.log(`Found ${oldCount} documents in old featuredEvents collection, migrating...`);
            
            // Get all documents from old collection
            const oldDocs = await oldCollection.find({}).toArray();
            
            // Check if they exist in the new collection
            for (const doc of oldDocs) {
              const exists = await collections.featured.findOne({ eventId: doc.eventId });
              if (!exists) {
                console.log(`Migrating event ${doc.eventId} to new collection`);
                await collections.featured.insertOne(doc);
              }
            }
          }
        }
        
        // Count documents to verify access
        const count = await collections.featured.countDocuments();
        console.log(`Featured events collection contains ${count} documents`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Featured events collection initialized', 
          count,
          migrated: hasFeaturedEvents
        });
      } catch (error) {
        console.error('Error initializing featured events collection:', error);
        return res.status(500).json({ error: 'Failed to initialize featured events collection', details: error.message });
      }
    });
    
    app.get('/api/v1/featured-events', async (req, res) => {
        console.log('GET /api/v1/featured-events - Getting featured events');
        
        try {
            // Get featured event IDs
            const featuredEventIds = await collections.featured.find({})
                .sort({ order: 1 })
                .toArray();
            
            if (featuredEventIds.length === 0) {
                return res.status(200).json({ events: [] });
            }
            
            // Get the actual events
            const featuredEvents = [];
            
            for (const featuredEvent of featuredEventIds) {
                try {
                    // Try to find by ObjectId first
                    let event = null;
                    
                    try {
                        event = await collections.cloud.findOne({
                            _id: new ObjectId(featuredEvent.eventId)
                        });
                    } catch (err) {
                        // If not a valid ObjectId, try by string id
                        event = await collections.cloud.findOne({
                            id: featuredEvent.eventId
                        });
                    }
                    
                    if (event) {
                        featuredEvents.push(event);
                    }
                } catch (err) {
                    console.error(`Error finding featured event ${featuredEvent.eventId}:`, err);
                }
            }
            
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
            
            // Get current count of featured events
            const featuredCount = await collections.featured.countDocuments();
            
            // Limit to 10 featured events
            if (featuredCount >= 10) {
                return res.status(400).json({ error: 'Maximum of 10 featured events allowed' });
            }
            
            // Add to featured
            await collections.featured.insertOne({
                eventId,
                order: featuredCount + 1,
                addedAt: new Date()
            });
            
            res.status(201).json({ success: true, message: 'Event added to featured' });
        } catch (error) {
            console.error('Error adding event to featured:', error);
            res.status(500).json({ error: 'Failed to add event to featured' });
        }
    });
    
    // Remove an event from featured
    app.delete('/api/v1/featured-events/:id', async (req, res) => {
        console.log(`DELETE /api/v1/featured-events/${req.params.id} - Removing event from featured`);
        
        try {
            const result = await collections.featured.deleteOne({ eventId: req.params.id });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Featured event not found' });
            }
            
            // Reorder remaining featured events
            const remainingFeatured = await collections.featured.find({})
                .sort({ order: 1 })
                .toArray();
            
            for (let i = 0; i < remainingFeatured.length; i++) {
                await collections.featured.updateOne(
                    { _id: remainingFeatured[i]._id },
                    { $set: { order: i + 1 } }
                );
            }
            
            res.status(200).json({ success: true, message: 'Event removed from featured' });
        } catch (error) {
            console.error('Error removing event from featured:', error);
            res.status(500).json({ error: 'Failed to remove event from featured' });
        }
    });
    
    // Update featured events order
    app.put('/api/v1/featured-events/order', async (req, res) => {
        console.log('PUT /api/v1/featured-events/order - Updating featured events order');
        
        try {
            const { eventIds } = req.body;
            
            if (!eventIds || !Array.isArray(eventIds)) {
                return res.status(400).json({ error: 'Event IDs array is required' });
            }
            
            // Update order for each event
            for (let i = 0; i < eventIds.length; i++) {
                await collections.featured.updateOne(
                    { eventId: eventIds[i] },
                    { $set: { order: i + 1 } }
                );
            }
            
            res.status(200).json({ success: true, message: 'Featured events order updated' });
        } catch (error) {
            console.error('Error updating featured events order:', error);
            res.status(500).json({ error: 'Failed to update featured events order' });
        }
    });
    
    // Clear all featured events
    app.delete('/api/v1/featured-events', async (req, res) => {
        console.log('DELETE /api/v1/featured-events - Clearing all featured events');
        
        try {
            await collections.featured.deleteMany({});
            
            res.status(200).json({ success: true, message: 'All featured events cleared' });
        } catch (error) {
            console.error('Error clearing featured events:', error);
            res.status(500).json({ error: 'Failed to clear featured events' });
        }
    });
    
    // ===== SCRAPER ENDPOINTS =====
    
    // Run all scrapers
    app.get('/api/v1/scrapers/all', async (req, res) => {
        console.log('GET /api/v1/scrapers/all - Running all scrapers');
        
        try {
            // Import commodore scraper
            const commodoreScraper = require('./scrapers/commodore-scraper');
            
            // Start scrapers in parallel for better performance
            const [roxyEvents, commodoreEvents] = await Promise.all([
                roxyScraper.scrape(),
                commodoreScraper.scrape()
            ]);
            
            // Transform Roxy events to match the expected format
            const transformedRoxyEvents = roxyEvents.map(event => {
                // Parse date string to create a proper date object
                const dateMatch = event.date.match(/([A-Z]+)\s+(\d{1,2})/i);
                let startDate = null;
                
                if (dateMatch) {
                    const month = dateMatch[1];
                    const day = parseInt(dateMatch[2]);
                    const now = new Date();
                    const year = now.getFullYear();
                    
                    // Convert month name to month index
                    const monthIndex = new Date(Date.parse(month + " 1, 2000")).getMonth();
                    startDate = new Date(year, monthIndex, day);
                    
                    // If the date is in the past, assume it's for next year
                    if (startDate < now && startDate.getMonth() < now.getMonth()) {
                        startDate.setFullYear(year + 1);
                    }
                }
                
                return {
                    name: event.title,
                    venue: {
                        name: 'The Roxy',
                        address: '932 Granville St, Vancouver, BC V6Z 1L2'
                    },
                    price: event.price || 'TBA',
                    startDate: startDate ? startDate.toISOString() : null,
                    sourceUrl: event.url,
                    source: 'roxy-scraper'
                };
            });
            
            // Save events to MongoDB
            const roxyResult = transformedRoxyEvents.length > 0 ? 
                await saveEvents(transformedRoxyEvents) : 
                { success: false, message: 'No Roxy events found' };
                
            const commodoreResult = commodoreEvents.length > 0 ? 
                await saveEvents(commodoreEvents) : 
                { success: false, message: 'No Commodore events found' };
            
            const totalEvents = transformedRoxyEvents.length + commodoreEvents.length;
            
            res.json({
                success: true,
                message: `Scraped ${totalEvents} events from all venues`,
                results: {
                    roxy: {
                        eventsFound: transformedRoxyEvents.length,
                        ...roxyResult
                    },
                    commodore: {
                        eventsFound: commodoreEvents.length,
                        ...commodoreResult
                    }
                }
            });
        } catch (error) {
            console.error('Error running all scrapers:', error);
            res.status(500).json({ error: 'Error running scrapers', details: error.message });
        }
    });
    
    // Run Roxy Theatre scraper
    app.get('/api/v1/scrapers/roxy', async (req, res) => {
        console.log('GET /api/v1/scrapers/roxy - Running Roxy Theatre scraper');
        
        try {
            const events = await roxyScraper.scrape();
            
            if (events.length === 0) {
                return res.json({ success: false, message: 'No Roxy events found' });
            }
            
            // Transform Roxy events to match the expected format
            const transformedEvents = events.map(event => {
                // Parse date string to create a proper date object
                const dateMatch = event.date.match(/([A-Z]+)\s+(\d{1,2})/i);
                let startDate = null;
                
                if (dateMatch) {
                    const month = dateMatch[1];
                    const day = parseInt(dateMatch[2]);
                    const now = new Date();
                    const year = now.getFullYear();
                    
                    // Convert month name to month index
                    const monthIndex = new Date(Date.parse(month + " 1, 2000")).getMonth();
                    startDate = new Date(year, monthIndex, day);
                    
                    // If the date is in the past, assume it's for next year
                    if (startDate < now && startDate.getMonth() < now.getMonth()) {
                        startDate.setFullYear(year + 1);
                    }
                }
                
                return {
                    name: event.title,
                    venue: {
                        name: 'The Roxy',
                        address: '932 Granville St, Vancouver, BC V6Z 1L2'
                    },
                    price: event.price || 'TBA',
                    startDate: startDate ? startDate.toISOString() : null,
                    sourceUrl: event.url,
                    source: 'roxy-scraper'
                };
            });
            
            const result = await saveEvents(transformedEvents);
            res.json({
                success: true,
                message: `Scraped ${events.length} events from Roxy Theatre`,
                eventsFound: events.length,
                ...result
            });
        } catch (error) {
            console.error('Error running Roxy scraper:', error);
            res.status(500).json({ error: 'Error running Roxy scraper', details: error.message });
        }
    });
    
    // Run Commodore Ballroom scraper
    app.get('/api/v1/scrapers/commodore', async (req, res) => {
        console.log('GET /api/v1/scrapers/commodore - Running Commodore Ballroom scraper');
        
        try {
            const events = await scrapeCommodore();
            
            if (events.length === 0) {
                return res.json({ success: false, message: 'No Commodore events found' });
            }
            
            const result = await saveEvents(events);
            res.json({
                success: true,
                message: `Scraped ${events.length} events from Commodore Ballroom`,
                eventsFound: events.length,
                ...result
            });
        } catch (error) {
            console.error('Error running Commodore scraper:', error);
            res.status(500).json({ error: 'Error running Commodore scraper', details: error.message });
        }
    });
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 UNIFIED PROXY SERVER RUNNING ON PORT ${PORT}            ║
║                                                           ║
║  ✅ Direct MongoDB Connection                             ║
║  ✅ All Events (117+) Available                            ║
║  ✅ No Pagination Limits                                  ║
║                                                           ║
║  API Endpoints:                                           ║
║  • http://localhost:${PORT}/api/v1/venues/events/all       ║
║  • http://localhost:${PORT}/api/v1/health                  ║
║                                                           ║
║  Admin UI:                                                ║
║  • http://localhost:${PORT}/admin                          ║
║                                                           ║
║  TO USE IN YOUR APP:                                      ║
║  1. Modify DiscovrConfig.swift:                           ║
║     • useProxyAPI = true                                  ║
║     • proxyAPIBaseURL = "http://localhost:${PORT}"         ║
║                                                           ║
║  2. Rebuild and launch the app                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await cloudClient.close();

  process.exit(0);
});

// Save events to MongoDB
async function saveEvents(events) {
  if (!events || !Array.isArray(events) || events.length === 0) {
    return { savedCount: 0 };
  }

  try {
    // Access the MongoDB client directly - this ensures we have the right reference
    const db = cloudClient.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Track how many new events we add
    let newEventCount = 0;
    
    // Process events one by one to check for duplicates
    for (const event of events) {
      // Check if this event already exists (by name and venue)
      const existingEvent = await eventsCollection.findOne({
        name: event.name,
        'venue.name': event.venue.name
      });
      
      if (!existingEvent) {
        // This is a new event, so add it
        await eventsCollection.insertOne({
          ...event,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        newEventCount++;
      }
    }
    
    console.log(`✅ Saved ${newEventCount} new events to MongoDB`);
    return { savedCount: newEventCount };
  } catch (error) {
    console.error('❌ Error saving events to MongoDB:', error.message);
    return { savedCount: 0, error: error.message };
  }
}

// Start the server
startServer().catch(console.error);
