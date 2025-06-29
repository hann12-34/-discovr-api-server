const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Event = require('../models/Event');

// Path to Fortune Sound Club JSON file
const FORTUNE_JSON_PATH = path.join(__dirname, '../Scrapers/FortuneSound/fortune_events.json');

/**
 * @route POST /api/v1/import/fortune
 * @description Import Fortune Sound Club events from JSON file to MongoDB
 * @access Private (admin only)
 */
router.post('/fortune', async (req, res) => {
  try {
    // Read Fortune Sound Club events from JSON file
    const eventsData = fs.readFileSync(FORTUNE_JSON_PATH, 'utf8');
    const events = JSON.parse(eventsData);
    
    console.log(`Found ${events.length} events from Fortune Sound Club to import`);
    
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each event
    for (const event of events) {
      try {
        // Generate a consistent ID based on event properties to avoid duplicates
        const idSource = `${event.title}-${event.venue?.name || 'Fortune Sound Club'}-${event.startDate}`;
        const id = event.id || uuidv4();
        
        // Prepare event data for MongoDB
        const eventData = {
          ...event,
          id,
          lastUpdated: new Date()
        };
        
        // Check if event already exists
        const existingEvent = await Event.findOne({ 
          $or: [
            { id },
            { 
              title: event.title, 
              "venue.name": event.venue?.name || 'Fortune Sound Club',
              startDate: event.startDate
            }
          ]
        });
        
        if (existingEvent) {
          // Update existing event
          await Event.updateOne({ _id: existingEvent._id }, { $set: eventData });
          updatedCount++;
        } else {
          // Create new event
          await Event.create(eventData);
          importedCount++;
        }
      } catch (eventError) {
        console.error(`Error importing event: ${event.title}`, eventError);
        errorCount++;
      }
    }
    
    // Return import statistics
    res.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      errors: errorCount,
      total: events.length
    });
    
  } catch (error) {
    console.error('Error importing Fortune Sound Club events:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing events',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/import/batch
 * @description Import batch of events
 * @access Private (admin only)
 */
router.post('/batch', async (req, res) => {
  try {
    const events = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Events must be an array'
      });
    }
    
    console.log(`Received ${events.length} events to import`);
    
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each event
    for (const event of events) {
      try {
        // Generate ID if not provided
        const id = event.id || uuidv4();
        
        // Prepare event data for MongoDB
        const eventData = {
          ...event,
          id,
          lastUpdated: new Date()
        };
        
        // Check if event already exists
        const existingEvent = await Event.findOne({ 
          $or: [
            { id },
            { 
              title: event.title, 
              "venue.name": event.venue?.name,
              startDate: event.startDate
            }
          ]
        });
        
        if (existingEvent) {
          // Update existing event
          await Event.updateOne({ _id: existingEvent._id }, { $set: eventData });
          updatedCount++;
        } else {
          // Create new event
          await Event.create(eventData);
          importedCount++;
        }
      } catch (eventError) {
        console.error(`Error importing event: ${event.title || 'Unknown Event'}`, eventError);
        errorCount++;
      }
    }
    
    // Return import statistics
    res.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      errors: errorCount,
      total: events.length
    });
    
  } catch (error) {
    console.error('Error importing batch events:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing events',
      error: error.message
    });
  }
});

module.exports = router;
