const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * @route   GET /api/direct/events
 * @desc    Get events DIRECTLY from database, bypassing all caches
 * @access  Public
 */
router.get('/events', async (req, res) => {
  try {
    // FORCE NO CACHE
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Accel-Expires', '0');
    
    const { city } = req.query;
    
    // Build query
    const query = {};
    if (city) {
      query.city = city;
    }
    
    console.log(`🔍 DIRECT DB QUERY: ${JSON.stringify(query)}`);
    
    // Query database DIRECTLY
    const events = await Event.find(query)
      .sort({ startDate: 1 })
      .limit(200)
      .lean()
      .exec();
    
    console.log(`✅ Found ${events.length} events in database`);
    
    // Return with timestamp to prove freshness
    res.json({
      success: true,
      source: 'DIRECT_DATABASE_QUERY',
      timestamp: new Date().toISOString(),
      query,
      count: events.length,
      events: events.map(e => ({
        id: e.id || e._id,
        title: e.title,
        date: e.startDate ? e.startDate.toISOString().split('T')[0] : null,
        startDate: e.startDate,
        city: e.city,
        venue: e.venue,
        sourceURL: e.sourceURL,
        categories: e.categories
      }))
    });
    
  } catch (error) {
    console.error('❌ Direct DB query error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
