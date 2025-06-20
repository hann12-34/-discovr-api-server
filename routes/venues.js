/**
 * Venue API routes for Discovr
 * Provides endpoints for Vancouver venue data and events
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const scraperManager = require('../scrapers/scraperManager');
const { formatEventsForDatabase } = require('../scrapers/scraperManager');
const { scrapeLogger } = require('../scrapers/utils/logger');

// Simple development authentication bypass
const devAuthBypass = (req, res, next) => {
  // Skip authentication for local development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // In production, check for authentication
  // For now, just allow all requests during development
  next();
};

// Use the scrapers from scraperManager instead of loading them again separately
// This ensures we're using the same source of truth across the application
const allScrapers = scraperManager.scrapers;

// Create a map of venue scrapers by ID for easier access
const venueScrapers = {};

// Filter scrapers that are venue-specific and map them by ID
// Use lowercase names without spaces as IDs for URL-friendly access
allScrapers.forEach(scraper => {
  if (scraper.name && scraper.scrape) {
    // Generate an ID from the scraper name
    const scraperId = scraper.name.toLowerCase().replace(/\s+/g, '-');
    venueScrapers[scraperId] = scraper;
  }
});

scrapeLogger.info(`Loaded ${Object.keys(venueScrapers).length} venue scrapers for the admin interface`);

// Middleware to check authentication if needed
const checkAuth = (req, res, next) => {
  // In production, implement proper auth checks
  // For now, allow all requests
  next();
};

/**
 * @route   GET /api/v1/venues
 * @desc    Get list of all available venues
 * @access  Public
 */
router.get('/', devAuthBypass, (req, res) => {
  try {
    const venues = Object.entries(venueScrapers).map(([id, scraper]) => ({
      id,
      name: scraper.name || id,
      url: scraper.url || (scraper.urls && scraper.urls.length > 0 ? scraper.urls[0] : null),
      type: id.includes('-') ? 'Venue' : 'General'
    }));
    
    res.json({
      success: true,
      count: venues.length,
      venues
    });
  } catch (error) {
    scrapeLogger.error({ error }, `Error listing venues: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving venue list'
    });
  }
});

/**
 * @route   GET /api/v1/venues/:venueId
 * @desc    Get a specific venue's information
 * @access  Public
 */
router.get('/:venueId', devAuthBypass, (req, res) => {
  try {
    const { venueId } = req.params;
    const scraper = venueScrapers[venueId];
    
    if (!scraper) {
      return res.status(404).json({
        success: false,
        message: `Venue '${venueId}' not found`
      });
    }
    
    res.json({
      success: true,
      venue: {
        id: venueId,
        name: scraper.name || venueId,
        url: scraper.url || (scraper.urls && scraper.urls.length > 0 ? scraper.urls[0] : null)
      }
    });
  } catch (error) {
    scrapeLogger.error({ error }, `Error getting venue: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving venue information'
    });
  }
});

/**
 * @route   GET /api/v1/venues/:venueId/events
 * @desc    Get events for a specific venue
 * @access  Public
 */
router.get('/:venueId/events', devAuthBypass, async (req, res) => {
  try {
    const { venueId } = req.params;
    const scraper = venueScrapers[venueId];
    
    if (!scraper) {
      return res.status(404).json({
        success: false,
        message: `Venue '${venueId}' not found`
      });
    }
    
    const logger = scrapeLogger.child({ 
      route: 'venue-events', 
      venue: venueId 
    });
    
    logger.info(`Scraping events for venue: ${venueId}`);
    const events = await scraper.scrape();
    
    // Format events for API response
    // Use our formatEventsForDatabase function to standardize event format
    const standardizedEvents = formatEventsForDatabase(events, scraper.name);
    
    // Format events for API response
    const formattedEvents = standardizedEvents.map(event => ({
      title: event.title,
      startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
      endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
      venue: {
        name: event.venue?.name,
        address: event.venue?.address,
        city: event.venue?.city,
        state: event.venue?.state
      },
      sourceURL: event.sourceURL,
      officialWebsite: event.officialWebsite,
      imageURL: event.imageURL,
      location: event.location,
      type: event.type,
      category: event.category,
      season: event.season,
      status: event.status,
      description: event.description
    }));
    
    logger.info(`Found ${events.length} events for venue ${venueId}`);
    
    res.json({
      success: true,
      venueId,
      venueName: scraper.name || venueId,
      count: events.length,
      events: formattedEvents
    });
  } catch (error) {
    scrapeLogger.error({ error }, `Error getting venue events: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving venue events'
    });
  }
});

/**
 * @route   GET /api/v1/venues/events/all
 * @desc    Get events from all venues
 * @access  Public
 */
router.get('/events/all', async (req, res) => {
  try {
    const logger = scrapeLogger.child({ route: 'all-venue-events' });
    logger.info('Fetching events from all venues');
    
    const allEvents = [];
    const results = {};
    
    // Process venues sequentially to avoid overwhelming websites
    for (const [venueId, scraper] of Object.entries(venueScrapers)) {
      try {
        logger.info(`Scraping events for venue: ${venueId}`);
        const events = await scraper.scrape();
        
        if (events && events.length > 0) {
          allEvents.push(...events);
          results[venueId] = {
            success: true,
            count: events.length
          };
        } else {
          results[venueId] = {
            success: true,
            count: 0
          };
        }
      } catch (error) {
        logger.error({ error }, `Error scraping venue ${venueId}: ${error.message}`);
        results[venueId] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Format all events using our standardized format
    const standardizedEvents = formatEventsForDatabase(allEvents, 'All Venues');
    
    // Format events for API response
    const formattedEvents = standardizedEvents.map(event => ({
      title: event.title,
      startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
      endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
      venue: {
        name: event.venue?.name,
        address: event.venue?.address,
        city: event.venue?.city,
        state: event.venue?.state
      },
      sourceURL: event.sourceURL,
      imageURL: event.imageURL,
      description: event.description,
      location: event.location,
      type: event.type,
      category: event.category
    }));
    
    logger.info(`Found ${allEvents.length} total events across all venues`);
    
    res.json({
      success: true,
      count: allEvents.length,
      results,
      events: formattedEvents
    });
  } catch (error) {
    scrapeLogger.error({ error }, `Error getting all venue events: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving venue events'
    });
  }
});

module.exports = router;
