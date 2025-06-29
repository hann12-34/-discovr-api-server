// Import Fortune Sound Club events to MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection string - using the exact credentials from the project
const MONGODB_URI = "mongodb+srv://materaccount:materaccount123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Fortune Sound events file path
const EVENTS_FILE_PATH = path.join(__dirname, 'Scrapers', 'FortuneSound', 'fortune_events.json');
const DATABASE_NAME = 'Discovr';
const COLLECTION_NAME = 'events';

// Define Event schema (simplified version that matches your API model)
const eventSchema = new mongoose.Schema({
  id: String,
  name: String,
  title: String,
  description: String,
  image: String,
  date: String,
  startDate: Date,
  endDate: Date,
  season: String,
  category: String,
  categories: [String],
  location: String,
  venue: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  sourceURL: String,
  officialWebsite: String,
  ticketURL: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  strict: false, // Allow additional fields
  timestamps: { 
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Create the Event model
const Event = mongoose.model('Event', eventSchema);

async function importEvents() {
  try {
    console.log(`🔄 Connecting to MongoDB at ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}...`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: DATABASE_NAME
    });
    console.log('✅ Connected to MongoDB');
    
    // Read the events file
    console.log(`📂 Reading events from ${EVENTS_FILE_PATH}`);
    const eventsData = fs.readFileSync(EVENTS_FILE_PATH, 'utf8');
    const events = JSON.parse(eventsData);
    
    console.log(`📊 Found ${events.length} Fortune Sound Club events to import`);
    
    // Import each event
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const event of events) {
      try {
        // Check if event already exists (by ID or similar title + date)
        const query = {
          $or: [
            { id: event.id },
            { 
              name: event.name,
              startDate: event.startDate
            }
          ]
        };
        
        const existingEvent = await Event.findOne(query);
        
        if (existingEvent) {
          // Update existing event
          const result = await Event.updateOne(
            { _id: existingEvent._id },
            { 
              ...event,
              lastUpdated: new Date()
            }
          );
          
          if (result.modifiedCount > 0) {
            updatedCount++;
          }
        } else {
          // Create new event
          const newEvent = new Event({
            ...event,
            lastUpdated: new Date()
          });
          
          await newEvent.save();
          createdCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing event "${event.name}":`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n✅ Import completed:');
    console.log(`Created: ${createdCount} new events`);
    console.log(`Updated: ${updatedCount} existing events`);
    console.log(`Errors: ${errorCount} events`);
    
    // Verify total count in database
    const totalEvents = await Event.countDocuments();
    console.log(`Total events in database: ${totalEvents}`);
    
    // List the most recent Fortune Sound Club events
    console.log('\n🎵 Most recent Fortune Sound Club events:');
    const recentEvents = await Event.find({ 
      venue: { 
        $elemMatch: { 
          name: { $regex: /fortune sound/i } 
        }
      }
    }).sort({ startDate: -1 }).limit(5);
    
    recentEvents.forEach((e, i) => {
      console.log(`${i+1}. ${e.name} - ${new Date(e.startDate).toDateString()}`);
    });
    
  } catch (err) {
    console.error('❌ Error importing events:', err);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔄 MongoDB connection closed');
  }
}

// Run the import
importEvents().catch(console.error);
