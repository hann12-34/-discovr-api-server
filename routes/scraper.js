/**
 * Scraper API routes for Discovr
 * Allows triggering scrapers and viewing results
 */
const express = require('express');
const router = express.Router();
const scraperManager = require('../scrapers/scraperManager');
const Event = require('../models/Event');
const { scrapeLogger } = require('../scrapers/utils/logger');

// Middleware to check admin permissions
const isAdmin = (req, res, next) => {
  // For development, allow without authentication
  // In production, you'd check req.user.isAdmin
  next();
};

/**
 * @route   GET /api/v1/scrapers
 * @desc    List all available scrapers
 * @access  Admin
 */
router.get('/', isAdmin, (req, res) => {
  const availableScrapers = scraperManager.scrapers.map(s => ({
    name: s.name,
    url: s.url || (s.urls ? s.urls.join(', ') : ''),
    type: s.source || 'Scraper'
  }));
  
  res.json({
    success: true,
    scrapers: availableScrapers
  });
});

/**
 * @route   GET /api/v1/scrapers/list
 * @desc    List all available scrapers (alternative route for admin dashboard)
 * @access  Admin
 */
router.get('/list', (req, res) => {
  const availableScrapers = scraperManager.scrapers.map(s => ({
    name: s.name,
    url: s.url || (s.urls ? s.urls.join(', ') : ''),
    type: s.source || 'Scraper'
  }));
  
  res.json({
    success: true,
    scrapers: availableScrapers
  });
});

/**
 * @route   GET /api/v1/scrapers/status
 * @desc    Get detailed status of all scrapers
 * @access  Admin
 */
router.get('/status', isAdmin, (req, res) => {
  try {
    // Get all scrapers
    const allScrapers = scraperManager.scrapers;
    
    // Map scrapers with additional metadata
    const scraperStatus = allScrapers.map(scraper => {
      // Get file path (if available)
      let sourcePath = '';
      
      // Try to determine scraper source file
      if (scraper.sourcePath) {
        sourcePath = scraper.sourcePath;
      } else if (scraper.__filename) {
        sourcePath = scraper.__filename;
      }
      
      // Format data about the scraper
      return {
        name: scraper.name,
        url: scraper.url || scraper.urls?.[0] || '',
        urls: scraper.urls || [scraper.url].filter(Boolean),
        sourcePath,
        hasScrapeFn: typeof scraper.scrape === 'function',
        status: 'unknown', // Will be updated by client when testing
        lastRun: scraper.lastRun || null,
        lastEventCount: scraper.lastEventCount || 0
      };
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: scraperStatus.length,
      scrapers: scraperStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error getting scraper status: ${error.message}`,
      error: error.stack
    });
  }
});

/**
 * @route   POST /api/v1/scrapers/run/:scraperName
 * @desc    Run a specific scraper
 * @access  Admin
 */
router.post('/run/:scraperName', isAdmin, async (req, res) => {
  const { scraperName } = req.params;
  const { save = true } = req.body;
  
  try {
    // Find the scraper with more flexible matching
    const normalizedName = scraperName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const scraper = scraperManager.scrapers.find(s => {
      const scraperNameNormalized = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return scraperNameNormalized === normalizedName;
    });
    
    if (!scraper) {
      console.log(`Scraper '${scraperName}' not found. Available scrapers: ${scraperManager.scrapers.map(s => s.name).join(', ')}`);
      return res.status(404).json({
        success: false,
        message: `Scraper '${scraperName}' not found`
      });
    }
    
    console.log(`Running scraper: ${scraper.name}`);
    
    // Record start time
    const startTime = Date.now();
    
    // Execute the scraper with timeout protection
    let rawEvents;
    try {
      // Set a timeout for the scraper (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scraper timed out after 30 seconds')), 30000);
      });
      
      rawEvents = await Promise.race([
        scraper.scrape(),
        timeoutPromise
      ]);
      
      console.log(`Scraper ${scraper.name} found ${rawEvents ? rawEvents.length : 0} raw events`);
    } catch (scraperError) {
      // Detailed error logging
      console.error(`Error in scraper ${scraper.name}:`, scraperError);
      scrapeLogger.error({ error: scraperError }, 
        `Specific scraper error for ${scraper.name}: ${scraperError.message}, Stack: ${scraperError.stack}`);
      
      return res.status(500).json({
        success: false,
        scraper: scraper.name,
        error: scraperError.message,
        errorType: scraperError.name,
        stack: process.env.NODE_ENV !== 'production' ? scraperError.stack : undefined
      });
    }
    
    if (!rawEvents || !Array.isArray(rawEvents)) {
      console.log(`Scraper ${scraper.name} returned invalid data: ${typeof rawEvents}`);
      return res.status(500).json({
        success: false,
        message: `Scraper returned invalid data: expected array, got ${typeof rawEvents}`,
        scraper: scraper.name
      });
    }
    
    // Format events
    const events = scraperManager.formatEventsForDatabase(rawEvents, scraper.name);
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Save events if requested
    if (save && events && Array.isArray(events) && events.length > 0) {
      try {
        // Save each event to the database
        await Promise.all(events.map(event => {
          // Only add if not a duplicate
          return Event.findOneAndUpdate(
            { 
              title: event.title,
              startDate: event.startDate,
              venue: event.venue
            }, 
            event, 
            { upsert: true, new: true }
          );
        }));
        
        console.log(`Saved ${events.length} events from scraper ${scraper.name}`);
      } catch (dbError) {
        console.error(`Database error when saving events from ${scraper.name}:`, dbError);
        // Continue and return events even if save fails
      }
    }
    
    res.json({
      success: true,
      scraper: scraper.name,
      eventCount: events.length,
      duration,
      events: events.map(e => ({
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        venue: e.venue?.name
      }))
    });
  } catch (error) {
    console.error(`General error running scraper ${scraperName}:`, error);
    scrapeLogger.error({ error }, `Error running scraper ${scraperName}: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error running scraper: ${error.message}`,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/v1/scrapers/run-all
 * @desc    Run all scrapers
 * @access  Admin
 */
router.post('/run-all', isAdmin, async (req, res) => {
  const { save = false } = req.body;
  
  try {
    const results = await scrapers.runAll(save);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error running all scrapers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Save events to database
 */
async function saveEvents(events, source) {
  let added = 0;
  let duplicates = 0;
  
  for (const eventData of events) {
    try {
      // Skip events without required fields
      if (!eventData.title || !eventData.venue?.name) {
        scrapeLogger.warn({ event: eventData.title }, 'Skipping event with missing required fields');
        continue;
      }
      
      // Check for duplicate
      const existingEvent = await Event.findOne({
        name: eventData.title,
        'venue.name': eventData.venue.name
      });
      
      if (!existingEvent) {
        // Create event from our already formatted data
        const event = new Event({
          name: eventData.title,
          description: eventData.description,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          venue: {
            name: eventData.venue.name,
            address: eventData.venue.address,
            website: eventData.venue.website
          },
          imageURL: eventData.imageURL,
          sourceURL: eventData.sourceURL,
          location: eventData.location,
          type: eventData.type,
          category: eventData.category,
          status: eventData.status,
          scrapedFrom: source
        });
        
        await event.save();
        added++;
      } else {
        duplicates++;
      }
    } catch (error) {
      scrapeLogger.error({ error: error.message, eventTitle: eventData.title }, 'Error saving event to database');
    }
  }
  
  return { added, duplicates };
}

module.exports = router;
