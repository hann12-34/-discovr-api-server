/**
 * NUCLEAR NULL FIX - Emergency venue routes with guaranteed null event removal
 */
const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const router = express.Router();

/**
 * NUCLEAR NULL FIX: Get ALL events with guaranteed null removal
 */
router.get('/events/all', async (req, res) => {
  console.log('🚨 NUCLEAR NULL FIX ROUTE HIT - Guaranteed null event removal');
  
  try {
    // Get ALL events from database
    let events = await Event.find({})
      .sort({ startDate: 1 })
      .lean();
    
    console.log(`🔍 Raw database query returned: ${events.length} events`);
    
    // NUCLEAR NULL FILTERING - Remove ANYTHING that is null, undefined, or invalid
    const validEvents = events.filter(event => {
      if (!event || event === null || event === undefined) {
        console.log('🚨 REMOVING NULL EVENT');
        return false;
      }
      if (typeof event !== 'object') {
        console.log('🚨 REMOVING NON-OBJECT EVENT');
        return false;
      }
      if (!event.id || !event.title || !event.venue) {
        console.log('🚨 REMOVING EVENT WITH MISSING REQUIRED FIELDS');
        return false;
      }
      return true;
    });
    
    console.log(`🚨 NUCLEAR FILTER COMPLETE: ${events.length} -> ${validEvents.length} events (removed ${events.length - validEvents.length} invalid events)`);
    
    // Return only valid events
    res.status(200).json({ 
      events: validEvents,
      success: true,
      message: `Nuclear null fix applied - ${validEvents.length} valid events returned`,
      filtered_out: events.length - validEvents.length
    });
    
  } catch (error) {
    console.error('❌ NUCLEAR NULL FIX ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: 'Nuclear null fix failed',
      message: error.message 
    });
  }
});

module.exports = router;
