const cron = require('node-cron');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { scrapeLogger } = require('./utils/logger');

// Import our scraper modules
const eventbriteScraper = require('./sources/eventbriteScraper');
const meetupScraper = require('./sources/meetupScraper');
const localEventsScraper = require('./sources/localEventsScraper');
// Module not found - commenting out
// const destinationVancouverScraper = require('./sources/destinationVancouverScraper');

// Import our new Vancouver event scrapers
const vancouverMuseumEvents = require('./events/vancouverMuseumEvents');
const vancouverOutdoorEvents = require('./events/vancouverOutdoorEvents');
const vancouverCulturalEvents = require('./events/vancouverCulturalEvents');

// Function to load scrapers from a directory
function loadScrapersFromDir(directory, scrapersArray) {
  if (!fs.existsSync(directory)) return;
  
  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      if (file.endsWith('.js')) {
        try {
          const scraperPath = path.join(directory, file);
          const scraper = require(scraperPath);
          
          if (scraper && typeof scraper.scrape === 'function') {
            // Check if scraper with same name already exists
            const existing = scrapersArray.find(s => s.name === scraper.name);
            if (!existing) {
              scrapersArray.push(scraper);
              scrapeLogger.info(`Loaded scraper: ${scraper.name} from ${path.relative(__dirname, scraperPath)}`);
            } else {
              scrapeLogger.warn(`Duplicate scraper found: ${scraper.name} - skipping`);
            }
          }
        } catch (error) {
          scrapeLogger.error({ error: error.message }, `Error loading scraper: ${file}`);
        }
      }
    });
  } catch (error) {
    scrapeLogger.error({ error: error.message }, `Error reading directory: ${directory}`);
  }
}

// Initialize array to hold all scrapers
const allScrapersList = [];

// Load scrapers from different directories
scrapeLogger.info('Loading scrapers from all directories');

// Load from /scrapers/venues/new/ directory
loadScrapersFromDir(path.join(__dirname, 'venues', 'new'), allScrapersList);

// Load from /scrapers/venues/ directory (excluding 'new' subdirectory)
const venueDir = path.join(__dirname, 'venues');
if (fs.existsSync(venueDir)) {
  try {
    const items = fs.readdirSync(venueDir, { withFileTypes: true });
    
    items.forEach(item => {
      if (item.isFile() && item.name.endsWith('.js')) {
        try {
          const scraperPath = path.join(venueDir, item.name);
          const scraper = require(scraperPath);
          
          if (scraper && typeof scraper.scrape === 'function') {
            // Check for duplicates
            const existing = allScrapersList.find(s => s.name === scraper.name);
            if (!existing) {
              allScrapersList.push(scraper);
              scrapeLogger.info(`Loaded scraper: ${scraper.name} from ${path.relative(__dirname, scraperPath)}`);
            } else {
              scrapeLogger.warn(`Duplicate scraper found: ${scraper.name} - skipping`);
            }
          }
        } catch (error) {
          scrapeLogger.error({ error: error.message }, `Error loading scraper: ${item.name}`);
        }
      }
    });
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error reading venues directory');
  }
}

// Load from /scrapers/events/ directory
loadScrapersFromDir(path.join(__dirname, 'events'), allScrapersList);

scrapeLogger.info(`Successfully loaded ${allScrapersList.length} scrapers in total`);

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Scraper connected to MongoDB'))
  .catch(err => {
    console.error('Scraper failed to connect to MongoDB:', err);
    process.exit(1);
  });

/**
 * Format scraped events to match the database schema
 * @param {Array} events - Raw events from scrapers
 * @param {String} source - Source name
 * @returns {Array} - Formatted events for database
 */
