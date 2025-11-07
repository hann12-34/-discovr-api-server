const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');

/**
 * DIAGNOSTIC ENDPOINT - Shows exactly what database/collection the API is using
 */
router.get('/info', async (req, res) => {
  try {
    const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'NOT CONNECTED';
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Get collection info
    let collectionInfo = [];
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      collectionInfo = collections.map(c => c.name);
    }
    
    // Get event counts
    const totalEvents = await Event.countDocuments({}).catch(() => 0);
    const nyEvents = await Event.countDocuments({ city: 'New York' }).catch(() => 0);
    
    // Get sample event
    const sampleEvent = await Event.findOne({ city: 'New York' }).lean().catch(() => null);
    
    // Check for junk
    const hasEcovadis = await Event.findOne({ title: /ecovadis/i }).lean().catch(() => null);
    const hasVortxz = await Event.findOne({ title: /vortxz/i }).lean().catch(() => null);
    
    res.json({
      timestamp: new Date().toISOString(),
      database: {
        name: dbName,
        connectionState: connectionStates[connectionState] || 'unknown',
        stateCode: connectionState
      },
      collections: collectionInfo,
      events: {
        total: totalEvents,
        newYork: nyEvents
      },
      sampleEvent: sampleEvent ? {
        id: sampleEvent.id || sampleEvent._id,
        title: sampleEvent.title,
        date: sampleEvent.startDate || sampleEvent.date
      } : null,
      junkCheck: {
        hasEcovadis: !!hasEcovadis,
        hasVortxz: !!hasVortxz,
        isClean: !hasEcovadis && !hasVortxz
      },
      environment: {
        nodeVersion: process.version,
        mongooseVersion: mongoose.version
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
