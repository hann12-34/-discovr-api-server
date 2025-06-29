/**
 * Test script for Fox Cabaret scraper
 * Run with: node test-fox-cabaret-scraper.js
 * Optional: Add --save flag to save events to MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const foxCabaret = require('./scrapers/cities/vancouver/foxCabaret');
const vancouverScrapers = require('./scrapers/cities/vancouver');

// Connect to MongoDB if --save flag is provided
let shouldSaveToDb = process.argv.includes('--save');
let dbConnection = null;

async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    
    // Load Event model
    require('./models/Event');
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return null;
  }
}

async function runTest() {
  console.log('🦊 Testing Fox Cabaret scraper...');
  
  try {
    // Connect to MongoDB if needed
    if (shouldSaveToDb) {
      dbConnection = await connectToMongoDB();
      if (!dbConnection) {
        console.log('⚠️ Will run scraper without saving to MongoDB');
        shouldSaveToDb = false;
      }
    }
    
    // Run the Fox Cabaret scraper
    console.log(`🔍 Running Fox Cabaret scraper (${foxCabaret.name})...`);
    const events = await foxCabaret.scrape();
    
    // Format events using the Vancouver city scraper formatter
    const formattedEvents = events.map(event => vancouverScrapers.formatEvent(event));
    
    // Print results
    console.log(`\n✅ Found ${formattedEvents.length} events at Fox Cabaret:`);
    
    formattedEvents.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`Title: ${event.title}`);
      console.log(`Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}`);
      console.log(`Category: ${event.category}`);
      console.log(`Image URL: ${event.image ? event.image.substring(0, 50) + '...' : 'None'}`);
    });
    
    // Save events to MongoDB if requested
    if (shouldSaveToDb && dbConnection) {
      const Event = mongoose.model('Event');
      
      console.log('\n💾 Saving events to MongoDB...');
      let savedCount = 0;
      
      for (const event of formattedEvents) {
        try {
          // Check if event with this ID already exists
          const existingEvent = await Event.findOne({ id: event.id });
          
          if (existingEvent) {
            // Update existing event
            await Event.findOneAndUpdate(
              { id: event.id },
              { ...event, lastUpdated: new Date() },
              { new: true }
            );
            console.log(`Updated event: ${event.title}`);
          } else {
            // Create new event
            const newEvent = new Event(event);
            await newEvent.save();
            console.log(`Saved new event: ${event.title}`);
          }
          savedCount++;
        } catch (eventError) {
          console.error(`Error saving event ${event.title}:`, eventError);
        }
      }
      
      console.log(`\n✅ Saved/updated ${savedCount} events in MongoDB`);
    }
    
  } catch (error) {
    console.error('❌ Error running test:', error);
  } finally {
    // Disconnect from MongoDB
    if (dbConnection) {
      console.log('Closing MongoDB connection...');
      await mongoose.disconnect();
    }
  }
}

// Run the test
runTest();
