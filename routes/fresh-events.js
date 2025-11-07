const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * BRAND NEW ENDPOINT - GUARANTEED FRESH DATA
 * Path: /api/fresh/ny-events
 */
router.get('/ny-events', async (req, res) => {
  try {
    // NUCLEAR CACHE BUSTING
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Accel-Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Timestamp', Date.now().toString());
    
    console.log(`🔍 FRESH ENDPOINT CALLED: ${new Date().toISOString()}`);
    
    // Direct database query
    const events = await Event.find({ city: 'New York' })
      .sort({ startDate: 1 })
      .limit(500)
      .lean()
      .exec();
    
    console.log(`✅ Queried database: ${events.length} events found`);
    
    // Transform to iOS format
    const transformed = events.map(e => ({
      id: e.id || e._id.toString(),
      title: e.title,
      date: e.startDate ? e.startDate.toISOString().split('T')[0] : null,
      startDate: e.startDate ? e.startDate.toISOString() : null,
      city: 'New York',
      venue: e.venue,
      url: e.sourceURL,
      categories: e.categories || []
    }));
    
    res.json({
      success: true,
      source: 'FRESH_DATABASE_QUERY',
      timestamp: new Date().toISOString(),
      dbTimestamp: Date.now(),
      count: transformed.length,
      events: transformed
    });
    
  } catch (error) {
    console.error('❌ Fresh endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
