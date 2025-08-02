/**
 * New York Event Scrapers Master Import Script
 * 
 * This script automatically detects and runs all available New York event scrapers
 * and imports their events into the MongoDB database.
 * 
 * Following the official workflow for the Discovr API system
 * 
 * Usage: node import-all-new-york-events.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const colors = require('colors');
const fs = require('fs');
const path = require('path');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not defined!'.red);
  console.error('Please make sure your .env file contains the correct MongoDB connection string.'.yellow);
  process.exit(1);
}

// Create MongoDB Event model schema
const eventSchema = new mongoose.Schema({
  id: String,
  title: String,
  name: String,
  description: String,
  startDate: Date,
  endDate: Date,
  venue: {
    name: String,
    id: String,
    address: String,
    city: String,
    state: String, 
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    websiteUrl: String,
    description: String
  },
  category: String,
  price: String,
  ageRestriction: String,
  url: String,
  imageUrl: String,
  city: String,
  source: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  collection: 'events',
  timestamps: true 
});

// Create the Event model
const Event = mongoose.model('Event', eventSchema);

// Function to check if file is a valid scraper
function isValidScraper(filePath) {
  try {
    // Skip non-JS files and the index.js coordinator
    if (!filePath.endsWith('.js') || filePath.includes('index.js')) {
      return false;
    }

    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Try to require the file to see if it's a valid module
    const ScraperClass = require(filePath);
    
    // Check if it's a constructor function/class
    if (typeof ScraperClass !== 'function') {
      return false;
    }

    // Try to instantiate it
    const instance = new ScraperClass();
    
    // Check if it has the required fetchEvents method
    if (typeof instance.fetchEvents !== 'function') {
      return false;
    }

    console.log(`✅ Valid New York scraper found: ${path.basename(filePath)}`.green);
    return true;

  } catch (error) {
    console.log(`⚠️  Invalid scraper ${path.basename(filePath)}: ${error.message}`.yellow);
    return false;
  }
}

// Function to run a single scraper
async function runScraper(scraperPath, importedEvents) {
  const scraperName = path.basename(scraperPath, '.js');
  
  try {
    console.log(`\n🎭 Running New York scraper: ${scraperName}`.cyan);
    
    // Import the scraper class
    const ScraperClass = require(scraperPath);
    const scraper = new ScraperClass();
    
    // Get scraper info
    const venue = scraper.venue || { name: scraperName };
    console.log(`📍 Venue: ${venue.name}`.blue);
    
    // Fetch events
    const events = await scraper.fetchEvents();
    
    if (!events || events.length === 0) {
      console.log(`⚠️  No events found for ${venue.name}`.yellow);
      return;
    }

    console.log(`📊 Found ${events.length} events from ${venue.name}`.green);

    let savedCount = 0;
    let skippedCount = 0;

    // Process each event
    for (const eventData of events) {
      try {
        // Ensure required fields (temporarily allow events without proper dates to extract real events)
        if (!eventData.title || eventData.title.length < 3) {
          console.log(`⚠️  Skipping event with invalid title: "${eventData.title}"`.yellow);
          skippedCount++;
          continue;
        }
        
        // Set placeholder date if missing to allow real events to be saved
        if (!eventData.startDate) {
          eventData.startDate = new Date('2025-12-31'); // Default future date for events without dates
          console.log(`📅 Setting placeholder date for: "${eventData.title}"`.blue);
        }

        // Set default city for New York events
        eventData.city = eventData.city || 'New York';
        eventData.source = scraperName;
        eventData.updatedAt = new Date();

        // Create unique ID based on title, venue, and date
        const uniqueId = `${scraperName}-${eventData.title}-${eventData.startDate}`.replace(/[^a-zA-Z0-9-]/g, '');
        eventData.id = uniqueId;

        // Check if event already exists
        const existingEvent = await Event.findOne({ id: uniqueId });

        if (existingEvent) {
          // Update existing event
          await Event.updateOne({ id: uniqueId }, eventData);
          console.log(`🔄 Updated: ${eventData.title}`.blue);
        } else {
          // Create new event
          const newEvent = new Event(eventData);
          await newEvent.save();
          console.log(`✅ Saved: ${eventData.title}`.green);
          savedCount++;
        }

        importedEvents.push(eventData);

      } catch (error) {
        console.log(`❌ Error saving event "${eventData.title}": ${error.message}`.red);
        skippedCount++;
      }
    }

    console.log(`📈 ${venue.name}: ${savedCount} new events saved, ${skippedCount} skipped`.green);

  } catch (error) {
    console.error(`❌ Error running scraper ${scraperName}: ${error.message}`.red);
    console.error(`Stack trace: ${error.stack}`.red);
  }
}

// Main function
async function importAllEvents() {
  console.log('\n🗽 NEW YORK EVENT SCRAPERS - MASTER IMPORT SCRIPT'.cyan.bold);
  console.log('='.repeat(60).cyan);

  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...'.blue);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!'.green);

    // Find New York scrapers directory
    const scrapersDir = path.join(__dirname, '..', 'scrapers', 'cities', 'New York');
    
    if (!fs.existsSync(scrapersDir)) {
      throw new Error(`New York scrapers directory not found: ${scrapersDir}`);
    }

    console.log(`📂 Scanning for New York scrapers in: ${scrapersDir}`.blue);

    // Get all scraper files
    const scraperFiles = fs.readdirSync(scrapersDir)
      .map(file => path.join(scrapersDir, file))
      .filter(isValidScraper);

    if (scraperFiles.length === 0) {
      console.log('⚠️  No valid New York scrapers found!'.yellow);
      return;
    }

    console.log(`🎯 Found ${scraperFiles.length} New York scrapers to run`.green);

    // Track imported events
    const importedEvents = [];
    const startTime = Date.now();

    // Run each scraper
    for (const scraperPath of scraperFiles) {
      await runScraper(scraperPath, importedEvents);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Final summary
    console.log('\n🎉 NEW YORK IMPORT COMPLETE!'.green.bold);
    console.log('='.repeat(50).green);
    console.log(`📊 Total events imported: ${importedEvents.length}`.green);
    console.log(`⏱️  Total time: ${duration} seconds`.blue);
    console.log(`🗽 New York events are now available in the database!`.green.bold);

  } catch (error) {
    console.error('\n❌ IMPORT FAILED:'.red.bold);
    console.error(error.message.red);
    console.error('\nStack trace:'.red);
    console.error(error.stack.red);
  } finally {
    // Close MongoDB connection
    console.log('\n🔌 Closing MongoDB connection...'.blue);
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.'.green);
  }
}

// Run the import process
importAllEvents().catch(err => {
  console.error('❌ Unhandled error in importAllEvents:'.red);
  console.error(err.message);
  process.exit(1);
});
