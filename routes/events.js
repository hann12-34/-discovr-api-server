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
 * @route   GET /api/v1/events/cities
 * @desc    Get distinct cities with event counts (lightweight)
 */
router.get('/cities', async (req, res) => {
  try {
    const results = await Event.aggregate([
      { $match: { city: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { city: '$_id', count: 1, _id: 0 } }
    ]).option({ maxTimeMS: 15000 });
    res.json({ cities: results });
  } catch (err) {
    res.status(500).json({ cities: [], error: err.message });
  }
});

/**
 * @route   GET /api/v1/events
 * @desc    Get all events with optional filtering
 * @access  Private (requires API key)
 */
router.get('/', async (req, res) => {
  try {
    // FORCE NO CACHE - ensure fresh data every time
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
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
      cities,  // NEW: comma-separated list of cities for lazy loading
      accessibility,
      limit = 10000, // Default 10000 events - no practical limit
      page = 1,
      sort = 'city', // Sort by city first to distribute events evenly across cities
      order = 'asc'
    } = req.query;
    
    // Build query filters - only include legitimate events
    let query = {};
    
    // Apply post-query filtering in JavaScript since MongoDB regex isn't working as expected
    
    if (type) query.type = type;
    if (season) query.season = season;
    if (status) query.status = status;
    if (source) query.source = source;
    
    // Venue filters
    if (venue) query['venue.name'] = { $regex: venue, $options: 'i' };
    
    // Multi-city filtering (for lazy loading by country)
    if (cities) {
      const cityList = cities.split(',').map(c => c.trim());
      console.log(`Multi-city filter requested: ${cityList.join(', ')}`);
      query.city = { $in: cityList };
    }
    // Single city filtering — anchored regex for index efficiency
    else if (city) {
      console.log(`City filter requested: ${city}`);
      const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (city.toLowerCase().includes('vancouver')) {
        query.city = { $regex: '^(Vancouver|North Vancouver|West Vancouver|Burnaby|Richmond)$', $options: 'i' };
      } else {
        query.city = { $regex: `^${escapedCity}$`, $options: 'i' };
      }
    }
    
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
    
    // Date filtering — default to 30 days ago when city is specified to prevent full-collection scans
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    } else if (city || cities) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.startDate = { $gte: thirtyDaysAgo };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;
    
    // Set timeouts for all operations
    const options = { maxTimeMS: 15000 }; // 15 second timeout
    

    // Skip countDocuments by default — expensive full scan, not needed by iOS app
    const { skipCount = 'true' } = req.query;
    
    // Get total count for pagination metadata with timeout (CONDITIONALLY)
    let totalEvents = null;
    if (skipCount !== 'true') {
      totalEvents = await Event.countDocuments(query, options);
    }
    
    // Execute query with pagination and timeout

    // Debug logging
    console.log('MongoDB Query:', JSON.stringify(query, null, 2));
    
    // Get all events matching query first, then apply quality filtering
    // Cap MongoDB fetch to prevent OOM: fetch at most limit*4 or 2000, whichever is smaller
    const mongoFetchLimit = Math.min(parseInt(limit) * 4, 2000);
    const allEvents = await Event.find(query, null, options)
      .lean() // PATCH: Use lean() for 50-80% performance improvement
      .sort(sortOptions)
      .limit(mongoFetchLimit);
      
    console.log(`Query returned ${allEvents.length} events`);
    
    // Filter for real events only with aggressive quality control
    const realEvents = allEvents.filter(event => {
      // BYPASS FILTER: Allow all manually added events from admin panel
      if (event.source === 'admin' || event.source === 'manual') {
        console.log(`✅ Admin event bypassing filter: ${event.title}`);
        return true;
      }
      
      const title = event.title ? event.title.trim() : '';
      const venue = event.venue || {};
      const venueName = typeof venue === 'object' ? venue.name : venue;
      
      // Must have title
      if (!title || title.length < 3) return false;
      
      // BLOCK LIST - Exact matches to exclude
      const blockedTitles = [
        'hello! looking', 'hello!', 'reach out', 'legacy related', 'financial',
        'camping site', 'camping', 'vanierpark.com', 'park site', 'tourism',
        'conservation p', 'bfc saturday', 'outdoor', 'museum',
        'festival', 'harrisonspring', 'today', 'now', 'upcoming events',
        'views navigation', 'leasing', 'go to', 'mon', 'tue', 'wed', 'thu',
        'fri', 'sat', 'sun', 'leasing, event bookings or film permits'
      ];
      
      const lowerTitle = title.toLowerCase();
      
      // Block exact matches and partial matches
      if (blockedTitles.some(blocked => 
        lowerTitle === blocked || 
        lowerTitle.startsWith(blocked + ' ') ||
        lowerTitle.startsWith(blocked)
      )) return false;
      
      // Block date patterns like "June 8 2025 @ 7:30 pm"
      if (/^\w+\s+\d+\s+\d{4}\s+@\s+\d+:\d+\s+(am|pm)/i.test(title)) return false;
      
      // Block month names at start
      if (/^(june|july|august|september|october|november|december|january|february|march|april|may)\s/i.test(title)) return false;
      
      // Block very short generic words
      if (/^\w{1,15}$/i.test(title) && !/™|®|©/.test(title)) return false;
      
      // ALLOW LIST - Must have real event characteristics
      const hasEventKeywords = /\b(show|concert|exhibition|theater|theatre|performance|live|disney|music|art|comedy|dance|workshop|class|tour|experience|play|musical|opera|ballet|night)\b/i.test(title);
      const hasColon = title.includes(':');
      const hasTrademark = /™|®|©/.test(title);
      const isDescriptive = title.length >= 25 && !lowerTitle.includes('admin') && !lowerTitle.includes('leasing');
      const isKnownVenue = /rogers arena|science world|aquarium|queen elizabeth|chan centre|orpheum|grey eagle|palace theatre|spruce meadows|calgary zoo|heritage park|place des arts|bell centre|theatre st-denis|maison symphonique|salle wilfrid-pelletier|hollywood bowl|crypto\.com arena|the novo|greek theatre|wiltern|el rey|troubadour|the roxy|the abbey|exchange la|avalon|sound nightclub|the fonda|teragram|1720|lodge room|moroccan lounge|catch one|zebulon|e11even|club space|liv miami|story miami|treehouse|basement miami|wharf miami|exchange miami|showbox|neumos|kremwerk|neptune|paramount|crocodile|foundation nightclub/i.test(venueName || '');
      
      return hasEventKeywords || hasColon || hasTrademark || isDescriptive || isKnownVenue;
    });
    
    // CRITICAL: Filter out events missing required fields for iOS app
    const validEvents = realEvents.filter(event => {
      // Must have id field (critical for iOS decoding)
      if (!event.id && !event._id) {
        console.warn(`⚠️ Event missing id field: ${event.title || 'Unknown'}`);
        return false;
      }
      
      // Must have title
      if (!event.title || typeof event.title !== 'string') {
        console.warn(`⚠️ Event missing valid title field`);
        return false;
      }
      
      // Must have venue object with name
      if (!event.venue || typeof event.venue !== 'object' || !event.venue.name) {
        console.warn(`⚠️ Event missing valid venue: ${event.title}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Validated events: ${validEvents.length} of ${realEvents.length} passed validation`);
    
    // Deduplicate by title + venue + date (same event from different scraper runs can have different IDs)
    const seen = new Map();
    const deduplicatedEvents = validEvents.filter(event => {
      const title = (event.title || '').toLowerCase().trim();
      const venueName = (event.venue && event.venue.name ? event.venue.name : '').toLowerCase().trim();
      const dateKey = event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '';
      const key = `${title}|${venueName}|${dateKey}`;
      
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });
    
    const dupeCount = validEvents.length - deduplicatedEvents.length;
    if (dupeCount > 0) {
      console.log(`🧹 Removed ${dupeCount} duplicate events`);
    }
    
    // Limit same-title events per venue to MAX 3 — prevents tour dates flooding the feed
    const titleVenueCount = new Map();
    const dedupedWithLimit = deduplicatedEvents.filter(event => {
      const key = `${(event.title || '').toLowerCase().trim()}|${(event.venue?.name || '').toLowerCase().trim()}`;
      const count = titleVenueCount.get(key) || 0;
      if (count >= 2) return false;
      titleVenueCount.set(key, count + 1);
      return true;
    });
    
    // Apply pagination to deduplicated results
    const events = dedupedWithLimit.slice(skip, skip + parseInt(limit));
    
    // Return with pagination metadata - use validEvents.length for accurate count after filtering
    res.json({
      events,
      pagination: {
        total: dedupedWithLimit.length, // Use deduplicated count for accurate pagination
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(dedupedWithLimit.length / parseInt(limit))
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
    
    // Get events from database
    let allEvents = await Event.find(searchQuery)
      .sort({ startDate: 1 })
      .lean();
    
    // JavaScript-based quality filtering to exclude non-events
    const isRealEvent = (event) => {
      const title = event.title ? event.title.trim() : '';
      const venue = event.venue || {};
      const venueName = typeof venue === 'object' ? venue.name : venue;
      
      // Skip if no title
      if (!title || title.length < 3) return false;
      
      // Skip navigation/admin elements
      const badTitles = [
        'today', 'now', 'upcoming events', 'views navigation', 'leasing', 'go to',
        'hello!', 'reach out', 'legacy related', 'financial', 'camping site', 
        'camping', 'vanierpark.com', 'park site', 'tourism', 'conservation p',
        'bfc saturday', 'outdoor', 'museum', 'festival',
        'harrisonspring', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
      ];
      
      if (badTitles.some(bad => title.toLowerCase() === bad)) return false;
      
      // Skip date strings like "June 8 2025 @ 7:30 pm"
      if (/^\w+\s+\d+\s+\d{4}\s+@\s+\d+:\d+\s+(am|pm)/i.test(title)) return false;
      
      // Skip month names at start
      if (/^(june|july|august|september|october|november|december|january|february|march|april|may)\s/i.test(title)) return false;
      
      // Skip very short generic words
      if (/^\w{1,15}$/i.test(title) && !/™|®|©/.test(title)) return false;
      
      // Skip obvious placeholder venues
      if (venueName && /^(sample|test|placeholder|demo|naopen|nsw|vancouver maritime|nyc)/i.test(venueName)) return false;
      
      // POSITIVE FILTER: Must have real event characteristics
      const hasEventKeywords = /\b(show|concert|exhibition|festival|theater|theatre|performance|event|live|disney|night|music|art|comedy|dance|workshop|class|tour|experience|play|musical|opera|ballet)\b/i.test(title);
      const hasColon = title.includes(':');
      const hasTrademark = /™|®|©/.test(title);
      const isLongTitle = title.length >= 20;
      const isKnownVenue = /rogers arena|science world|aquarium|queen elizabeth|chan centre|orpheum|granville island|vogue theatre|commodore ballroom/i.test(venueName || '');
      
      return hasEventKeywords || hasColon || hasTrademark || isLongTitle || isKnownVenue;
    };
    
    // Filter for real events only
    const realEvents = allEvents.filter(isRealEvent);
    
    // Apply pagination to filtered results
    const events = realEvents.slice(skip, skip + limit);
    
    // Return with pagination metadata
    res.json({
      events,
      pagination: {
        total: realEvents.length,
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
    let event = null;

    // First try MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      event = await Event.findByIdAndDelete(eventId);
    }
    
    // If not found, try by custom id field
    if (!event) {
      event = await Event.findOneAndDelete({ id: eventId });
    }
    
    // Also try deleting from featured_events collection
    try {
      const FeaturedEvent = mongoose.model('FeaturedEvent');
      if (mongoose.Types.ObjectId.isValid(eventId)) {
        await FeaturedEvent.findByIdAndDelete(eventId);
      }
      await FeaturedEvent.findOneAndDelete({ id: eventId });
    } catch (e) {
      // FeaturedEvent model may not exist, ignore
    }

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

/**
 * @route   GET /api/v1/events/admin/cleanup-missing-ids
 * @desc    ADMIN: Clean up events missing the 'id' field from MongoDB
 * @access  Public (one-time cleanup endpoint)
 */
router.get('/admin/cleanup-missing-ids', async (req, res) => {
  try {
    console.log('🔍 CLEANING DATABASE - REMOVING EVENTS WITHOUT ID FIELD');

    // Find events missing 'id' field
    const missingId = await Event.find({ id: { $exists: false } }).lean();
    console.log(`❌ Events missing 'id' field: ${missingId.length}`);

    if (missingId.length > 0) {
      // Show sample
      const samples = missingId.slice(0, 5).map(e => ({
        title: e.title,
        city: e.city,
        _id: e._id
      }));

      // Delete events that don't have 'id' field
      const result = await Event.deleteMany({ id: { $exists: false } });
      console.log(`✅ DELETED: ${result.deletedCount} events`);

      const remaining = await Event.countDocuments({});
      
      res.json({
        success: true,
        deleted: result.deletedCount,
        samples: samples,
        remainingTotal: remaining,
        message: `✅ Cleaned up ${result.deletedCount} events without id field. Database now has ${remaining} events.`
      });
    } else {
      const total = await Event.countDocuments({});
      res.json({
        success: true,
        deleted: 0,
        remainingTotal: total,
        message: '✅ All events already have id field - nothing to clean!'
      });
    }
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/featured-events
 * @desc    Get featured events (optionally filtered by city)
 * @access  Public
 */
router.get('/featured-events', async (req, res) => {
  try {
    const { city } = req.query;
    
    const query = { featured: true };
    if (city) {
      query.city = city;
    }
    
    const events = await Event.find(query)
      .sort({ featuredOrder: 1, startDate: 1 })
      .limit(10);
    
    res.json({
      success: true,
      count: events.length,
      events: events
    });
  } catch (error) {
    console.error('Error getting featured events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/v1/featured-events
 * @desc    Set featured events for a city
 * @access  Public (should add auth in production)
 */
router.post('/featured-events', async (req, res) => {
  try {
    const { city, events } = req.body;
    
    if (!city || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'City and events array are required'
      });
    }
    
    // First, unfeatured all events for this city
    await Event.updateMany(
      { city: city, featured: true },
      { $set: { featured: false, featuredOrder: null } }
    );
    
    // Then, feature the selected events with order
    const eventIds = events.map(e => e._id || e.id).filter(Boolean);
    
    // Convert string IDs to MongoDB ObjectIds where needed
    for (let i = 0; i < eventIds.length; i++) {
      const eventId = eventIds[i];
      let query;
      
      // Try to use as ObjectId first, fall back to string id field
      if (mongoose.Types.ObjectId.isValid(eventId) && eventId.length === 24) {
        query = { _id: new mongoose.Types.ObjectId(eventId) };
      } else {
        query = { id: eventId };
      }
      
      await Event.updateOne(
        query,
        { $set: { featured: true, featuredOrder: i + 1 } }
      );
    }
    
    res.json({
      success: true,
      message: `Featured ${eventIds.length} events for ${city}`,
      count: eventIds.length
    });
  } catch (error) {
    console.error('Error setting featured events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/v1/events/:id/feature
 * @desc    Mark an event as featured
 * @access  Public (should add auth in production)
 */
router.post('/events/:id/feature', async (req, res) => {
  try {
    const { id } = req.params;
    const { order } = req.body;
    
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { featured: true, featuredOrder: order || 999 } },
      { new: true }
    );
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      event: event
    });
  } catch (error) {
    console.error('Error featuring event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/v1/events/:id/feature
 * @desc    Remove featured status from an event
 * @access  Public (should add auth in production)
 */
router.delete('/events/:id/feature', async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { featured: false, featuredOrder: null } },
      { new: true }
    );
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      event: event
    });
  } catch (error) {
    console.error('Error unfeaturing event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
