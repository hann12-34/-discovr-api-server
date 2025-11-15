const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * @route   POST /api/admin/rescrape-city
 * @desc    Delete all events for a city and re-scrape with clean filters
 * @access  Admin
 */
router.post('/rescrape-city/:city', async (req, res) => {
  const { city } = req.params;
  
  try {
    console.log(`🧹 Starting re-scrape for ${city}...`);
    
    // Step 1: Delete all existing events for this city
    const deleteResult = await Event.deleteMany({ city: city });
    console.log(`✅ Deleted ${deleteResult.deletedCount} old ${city} events`);
    
    // Step 2: Load and run the city scraper
    const cityPath = city.replace(/\s+/g, ' '); // "New York" stays as is
    let scrapeFunction;
    
    try {
      scrapeFunction = require(`../scrapers/cities/${cityPath}/index.js`);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: `City scraper not found for: ${city}`,
        error: err.message
      });
    }
    
    // Step 3: Run the scraper
    console.log(`🔄 Running ${city} scrapers...`);
    const events = await scrapeFunction();
    console.log(`✅ Scraped ${events.length} clean events`);
    
    // Step 4: Save to database with proper schema
    let savedCount = 0;
    const errors = [];
    
    for (const event of events) {
      try {
        // Ensure required fields are present and map to schema
        const eventDoc = {
          id: event.id || `${event.city}-${event.title}-${event.date || event.startDate}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
          title: event.title,
          startDate: event.startDate || event.date,
          endDate: event.endDate,
          description: event.description,
          image: event.image || event.imageUrl,
          imageUrl: event.imageUrl || event.image,
          city: event.city,
          venue: event.venue || { name: event.venueName || 'TBD' },
          sourceURL: event.url || event.sourceURL,
          ticketURL: event.ticketURL,
          category: event.category || 'music',
          categories: event.categories || []
        };
        
        const newEvent = new Event(eventDoc);
        await newEvent.save();
        savedCount++;
      } catch (err) {
        errors.push({
          title: event.title,
          error: err.message
        });
      }
    }
    
    console.log(`✅ Saved ${savedCount} events to database`);
    
    // Step 5: Return results
    res.json({
      success: true,
      city,
      deleted: deleteResult.deletedCount,
      scraped: events.length,
      saved: savedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      message: `✅ ${city} re-scraped: ${deleteResult.deletedCount} deleted, ${savedCount} saved`
    });
    
  } catch (error) {
    console.error(`❌ Error re-scraping ${city}:`, error);
    res.status(500).json({
      success: false,
      message: `Error re-scraping ${city}: ${error.message}`,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/admin/test-scraper/:city
 * @desc    Test scraper without saving to database
 * @access  Admin
 */
router.get('/test-scraper/:city', async (req, res) => {
  const { city } = req.params;
  
  try {
    const cityPath = city.replace(/\s+/g, ' ');
    const scrapeFunction = require(`../scrapers/cities/${cityPath}/index.js`);
    
    console.log(`🔄 Testing ${city} scrapers...`);
    const events = await scrapeFunction();
    
    // Sample first 20 events
    const sample = events.slice(0, 20).map(e => ({
      title: e.title,
      date: e.date,
      venue: typeof e.venue === 'object' ? e.venue.name : e.venue
    }));
    
    res.json({
      success: true,
      city,
      totalEvents: events.length,
      sample
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
