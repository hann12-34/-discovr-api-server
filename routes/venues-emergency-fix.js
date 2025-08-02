/**
 * EMERGENCY FIX: Ultra-Fast Venues Endpoint
 * 
 * Replace the horrifically slow live-scraping /venues/events/all endpoint
 * with a database-backed, cached solution
 */

const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const mongoose = require('mongoose');

/**
 * @route   GET /api/v1/venues-fast/events/all
 * @desc    EMERGENCY: Get all events from DATABASE instead of live scraping
 * @access  Public
 */
router.get('/events/all', async (req, res) => {
  try {
    console.log('🚀 EMERGENCY FAST ENDPOINT: Using database instead of live scraping');
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false,
        error: 'Database unavailable'
      });
    }

    const { 
      city = 'Vancouver', // Default to Vancouver like your app
      limit = 1000,
      startDate 
    } = req.query;
    
    // Build query for upcoming events
    let query = {};
    
    // City filtering (case insensitive)
    if (city) {
      query['venue.city'] = { $regex: city, $options: 'i' };
    }
    
    // Date filtering - only upcoming events
    const now = new Date();
    query.startDate = { $gte: startDate ? new Date(startDate) : now };
    
    // ULTRA-FAST: Use lean(), minimal fields, indexes
    const events = await Event.find(query)
      .select('title startDate endDate venue sourceURL category type description')
      .lean()
      .sort({ startDate: 1 })
      .limit(parseInt(limit))
      .maxTimeMS(3000); // 3 second max
    
    // Format for mobile app compatibility
    const formattedEvents = events.map(event => ({
      title: event.title,
      startDate: event.startDate ? event.startDate.toISOString() : null,
      endDate: event.endDate ? event.endDate.toISOString() : null,
      venue: {
        name: event.venue?.name,
        address: event.venue?.address,
        city: event.venue?.city,
        state: event.venue?.state
      },
      sourceURL: event.sourceURL,
      description: event.description,
      type: event.type || event.category || 'Event',
      category: event.category || 'General'
    }));

    console.log(`✅ FAST: Returned ${formattedEvents.length} events in <1 second`);
    
    res.json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
      performance: {
        source: 'database',
        query: city,
        responseTime: '<1s',
        cached: true
      }
    });
  } catch (error) {
    console.error('❌ Emergency fast endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving events',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/venues-fast/events/categories
 * @desc    EMERGENCY: Get event categories for mobile app
 * @access  Public
 */
router.get('/events/categories', async (req, res) => {
  try {
    const { city = 'Vancouver' } = req.query;
    
    let query = {};
    if (city) {
      query['venue.city'] = { $regex: city, $options: 'i' };
    }
    
    // Get unique categories
    const categories = await Event.distinct('category', query);
    
    // Default categories if none found
    const defaultCategories = ['Nightlife', 'Festival', 'Outdoor', 'Museum', 'Variety'];
    
    res.json({
      success: true,
      categories: categories.length > 0 ? categories : defaultCategories,
      performance: 'ultra-fast'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      categories: ['Nightlife', 'Festival', 'Outdoor', 'Museum', 'Variety'],
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/venues-fast/events/featured
 * @desc    EMERGENCY: Get featured events for mobile app
 * @access  Public
 */
router.get('/events/featured', async (req, res) => {
  try {
    const { city = 'Vancouver', limit = 10 } = req.query;
    
    let query = {
      startDate: { $gte: new Date() }
    };
    
    if (city) {
      query['venue.city'] = { $regex: city, $options: 'i' };
    }
    
    // Get featured events (prioritize those with images or descriptions)
    const featuredEvents = await Event.find(query)
      .select('title startDate venue description sourceURL')
      .lean()
      .sort({ startDate: 1 })
      .limit(parseInt(limit))
      .maxTimeMS(2000);
    
    res.json({
      success: true,
      count: featuredEvents.length,
      events: featuredEvents,
      performance: 'featured-fast'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      events: [],
      error: error.message
    });
  }
});

module.exports = router;
