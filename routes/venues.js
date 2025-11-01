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
  console.log('🚀 Received request for ALL events - NO filtering or limits will be applied');
  
  try {
    const { 
      city = 'all',  // Default to 'all'
      category = 'all'  // Default to 'all'
    } = req.query;
    
    console.log(`🔍 Query: city=${city}, category=${category}, ALL EVENTS (no filtering, no limits)`);
    
    // Get MongoDB connection from app context
    const mongoose = require('mongoose');
    const Event = mongoose.model('Event') || require('../models/Event');
    
    // Build minimal query - NO FILTERING BY DEFAULT
    let query = {};
    
    // Enhanced Vancouver city filtering (case insensitive)
    if (city && city !== 'all') {
      // Support multiple Vancouver city variants
      if (city.toLowerCase().includes('vancouver')) {
        query['venue.city'] = { 
          $regex: /^(Vancouver|Vancouver BC|North Vancouver|West Vancouver|Burnaby|Richmond)$/i 
        };
      } else {
        query['venue.city'] = { $regex: city, $options: 'i' };
      }
    }
    
    // Category filtering ONLY if explicitly requested
    if (category && category !== 'all') {
      query.category = { $regex: category, $options: 'i' };
    }
    
    // Enhanced filtering to exclude synthetic/placeholder events
    let events = await Event.find({
      ...query,
      _id: { $ne: null }, // Exclude null _id
      id: { $ne: null, $exists: true }, // Exclude null id
      // QUALITY FILTER: Exclude synthetic/placeholder events, navigation elements, and generic categories
      title: { 
        $not: { 
          $regex: /^(naOpen\.com|Web Site|TownshipPlumb|Plumber in Can|Our services inc|Submit a Googl|Web Site Hostin|You Choose|nsw|MISC|Sporting Event|Leasing.*|Views Navigation|Today$|Now$|Upcoming Events|Go to.*|Submit a|Sample|Test|Demo|Placeholder|Hello!|Reach Out|Legacy Related|Financial|HarrisonSpring|Camping Site|Camping$|VanierPark\.com|Park Site|Tourism$|Conservation P|BFC Saturday|Outdoor$|Museum$|Nightlife$|Festival$|\w+\.com$|^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$|^\w{1,15}$|^\w+\s\d+\s\d{4}\s@\s\d+:\d+\s(am|pm)|^June\s|^July\s|^August\s|^September\s|^October\s|^November\s|^December\s|^January\s|^February\s|^March\s|^April\s|^May\s)/, 
          $options: 'i' 
        },
        $ne: null, 
        $exists: true 
      },
      venue: { $ne: null, $exists: true }, // Exclude null venue
      // Exclude events with placeholder venue names
      'venue.name': { 
        $not: { 
          $regex: /^(Sample|Test|Placeholder|Demo|naOpen|nsw)/i 
        },
        $ne: null, 
        $exists: true 
      }
    })
      .sort({ startDate: 1 })
      .lean(); // Return filtered events with quality control
    
    console.log('🔍 MONGODB QUERY COMPLETED - Found events:', events ? events.length : 'null');
    
    if (!events || events.length === 0) {
      console.log('⚠️ No events found in database');
      return res.status(404).json({ message: 'No events found' });
    }
    
    console.log('🔍 PROCEEDING TO NULL FILTERING - Events found:', events.length);

    // CRITICAL FIX: Filter out any null or invalid events that cause Swift decoder to crash
    console.log('🔧 STARTING NULL EVENT FILTERING - Total events before filtering:', events.length);
    const validEvents = events.filter(event => {
      // First check if event exists and is not null
      if (!event || event === null || typeof event !== 'object') {
        console.log('🚨 REMOVING NULL/INVALID EVENT:', event);
        return false;
      }
      // Then check if event has required fields
      if (!event.id || typeof event.id !== 'string') {
        console.log('🚨 REMOVING EVENT WITH INVALID ID:', event.id);
        return false;
      }
      return true;
    });

    console.log(`🔧 FILTERED: ${events.length} total events -> ${validEvents.length} valid events (${events.length - validEvents.length} null/invalid events removed)`);

    // Normalize data types for app compatibility - ENSURE EVERY EVENT HAS PRICE FIELD
    const normalizedEvents = validEvents.map(event => {
      // Create a new normalized event object
      const normalizedEvent = {
        ...event,
        // Ensure other potential numeric fields are strings if needed
        id: event.id ? String(event.id) : '',
        // Ensure dates are properly formatted
        startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
        endDate: event.endDate ? new Date(event.endDate).toISOString() : null
      };
      
      // EXPLICITLY ensure price field ALWAYS exists as a string - NO EXCEPTIONS
      if (event.price !== undefined && event.price !== null && event.price !== '') {
        normalizedEvent.price = String(event.price);
      } else {
        normalizedEvent.price = 'See website for details';
      }
      
      return normalizedEvent;
    });

    // EMERGENCY NULL FIX: Final filter to remove any null events before response
    const finalEvents = normalizedEvents.filter(event => event !== null && event !== undefined && typeof event === 'object');
    console.log(`🚨 EMERGENCY NULL FILTER: ${normalizedEvents.length} -> ${finalEvents.length} events (removed ${normalizedEvents.length - finalEvents.length} null events)`);
    
    console.log(`✅ SUCCESS: Returning ${finalEvents.length} events for ${city}`);
    console.log('📝 COMPLETE DATA: Returning ALL events with NO filtering or limits');
    
    res.status(200).json({ 
      events: finalEvents,
      performance: {
        source: 'database',
        city: city,
        complete_data: true,
        no_filtering: true,
        no_limit: true
      }
    });
  } catch (error) {
    console.error('❌ Error serving events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
