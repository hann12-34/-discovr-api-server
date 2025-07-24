/**
 * Montreal Event Scrapers Master Import Script
 * 
 * This script automatically detects and runs all available Montreal event scrapers
 * and imports their events into the MongoDB database.
 * 
 * Following the official workflow for the Discovr API system
 * 
 * Usage: node import-all-montreal-events.js
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
  organizer: String,
  url: String,
  image: String,
  price: String,
  source: String,
  scrapedAt: Date,
  city: String,
  province: String,
  country: String,
  status: String,
  tags: [String],
  capacity: Number,
  attendees: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

// Function to check if file is a valid scraper
function isValidScraper(filePath) {
  try {
    const fileName = path.basename(filePath);
    
    // Skip test files, non-JS files, and files that don't follow scraper naming
    if (fileName.includes('.test.') || 
        fileName.includes('.spec.') || 
        !fileName.endsWith('.js') ||
        !fileName.startsWith('scrape-') ||
        fileName.includes('test-') ||
        fileName.includes('example-')) {
      return false;
    }
    
    // Check if file exists and is readable
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return false;
    }
    
    // Try to require the file to check if it's a valid Node.js module
    const scraperModule = require(filePath);
    
    // Enhanced scrapers should be constructor functions or classes
    if (typeof scraperModule === 'function') {
      return true;
    }
    
    // Original scrapers should export a scrapeEvents function
    if (typeof scraperModule.scrapeEvents === 'function') {
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`⚠️  Skipping invalid scraper ${path.basename(filePath)}: ${error.message}`.yellow);
    return false;
  }
}

// Function to run a single scraper
async function runScraper(scraperPath, importedEvents) {
  const scraperName = path.basename(scraperPath, '.js');
  
  try {
    console.log(`🔍 Running ${scraperName}...`.cyan);
    
    // Clear require cache to ensure fresh module load
    delete require.cache[require.resolve(scraperPath)];
    
    const scraperModule = require(scraperPath);
    let events = [];
    
    // Handle enhanced scrapers (constructor functions/classes)
    if (typeof scraperModule === 'function') {
      const scraperInstance = new scraperModule();
      if (typeof scraperInstance.scrapeEvents === 'function') {
        events = await scraperInstance.scrapeEvents();
      }
    } 
    // Handle original scrapers (direct export)
    else if (typeof scraperModule.scrapeEvents === 'function') {
      events = await scraperModule.scrapeEvents();
    }
    
    if (!Array.isArray(events)) {
      console.log(`⚠️  ${scraperName} returned non-array result, skipping...`.yellow);
      return 0;
    }
    
    let addedCount = 0;
    
    // Process each event
    for (const event of events) {
      try {
        // Validate required fields
        if (!event.title && !event.name) {
          console.log(`⚠️  Skipping event without title/name from ${scraperName}`.yellow);
          continue;
        }
        
        // Normalize event data
        const normalizedEvent = {
          id: event.id || `${scraperName}-${Date.now()}-${Math.random()}`,
          title: event.title || event.name,
          name: event.name || event.title,
          description: event.description || '',
          startDate: event.date || event.startDate,
          endDate: event.endDate,
          venue: event.venue || {},
          category: event.category || 'Other',
          organizer: event.organizer || '',
          url: event.url || '',
          image: event.image || '',
          price: event.price || '',
          source: event.source || scraperName,
          scrapedAt: event.scrapedAt || new Date(),
          city: event.city || 'Montreal',
          province: event.province || 'Quebec',
          country: event.country || 'Canada',
          status: event.status || 'active',
          tags: event.tags || [],
          capacity: event.capacity,
          attendees: event.attendees,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await Event.findOne({
          $or: [
            { id: normalizedEvent.id },
            { 
              title: normalizedEvent.title,
              'venue.name': normalizedEvent.venue.name,
              startDate: normalizedEvent.startDate
            }
          ]
        });
        
        if (existingEvent) {
          console.log(`⚠️  Duplicate event found: ${normalizedEvent.title}, updating...`.yellow);
          await Event.findByIdAndUpdate(existingEvent._id, normalizedEvent);
        } else {
          await Event.create(normalizedEvent);
          addedCount++;
          console.log(`✅ Added: ${normalizedEvent.title}`.green);
        }
        
      } catch (eventError) {
        console.log(`❌ Error processing event from ${scraperName}: ${eventError.message}`.red);
      }
    }
    
    importedEvents.push({
      scraper: scraperName,
      eventsFound: events.length,
      eventsAdded: addedCount
    });
    
    console.log(`✅ ${scraperName}: ${addedCount} events added from ${events.length} found`.green);
    return addedCount;
    
  } catch (error) {
    console.log(`❌ Error running ${scraperName}: ${error.message}`.red);
    importedEvents.push({
      scraper: scraperName,
      eventsFound: 0,
      eventsAdded: 0,
      error: error.message
    });
    return 0;
  }
}

// Main function
async function importAllEvents() {
  const startTime = Date.now();
  console.log('🚀 Starting Montreal events import process...'.cyan.bold);
  console.log(`Using MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`.gray);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...'.yellow);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!'.green);
    
    // Get Montreal scrapers directory
    const scrapersDir = path.join(__dirname, '..', 'scrapers', 'cities', 'Montreal');
    
    if (!fs.existsSync(scrapersDir)) {
      throw new Error(`Montreal scrapers directory not found: ${scrapersDir}`);
    }
    
    // Find all scraper files
    const allFiles = fs.readdirSync(scrapersDir);
    const scraperFiles = allFiles.filter(file => {
      const filePath = path.join(scrapersDir, file);
      return isValidScraper(filePath);
    });
    
    console.log(`\n🔍 Found ${scraperFiles.length} valid Montreal scrapers`.cyan);
    console.log(`📁 Directory: ${scrapersDir}`.gray);
    
    const importedEvents = [];
    let totalAdded = 0;
    
    // Process each scraper
    for (const scraperFile of scraperFiles) {
      const scraperPath = path.join(scrapersDir, scraperFile);
      const added = await runScraper(scraperPath, importedEvents);
      totalAdded += added;
    }
    
    // Get final counts
    const totalEvents = await Event.countDocuments({});
    const montrealEvents = await Event.countDocuments({ city: 'Montreal' });
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MONTREAL EVENTS IMPORT SUMMARY'.cyan.bold);
    console.log('='.repeat(60));
    console.log(`🎯 Total scrapers processed: ${scraperFiles.length}`.white);
    console.log(`✅ Total events added: ${totalAdded}`.green);
    console.log(`📈 Total Montreal events in database: ${montrealEvents}`.blue);
    console.log(`🗄️  Total events in database: ${totalEvents}`.blue);
    console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`.gray);
    
    // Print detailed results
    console.log('\n📋 DETAILED RESULTS:'.cyan);
    importedEvents.forEach(result => {
      const status = result.error ? '❌' : '✅';
      const errorMsg = result.error ? ` (Error: ${result.error})` : '';
      console.log(`${status} ${result.scraper}: ${result.eventsAdded}/${result.eventsFound} events${errorMsg}`.white);
    });
    
    console.log('\n🎉 Montreal events import completed successfully!'.green.bold);
    
  } catch (error) {
    console.error('❌ Error during import process:'.red);
    console.error(error.message);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB'.gray);
  }
}

// Run the import process
importAllEvents().catch(err => {
  console.error('❌ Unhandled error in importAllEvents:'.red);
  console.error(err.message);
  process.exit(1);
});