function formatEventsForDatabase(events, source) {
  return events.map(event => {
    // Parse dates from string format if needed
    let startDate = null;
    let endDate = null;
    
    if (event.date) {
      // Try to extract date ranges
      const dateRangeParts = event.date.split(' - ');
      if (dateRangeParts.length === 2) {
        startDate = new Date(dateRangeParts[0]);
        endDate = new Date(dateRangeParts[1]);
      } else {
        startDate = new Date(event.date);
      }
    }
    
    // Ensure valid dates (default to today if invalid)
    if (!startDate || isNaN(startDate.getTime())) {
      startDate = new Date();
    }
    
    if (!endDate || isNaN(endDate.getTime())) {
      // If no end date, set to start date
      endDate = startDate;
    }
    
    return {
      title: event.title,
      description: event.description || `Event at ${event.venue}`,
      startDate,
      endDate,
      venue: {
        name: event.venue || source,
        address: event.address,
        website: event.url
      },
      imageURL: event.image,
      sourceURL: event.url,
      location: event.city || 'Vancouver',
      type: 'Event',
      category: 'Arts & Culture',
      status: 'Upcoming',
      scrapedFrom: source
    };
  });
}

/**
 * Run all scrapers and collect data
 */
async function runAllScrapers() {
  scrapeLogger.info(`Starting scraping run at ${new Date().toISOString()}`);
  
  try {
    // Use all registered scrapers
    const scraperTasks = allScrapers.map(scraper => ({
      name: scraper.name,
      scrape: scraper.scrape
    }));
    
    // Run all scrapers in parallel with a concurrency limit to avoid overwhelming the system
    // We'll run them in batches of 5 at a time
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < scraperTasks.length; i += batchSize) {
      const batch = scraperTasks.slice(i, i + batchSize);
      scrapeLogger.info(`Running batch of scrapers ${i+1} to ${Math.min(i+batchSize, scraperTasks.length)} of ${scraperTasks.length}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(task => task.scrape())
      );
      
      results.push(...batchResults);
    }
    
    // Log results
    let successful = 0;
    let failed = 0;
    let totalEvents = 0;
    
    results.forEach((result, index) => {
      const scraperName = scraperTasks[index].name;
      
      if (result.status === 'fulfilled') {
        const eventCount = Array.isArray(result.value) ? result.value.length : 0;
        scrapeLogger.info(`${scraperName} scraper completed successfully. Found ${eventCount} events.`);
        successful++;
        totalEvents += eventCount;
      } else {
        scrapeLogger.error({ error: result.reason }, `${scraperName} scraper failed`);
        failed++;
      }
    });
    
    scrapeLogger.info(`All scrapers completed: ${successful} successful, ${failed} failed, found ${totalEvents} total events`);
    return { successful, failed, totalEvents };
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error running scrapers');
    return { successful: 0, failed: scraperTasks?.length || 0, totalEvents: 0, error: error.message };
  }
}

/**
 * Initialize scrapers with cron schedule
 */
function initializeScrapers() {
  console.log('Initializing event scrapers');
  
  // Schedule scraping to run daily at midnight
  // Use '0 0 * * *' for daily at midnight
  // Use '*/5 * * * *' for every 5 minutes (testing)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled scraping job');
    await runAllScrapers();
  });
  
  // Also run once immediately on startup
  runAllScrapers();
}

// Create a list of all scrapers for the API
const allScrapers = [
  { name: 'Eventbrite', url: 'https://www.eventbrite.ca', scrape: eventbriteScraper.scrape },
  { name: 'Meetup', url: 'https://www.meetup.com', scrape: meetupScraper.scrape },
  { name: 'Local Events', url: 'https://vancouverisawesome.com', scrape: localEventsScraper.scrape },
  // { name: 'Destination Vancouver', url: 'Multiple Vancouver Venues', scrape: destinationVancouverScraper.scrape }, // Module not found - commenting out
  { name: 'Vancouver Museums', urls: vancouverMuseumEvents.urls, scrape: vancouverMuseumEvents.scrape },
  { name: 'Vancouver Outdoor Events', urls: vancouverOutdoorEvents.urls, scrape: vancouverOutdoorEvents.scrape },
  { name: 'Vancouver Cultural Events', urls: vancouverCulturalEvents.urls, scrape: vancouverCulturalEvents.scrape }
];

// Add all dynamically loaded scrapers to the list
allScrapersList.forEach(scraper => {
  // Avoid duplicates with existing scrapers
  const exists = allScrapers.some(s => s.name === scraper.name);
  if (!exists) {
    allScrapers.push({
      name: scraper.name,
      url: scraper.url,
      scrape: scraper.scrape
    });
  }
});

// Export for use in server.js
module.exports = {
  initializeScrapers,
  scrapers: allScrapers,
  formatEventsForDatabase
};
