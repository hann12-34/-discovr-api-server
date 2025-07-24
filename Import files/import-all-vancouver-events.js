/**
 * Vancouver Event Scrapers Master Import Script
 * 
 * This script automatically detects and runs all available Vancouver event scrapers
 * and imports their events into the MongoDB database.
 * 
 * Following the official workflow for the Discovr API system
 * 
 * Usage: node import-all-vancouver-events.js
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
  categories: [String],
  sourceURL: String,
  officialWebsite: String,
  image: String,
  imageUrl: String,
  price: String,
  ticketsRequired: Boolean,
  lastUpdated: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  strict: false  // Allow additional fields beyond the schema
});

// Create model
const Event = mongoose.model('Event', eventSchema);

// Function to check if file is a valid scraper
function isValidScraper(filePath) {
  try {
    // Only check .js files (skip backups, test files, etc.)
    if (!filePath.endsWith('.js')) {
      return false;
    }
    
    // Skip test files, utility files, index files
    if (filePath.includes('test-') || 
        filePath.includes('index.js') ||
        filePath.includes('utils') || 
        filePath.includes('verify-')) {
      return false;
    }
    
    // Try to require the file to see if it's valid
    const ScraperClass = require(filePath);
    
    // More comprehensive validation
    const isValidClass = typeof ScraperClass === 'function' && 
                        (ScraperClass.prototype && typeof ScraperClass.prototype.scrape === 'function');
    const isValidFunction = typeof ScraperClass === 'function' && !ScraperClass.prototype;
    const isValidObjectWithScrape = typeof ScraperClass === 'object' && 
                                   typeof ScraperClass.scrape === 'function';
    const isValidObjectWithScrapeEvents = typeof ScraperClass === 'object' && 
                                          typeof ScraperClass.scrapeEvents === 'function';
    
    const isValid = isValidClass || isValidFunction || isValidObjectWithScrape || isValidObjectWithScrapeEvents;
    
    if (!isValid) {
      console.log(`⚠️  ${path.basename(filePath)} - Invalid export format (type: ${typeof ScraperClass})`.yellow);
    }
    
    return isValid;
           
  } catch (error) {
    console.log(`❌ ${path.basename(filePath)} - Error loading: ${error.message}`.red);
    return false;
  }
}

// Function to run a single scraper
async function runScraper(scraperPath, importedEvents) {
  const scraperName = path.basename(scraperPath, '.js');
  
  try {
    console.log(`\n=========================================`.blue);
    console.log(`🔍 Running ${scraperName} scraper...`.cyan);
    
    // Import the scraper
    const ScraperClass = require(scraperPath);
    
    // Check if the scraper needs to be instantiated or is a function
    let scraper;
    let scrapeFunction;
    let scraperType;
    
    if (typeof ScraperClass === 'function' && ScraperClass.prototype && typeof ScraperClass.prototype.scrape === 'function') {
      // Class-based scraper with prototype.scrape
      scraper = new ScraperClass();
      scrapeFunction = async () => await scraper.scrape();
      scraperType = 'class-based';
    } else if (typeof ScraperClass === 'function' && !ScraperClass.prototype) {
      // Function-based scraper
      scrapeFunction = ScraperClass;
      scraperType = 'function-based';
    } else if (typeof ScraperClass === 'object' && typeof ScraperClass.scrape === 'function') {
      // Object with scrape method
      scrapeFunction = async () => await ScraperClass.scrape();
      scraperType = 'object with scrape';
    } else if (typeof ScraperClass === 'object' && typeof ScraperClass.scrapeEvents === 'function') {
      // Festival scraper with scrapeEvents method
      scrapeFunction = async () => await ScraperClass.scrapeEvents();
      scraperType = 'object with scrapeEvents';
    } else {
      console.error(`❌ ${scraperName} - Cannot determine scraper type:`.red);
      console.error(`   Type: ${typeof ScraperClass}`.gray);
      console.error(`   Has prototype: ${!!ScraperClass.prototype}`.gray);
      console.error(`   Has scrape: ${typeof ScraperClass.scrape}`.gray);
      console.error(`   Has scrapeEvents: ${typeof ScraperClass.scrapeEvents}`.gray);
      throw new Error(`Cannot determine how to run this scraper: ${scraperName}`);
    }
    
    console.log(`📋 Scraper type: ${scraperType}`.gray);
    
    // Get the venue name
    const venueName = scraper && scraper.name ? scraper.name : scraperName;
    console.log(`Scraping events from: ${venueName}`.cyan);
    
    const startTime = Date.now();
    const events = await scrapeFunction();
    const duration = (Date.now() - startTime) / 1000;
    
    // Check if events is an array
    if (!Array.isArray(events)) {
      console.error(`❌ ${scraperName} did not return an array of events`.red);
      return 0;
    }
    
    console.log(`✅ Found ${events.length} events in ${duration.toFixed(2)} seconds`.green);
    
    // Import events to MongoDB
    let importCount = 0;
    
    for (const event of events) {
      try {
        // Skip events without required data
        if (!event.title && !event.name) {
          console.log(`Skipping event: missing title/name`.yellow);
          continue;
        }
        
        // Normalize event data to ensure consistent structure
        const normalizedEvent = {
          // Generate ID if not present
          id: event.id || `${venueName.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
          
          // Use title or name (some scrapers use name instead of title)
          title: event.title || event.name,
          
          // Other fields
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          venue: event.venue,
          imageUrl: event.imageUrl || event.image,
          ticketUrl: event.ticketUrl,
          sourceURL: event.sourceURL || event.url,
          category: event.category,
          categories: event.categories || [],
          lastUpdated: new Date()
        };
        
        // Check if event already exists (based on ID or title + date combo)
        const query = event.id ? { id: event.id } : { 
          title: normalizedEvent.title, 
          startDate: normalizedEvent.startDate
        };
        
        // Use findOneAndUpdate with upsert to either update existing or create new
        await Event.findOneAndUpdate(
          query,
          normalizedEvent,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true 
          }
        );
        
        importCount++;
        importedEvents.push(normalizedEvent);
      } catch (err) {
        console.error(`❌ Error importing event: ${event.title || event.name || 'Unknown'}`.red);
        console.error(err.message);
      }
    }
    
    console.log(`✅ Successfully imported ${importCount} events from ${venueName} to MongoDB`.green);
    return importCount;
    
  } catch (error) {
    console.error(`❌ Error running ${scraperName} scraper:`.red);
    console.error(error.message);
    return 0;
  }
}

// Main function
async function importAllEvents() {
  const startTime = Date.now();
  console.log('Starting Vancouver events import process...'.cyan.bold);
  console.log(`Using MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`.gray);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...'.yellow);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully!'.green);
    
    // Path to Vancouver scrapers directory
    const scrapersDir = path.join(__dirname, '..', 'scrapers', 'cities', 'vancouver');
    
    // Get all potential scraper files
    const files = fs.readdirSync(scrapersDir);
    
    // Filter valid scrapers
    const scraperPaths = [];
    
    for (const file of files) {
      const filePath = path.join(scrapersDir, file);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      if (isValidScraper(filePath)) {
        scraperPaths.push(filePath);
      }
    }
    
    console.log(`Found ${scraperPaths.length} valid scrapers to run`.cyan);
    
    // Track all imported events
    const importedEvents = [];
    
    // Run each scraper
    for (const scraperPath of scraperPaths) {
      try {
        await runScraper(scraperPath, importedEvents);
      } catch (err) {
        console.error(`Error with scraper ${path.basename(scraperPath)}:`, err);
      }
    }
    
    // Log summary
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log('\n========================================='.blue);
    console.log('📊 IMPORT SUMMARY:'.yellow.bold);
    console.log(`✅ Total events imported: ${importedEvents.length}`.green);
    console.log(`✅ Events now available in your MongoDB database`.green);
    console.log(`✅ Import process took ${totalDuration.toFixed(2)} seconds`.green);
    console.log('\nNext Steps (following the FINAL_WORKFLOW):'.cyan);
    console.log('1. Test your API locally:'.yellow);
    console.log('   node unified-proxy-server.js'.gray);
    console.log('2. Deploy to Render to update the live API'.yellow);
    console.log('   (Follow Step 3 & 4 in the workflow document)'.gray);
    console.log('=========================================\n'.blue);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:'.red);
    console.error(error.message);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.'.gray);
  }
}

// Run the import process
importAllEvents().catch(err => {
  console.error('❌ Unhandled error in importAllEvents:'.red);
  console.error(err.message);
  process.exit(1);
});
