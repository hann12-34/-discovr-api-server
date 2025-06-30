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
const roxyScraper = require('./scrapers/roxy-scraper');
const { scrapeCommodore } = require('./scrapers/commodore-scraper');

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
    
    const cloudEventsCollection = cloudDb.collection('events');
    
    const cloudEventsCount = await cloudEventsCollection.countDocuments();
    console.log(`📊 Found ${cloudEventsCount} events in cloud database`);

    return { cloud: cloudEventsCollection };
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
    
    // API endpoint to get ALL events (for the Discovr app)
    app.get('/api/v1/venues/events/all', async (req, res) => {
      console.log('📥 Received request for ALL events from cloud MongoDB');
      
      try {
        const events = await collections.cloud.find({}).toArray();
        console.log(`📤 Returning ${events.length} events from cloud MongoDB`);
        
        // Based on the app logs showing:
        // "📊 Response is a direct array with 28 items"
        // This shows the app expects a direct array, not an object with a data property
        console.log('📝 Formatting response as direct array to match app expectations');
        res.status(200).json(events);
      } catch (error) {
        console.error('❌ Error fetching cloud events:', error.message);
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
            
            res.json({ success: true, message: 'Event deleted successfully' });
        } catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    // ===== SCRAPER ENDPOINTS =====
    
    // Run all scrapers
    app.get('/api/v1/scrapers/all', async (req, res) => {
        console.log('GET /api/v1/scrapers/all - Running all scrapers');
        
        try {
            // Start scrapers in parallel for better performance
            const [roxyEvents, commodoreEvents] = await Promise.all([
                roxyScraper.scrape(),
                scrapeCommodore()
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
    const eventsCollection = cloudDb.collection('events');
    
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
