/**
 * Discovr Admin Tool
 * 
 * One-click solution to:
 * 1. Run all scrapers to collect events
 * 2. Save events to local MongoDB
 * 3. Export events to JSON for cloud import
 * 
 * Usage: node admin-tool.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const vancouverScrapers = require('./scrapers/cities/vancouver');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Event schema for MongoDB
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  description: String,
  date: String,
  startDate: Date,
  endDate: Date,
  image: String,
  venue: Object,
  category: String,
  categories: [String],
  sourceURL: String,
  ticketURL: String,
  location: String,
  lastUpdated: Date
}, { strict: false });

// Main function
async function runAdminTool() {
  console.log('🚀 Discovr Admin Tool Starting...');
  console.log('================================\n');
  
  try {
    // Connect to MongoDB with more explicit options and error handling
    console.log(`🔄 Connecting to MongoDB at: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    
    console.log('✅ Connected to local MongoDB');
    
    // Test the connection with a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Connection verified with ${collections.length} collections in database`);
    console.log(`📊 Database name: ${mongoose.connection.db.databaseName}`);

    const Event = mongoose.model('Event', eventSchema);
    
    // =======================================
    // STEP 1: Run all scrapers
    // =======================================
    console.log('\n📋 STEP 1: Running all scrapers...');
    console.log('-------------------------------');
    
    // Results tracking
    let results = {
      totalScrapers: vancouverScrapers.scrapers.length,
      completedScrapers: 0,
      failedScrapers: 0,
      eventsBySource: {},
      saved: 0,
      duplicates: 0,
      errors: []
    };
    
    // Run each scraper
    for (const scraper of vancouverScrapers.scrapers) {
      console.log(`\n⚙️ Running ${scraper.name} scraper...`);
      
      try {
        // Run the scraper
        const events = await scraper.scrape();
        console.log(`✅ Found ${events.length} events from ${scraper.name}`);
        
        // Save statistics
        results.eventsBySource[scraper.name] = events.length;
        
        // Save events to MongoDB
        if (events.length > 0) {
          for (const event of events) {
            try {
              // Check if event exists
              const existingEvent = await Event.findOne({ id: event.id });
              
              if (!existingEvent) {
                // Save new event
                await Event.create(event);
                results.saved++;
              } else {
                // Skip duplicate
                results.duplicates++;
              }
            } catch (err) {
              // Handle duplicate key errors
              if (err.code === 11000) {
                results.duplicates++;
              } else {
                console.error(`  ❌ Error saving event "${event.title}":`, err.message);
                results.errors.push({
                  scraper: scraper.name, 
                  event: event.title,
                  error: err.message
                });
              }
            }
          }
        }
        
        results.completedScrapers++;
        
      } catch (error) {
        console.error(`❌ Error running ${scraper.name} scraper:`, error.message);
        results.failedScrapers++;
        results.errors.push({
          scraper: scraper.name,
          error: error.message
        });
      }
    }
    
    // =======================================
    // STEP 2: Export events to JSON
    // =======================================
    console.log('\n📋 STEP 2: Exporting events to JSON...');
    console.log('----------------------------------');
    
    // Get all events from local database
    const allEvents = await Event.find({});
    console.log(`📊 Found ${allEvents.length} total events in database`);
    
    // Format events for export
    const formattedEvents = allEvents.map(event => {
      const plainEvent = event.toObject();
      delete plainEvent._id;
      delete plainEvent.__v;
      
      return {
        id: plainEvent.id,
        title: plainEvent.title,
        description: plainEvent.description || '',
        startDate: plainEvent.startDate,
        endDate: plainEvent.endDate || plainEvent.startDate,
        venue: plainEvent.venue || {
          name: plainEvent.venue?.name || 'Unknown Venue',
          location: plainEvent.venue?.location || { 
            address: '', 
            city: 'Vancouver', 
            province: 'BC', 
            country: 'Canada' 
          }
        },
        category: plainEvent.category || 'Music',
        categories: plainEvent.categories || ['Music'],
        image: plainEvent.image || '',
        sourceURL: plainEvent.sourceURL || '',
        officialWebsite: plainEvent.officialWebsite || '',
        ticketURL: plainEvent.ticketURL || '',
        location: plainEvent.location || 'Vancouver, BC',
        lastUpdated: plainEvent.lastUpdated || new Date()
      };
    });

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `events_export_${timestamp}.json`;
    const filePath = path.join(exportsDir, filename);

    // Write events to JSON file
    fs.writeFileSync(filePath, JSON.stringify(formattedEvents, null, 2));
    console.log(`✅ Successfully exported ${formattedEvents.length} events to ${filePath}`);
    
    // =======================================
    // STEP 3: Print summary and instructions
    // =======================================
    console.log('\n📊 SCRAPER SUMMARY');
    console.log('=================');
    console.log(`Total scrapers: ${results.totalScrapers}`);
    console.log(`Completed successfully: ${results.completedScrapers}`);
    console.log(`Failed: ${results.failedScrapers}`);
    
    console.log('\n📊 EVENTS BY SOURCE');
    console.log('=================');
    for (const [source, count] of Object.entries(results.eventsBySource)) {
      console.log(`${source}: ${count} events`);
    }
    
    console.log('\n📊 DATABASE SUMMARY');
    console.log('=================');
    console.log(`Total events in database: ${allEvents.length}`);
    console.log(`New events saved: ${results.saved}`);
    console.log(`Duplicates skipped: ${results.duplicates}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS');
      console.log('=======');
      results.errors.forEach((err, i) => {
        if (err.event) {
          console.log(`${i+1}. ${err.scraper} - Event "${err.event}": ${err.error}`);
        } else {
          console.log(`${i+1}. ${err.scraper}: ${err.error}`);
        }
      });
    }
    
    console.log('\n📝 NEXT STEPS - IMPORT TO CLOUD');
    console.log('============================');
    console.log('To import these events to your cloud MongoDB:');
    console.log('');
    console.log('Option 1: Using MongoDB Compass');
    console.log('1. Open MongoDB Compass');
    console.log('2. Connect to your cloud MongoDB instance');
    console.log('3. Navigate to the "discovr" database and "events" collection');
    console.log('4. Click "Add Data" > "Import JSON or CSV file"');
    console.log(`5. Select the exported file at: ${filePath}`);
    console.log('6. Choose "JSON" as the file type and click "Import"');
    console.log('');
    console.log('Option 2: Using mongoimport CLI tool');
    console.log(`mongoimport --uri="YOUR_CLOUD_MONGODB_URI" --collection=events --file=${filePath} --jsonArray`);
    console.log('');
    console.log('Once imported, your events will appear in the Discovr app!');
    
  } catch (error) {
    console.error('❌ Error running admin tool:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from local MongoDB');
    console.log('\n🏁 Admin tool completed!');
  }
}

// Run the admin tool
runAdminTool().catch(console.error);
