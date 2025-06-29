const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const mongoose = require('mongoose');

/**
 * @route   GET /api/v1/events/venues/:venueName
 * @desc    Get all events for a specific venue
 * @access  Private (requires API key)
 */
router.get('/venues/:venueName', async (req, res) => {
  try {
    const { venueName } = req.params;
    const { limit = 50, page = 1, sort = '-startDate' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    
    // Find events by venue name (case insensitive)
    const venueRegex = new RegExp(venueName, 'i');
    const query = { 'venue.name': { $regex: venueRegex } };
    
    // Get total count
    const count = await Event.countDocuments(query);
    
    // Get events with pagination
    const events = await Event.find(query)
      .select('name startDate endDate venue sourceURL imageURL status location latitude longitude officialWebsite')
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count,
      pages: Math.ceil(count / parseInt(limit)),
      page: parseInt(page),
      data: events
    });
  } catch (error) {
    console.error('Error getting events by venue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/v1/events
 * @desc    Simple test endpoint to verify API connectivity
 */
router.get('/test', (req, res) => {
  res.status(200).json({ message: 'API is working correctly', timestamp: new Date() });
});

/**
 * @route   GET /api/v1/events
 * @desc    Get all events with optional filtering
 * @access  Private (requires API key)
 */
router.get('/', async (req, res) => {
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
      order = 'asc'
    } = req.query;
    
    // Build query filters
    let query = {};
    
    if (type) query.type = type;
    if (season) query.season = season;
    if (status) query.status = status;
    if (source) query.source = source;
    
    // Venue filters
    if (venue) query['venue.name'] = { $regex: venue, $options: 'i' };
    if (city) query['venue.city'] = { $regex: city, $options: 'i' };
    
    // Accessibility filters
    if (accessibility) {
      const accessibilityFeatures = accessibility.split(',');
      accessibilityFeatures.forEach(feature => {
        query[`accessibility.${feature}`] = true;
      });
    }
    
    // Tags filtering (comma-separated list)
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagList };
    }
    
    // Text search (across multiple fields)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'venue.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date filtering
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
    
    // Set timeouts for all operations
    const options = { maxTimeMS: 15000 }; // 15 second timeout
    
    // Get total count for pagination metadata with timeout
    const totalEvents = await Event.countDocuments(query, options);
    
    // Execute query with pagination and timeout
    const events = await Event.find(query, null, options)
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortOptions);
    
    // Return with pagination metadata
    res.json({
      events,
      pagination: {
        total: totalEvents,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalEvents / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in GET /events:', err);
    res.status(500).json({ 
      error: 'Server error', 
      message: err.message,
      mongooseState: mongoose.connection.readyState
    });
  }
});

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get a single event by ID
 * @access  Private (requires API key)
 */
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   POST /api/v1/events
 * @desc    Create a new event
 * @access  Private (requires API key)
 */
router.post('/', async (req, res) => {
  try {
    console.log('Received event data:', JSON.stringify(req.body, null, 2));

    const eventData = { ...req.body };
    
    // Create and save the new event
    const event = new Event(eventData);
    
    // Set default end date if not provided
    if (!event.endDate && event.startDate) {
      event.endDate = new Date(event.startDate);
      event.endDate.setHours(event.endDate.getHours() + 1); // Default 1 hour
    }
    
    // Determine season if not provided
    if (!event.season) {
      const month = new Date(event.startDate).getMonth();
      
      if ([11, 0, 1].includes(month)) event.season = 'winter';
      else if ([2, 3, 4].includes(month)) event.season = 'spring';
      else if ([5, 6, 7].includes(month)) event.season = 'summer';
      else event.season = 'fall';
    }
    
    // Determine status if not provided
    if (!event.status) {
      const now = new Date();
      if (event.startDate > now) {
        // More than a week away is upcoming, otherwise active
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        
        event.status = event.startDate > oneWeekFromNow ? 'upcoming' : 'active';
      } else if (event.endDate && event.endDate > now) {
        event.status = 'active';
      } else {
        event.status = 'ended';
      }
    }
    
    console.log('Saving event with processed data:', event);
    await event.save();
    console.log('Event saved successfully with ID:', event._id);
    
    res.status(201).json(event);
  } catch (err) {
    console.error('Error saving event:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      console.error('Validation errors:', messages);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * @route   PUT /api/v1/events/:id
 * @desc    Update an existing event
 * @access  Private (requires API key)
 */
router.put('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Update the event with new data
    Object.keys(req.body).forEach(key => {
      event[key] = req.body[key];
    });
    
    // Save the updated event
    await event.save();
    res.json(event);
  } catch (err) {
    console.error(err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/v1/events/:id
 * @desc    Delete an event
 * @access  Private (requires API key)
 */
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    await event.deleteOne();
    res.json({ message: 'Event removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   POST /api/v1/events/bulk
 * @desc    Create multiple events at once
 * @access  Private (requires API key)
 */
router.post('/bulk', async (req, res) => {
  try {
    // Check if request body is an array
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be an array of events' });
    }

    const events = [];
    const errors = [];
    
    // Process each event in the array
    for (let i = 0; i < req.body.length; i++) {
      try {
        const eventData = req.body[i];
        const event = new Event(eventData);
        
        // Set default end date if not provided
        if (!event.endDate && event.startDate) {
          event.endDate = new Date(event.startDate);
          event.endDate.setHours(event.endDate.getHours() + 1); // Default 1 hour
        }
        
        // Determine season if not provided
        if (!event.season) {
          const month = event.startDate.getMonth();
          
          if ([11, 0, 1].includes(month)) event.season = 'winter';
          else if ([2, 3, 4].includes(month)) event.season = 'spring';
          else if ([5, 6, 7].includes(month)) event.season = 'summer';
          else event.season = 'fall';
        }
        
        // Determine status if not provided
        if (!event.status) {
          const now = new Date();
          if (event.startDate > now) {
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            event.status = event.startDate > oneWeekFromNow ? 'upcoming' : 'active';
          } else if (event.endDate && event.endDate > now) {
            event.status = 'active';
          } else {
            event.status = 'ended';
          }
        }
        
        await event.save();
        events.push(event);
      } catch (err) {
        errors.push({
          index: i,
          error: err.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      created: events.length,
      events,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   PUT /api/v1/events/bulk
 * @desc    Update multiple events at once
 * @access  Private (requires API key)
 */
router.put('/bulk', async (req, res) => {
  try {
    // Check if request body is an array
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be an array of events with IDs' });
    }

    const updated = [];
    const errors = [];
    
    // Process each event in the array
    for (let i = 0; i < req.body.length; i++) {
      try {
        const eventData = req.body[i];
        
        // Each event in the array must have an ID
        if (!eventData._id) {
          errors.push({
            index: i,
            error: 'Missing event ID'
          });
          continue;
        }
        
        // Find and update the event
        const event = await Event.findById(eventData._id);
        if (!event) {
          errors.push({
            index: i,
            id: eventData._id,
            error: 'Event not found'
          });
          continue;
        }
        
        // Update the event with new data
        Object.keys(eventData).forEach(key => {
          if (key !== '_id') {
            event[key] = eventData[key];
          }
        });
        
        await event.save();
        updated.push(event);
      } catch (err) {
        errors.push({
          index: i,
          error: err.message,
          id: req.body[i]._id
        });
      }
    }
    
    res.json({
      success: true,
      updated: updated.length,
      events: updated,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/v1/events/bulk
 * @desc    Delete multiple events at once
 * @access  Private (requires API key)
 */
router.delete('/bulk', async (req, res) => {
  try {
    // Body should contain an array of event IDs
    if (!Array.isArray(req.body) || !req.body.every(id => typeof id === 'string')) {
      return res.status(400).json({ error: 'Request body must be an array of event IDs' });
    }
    
    const result = await Event.deleteMany({ _id: { $in: req.body } });
    
    res.json({
      success: true,
      deleted: result.deletedCount,
      message: `${result.deletedCount} events removed`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/v1/events/venues/:venueName
 * @desc    Get events by venue name
 * @access  Private (requires API key)
 */
router.get('/venues/:venueName', async (req, res) => {
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
    
    const venueName = req.params.venueName;
    console.log(`Searching for events at venue: ${venueName}`);
    
    // Get pagination parameters
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Build query for venue name with case-insensitive regex
    const query = { 'venue.name': { $regex: new RegExp(venueName, 'i') } };
    
    // Set timeout for all operations
    const options = { maxTimeMS: 10000 }; // 10 second timeout
    
    // Get total count and events in parallel
    const [totalEvents, events] = await Promise.all([
      Event.countDocuments(query, options),
      Event.find(query, null, options)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
    ]);
    
    res.json({
      events,
      pagination: {
        total: totalEvents,
        page,
        limit,
        pages: Math.ceil(totalEvents / limit)
      }
    });
  } catch (err) {
    console.error(`Error getting events for venue '${req.params.venueName}':`, err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

/**
 * @route   GET /api/v1/events/search
 * @desc    Advanced search endpoint with full-text search capabilities
 * @access  Private (requires API key)
 */
router.get('/search', async (req, res) => {
  try {
    const { query, fields, limit = 20, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Define which fields to search in
    const searchFields = fields ? fields.split(',') : ['name', 'description', 'location', 'venue.name', 'tags'];
    
    // Build the search query
    const searchQuery = { $or: [] };
    
    searchFields.forEach(field => {
      const fieldQuery = {};
      fieldQuery[field] = { $regex: query, $options: 'i' };
      searchQuery.$or.push(fieldQuery);
    });
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination metadata
    const totalEvents = await Event.countDocuments(searchQuery);
    
    // Execute the search
    const events = await Event.find(searchQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ startDate: 1 });
    
    // Return with pagination metadata
    res.json({
      events,
      pagination: {
        total: totalEvents,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalEvents / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @route   DELETE /api/v1/events/:eventId
 * @desc    Delete an event by its ID
 * @access  Private (requires API key or JWT)
 */
router.delete('/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Validate if eventId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, message: 'Event deleted successfully', data: event });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting event', error: error.message });
  }
});


/**
 * @route   PUT /api/v1/events/:eventId
 * @desc    Update an event by its ID
 * @access  Private (requires API key or JWT)
 */
router.put('/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const updates = req.body;

    // Validate if eventId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    // Example: Prevent updating the _id or sourceURL if it's system-generated
    // delete updates._id; 
    // delete updates.sourceURL; 

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updates }, // Use $set to apply updates
      { new: true, runValidators: true } // Options: new=true returns the modified document, runValidators ensures schema validation
    );

    if (!updatedEvent) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, message: 'Event updated successfully', data: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Server error while updating event', error: error.message });
  }
});

module.exports = router;
