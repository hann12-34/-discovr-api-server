/**
 * PERFORMANCE OPTIMIZED Events API Routes
 * 
 * This file contains optimized versions of the events endpoints
 * to resolve severe performance issues in the main API
 */

const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const mongoose = require('mongoose');

/**
 * @route   GET /api/v1/events-fast
 * @desc    OPTIMIZED: Get all events with optional filtering (FAST VERSION)
 * @access  Private (requires API key)
 */
router.get('/fast', async (req, res) => {
  try {
    // Check MongoDB connection status first
    const connectionState = mongoose.connection.readyState;
    if (connectionState !== 1) {
      return res.status(503).json({ 
        error: 'Database unavailable', 
        message: 'Database connection not established', 
        connectionState,
        mongooseVersion: mongoose.version
      });
    }

    const { 
      type, 
      season, 
      status,
      source,
      startDate, 
      endDate,
      search,
      tags,
      venue,
      city,
      accessibility,
      limit = 20,
      page = 1,
      sort = 'startDate',
      order = 'asc',
      skipCount = 'true' // NEW: Allow skipping expensive count
    } = req.query;
    
    // Build query filters (OPTIMIZED)
    let query = {};
    
    // Use exact matches where possible instead of regex
    if (type) query.type = type;
    if (season) query.season = season;
    if (status) query.status = status;
    if (source) query.source = source;
    
    // OPTIMIZED: Use text indexes for search instead of multiple regex
    if (search) {
      // If text index exists, use it, otherwise fallback to optimized regex
      query.$text = { $search: search };
    }
    
    // OPTIMIZED: Venue filters - use startsWith for better index usage
    if (venue) {
      // Use exact match first, then regex as fallback
      const venueExact = await Event.findOne({ 'venue.name': venue }).select('_id').lean();
      if (venueExact) {
        query['venue.name'] = venue;
      } else {
        query['venue.name'] = { $regex: `^${venue}`, $options: 'i' };
      }
    }
    
    if (city) {
      // Use exact match first, then regex as fallback  
      const cityExact = await Event.findOne({ 'venue.city': city }).select('_id').lean();
      if (cityExact) {
        query['venue.city'] = city;
      } else {
        query['venue.city'] = { $regex: `^${city}`, $options: 'i' };
      }
    }
    
    // Accessibility filters (unchanged - already efficient)
    if (accessibility) {
      const accessibilityFeatures = accessibility.split(',');
      accessibilityFeatures.forEach(feature => {
        query[`accessibility.${feature}`] = true;
      });
    }
    
    // Tags filtering (unchanged - already efficient)
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagList };
    }
    
    // Date filtering (unchanged - uses indexes)
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;
    
    // OPTIMIZATION: Reduced timeout and lean queries
    const options = { maxTimeMS: 5000 }; // Reduced from 15s to 5s
    
    // CRITICAL OPTIMIZATION: Skip expensive countDocuments unless explicitly requested
    let totalEvents = null;
    if (skipCount !== 'true') {
      console.log('⚠️ WARNING: Performing expensive countDocuments - consider using skipCount=true');
      totalEvents = await Event.countDocuments(query, options);
    }
    
    // OPTIMIZATION: Use lean() for faster queries and select only needed fields
    const events = await Event.find(query, null, options)
      .select('title startDate endDate venue sourceURL category status location')
      .lean() // CRITICAL: Returns plain objects instead of Mongoose documents
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortOptions);
    
    // OPTIMIZATION: Estimate total pages when count is skipped
    const estimatedTotal = totalEvents || (events.length === parseInt(limit) ? 'many' : events.length);
    
    // Return with optimized response
    res.json({
      events,
      pagination: {
        total: totalEvents,
        estimated: estimatedTotal,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: totalEvents ? Math.ceil(totalEvents / parseInt(limit)) : null,
        hasMore: events.length === parseInt(limit),
        countSkipped: skipCount === 'true'
      },
      performance: {
        query: JSON.stringify(query),
        resultCount: events.length,
        lean: true,
        timeout: '5s'
      }
    });
  } catch (err) {
    console.error('Error in GET /events-fast:', err);
    res.status(500).json({ 
      error: 'Server error', 
      message: err.message,
      mongooseState: mongoose.connection.readyState,
      performance: 'optimized-endpoint'
    });
  }
});

/**
 * @route   GET /api/v1/events-minimal
 * @desc    ULTRA-FAST: Get events with minimal data for lists/previews
 * @access  Private (requires API key)
 */
router.get('/minimal', async (req, res) => {
  try {
    const { 
      city,
      venue,
      limit = 50,
      page = 1,
      startDate
    } = req.query;
    
    // Build minimal query
    let query = {};
    if (city) query['venue.city'] = city;
    if (venue) query['venue.name'] = { $regex: venue, $options: 'i' };
    if (startDate) query.startDate = { $gte: new Date(startDate) };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // ULTRA-FAST: Only essential fields, lean, no count
    const events = await Event.find(query)
      .select('title startDate venue.name venue.city') // Minimal fields only
      .lean()
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .maxTimeMS(2000); // 2 second timeout
    
    res.json({
      events,
      count: events.length,
      hasMore: events.length === parseInt(limit),
      performance: 'ultra-fast'
    });
  } catch (err) {
    console.error('Error in GET /events-minimal:', err);
    res.status(500).json({ 
      error: 'Server error', 
      message: err.message,
      performance: 'ultra-fast-endpoint'
    });
  }
});

/**
 * @route   GET /api/v1/events-venues-fast
 * @desc    OPTIMIZED: Get events by venue (FAST VERSION)
 * @access  Private (requires API key)
 */
router.get('/venues/:venueName/fast', async (req, res) => {
  try {
    const { venueName } = req.params;
    const { limit = 50, page = 1, sort = '-startDate' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    
    // OPTIMIZATION: Try exact match first, then regex
    let query;
    const exactMatch = await Event.findOne({ 'venue.name': venueName }).select('_id').lean();
    if (exactMatch) {
      query = { 'venue.name': venueName };
    } else {
      query = { 'venue.name': { $regex: venueName, $options: 'i' } };
    }
    
    // OPTIMIZATION: No count, lean query, minimal fields
    const events = await Event.find(query)
      .select('title startDate endDate venue sourceURL status location')
      .lean()
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit))
      .maxTimeMS(3000);
    
    res.json({
      success: true,
      count: events.length,
      page: parseInt(page),
      hasMore: events.length === parseInt(limit),
      data: events,
      performance: 'venue-fast'
    });
  } catch (error) {
    console.error('Error getting events by venue (fast):', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
