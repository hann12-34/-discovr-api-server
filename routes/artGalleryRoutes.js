/**
 * Art Gallery Routes
 * 
 * Provides dedicated API endpoints for art gallery events
 */

const express = require('express');
const router = express.Router();
const { transformArtGalleryEvents } = require('../utils/artGalleryDataAdapter');

// Import art gallery scrapers
const seymourArtGallery = require('../scrapers/venues/new/seymourArtGallery');
const kootenayGallery = require('../scrapers/venues/new/kootenayGallery');
const sumGallery = require('../scrapers/venues/new/sumGallery');
const capturePhotographyFestival = require('../scrapers/venues/new/capturePhotographyFestival');
const vancouverArtGallery = require('../scrapers/venues/new/vancouverArtGallery');

const scrapers = [
  seymourArtGallery,
  kootenayGallery,
  sumGallery,
  capturePhotographyFestival,
  vancouverArtGallery
];

// In-memory cache system with auto-expiry
const cache = {
  data: null,
  timestamp: null,
  TTL: 3600000 // 1 hour in milliseconds
};

/**
 * GET /api/art-galleries
 * Returns a list of available art galleries
 */
router.get('/galleries', async (req, res) => {
  try {
    const galleries = scrapers.map(scraper => ({
      name: scraper.name,
      url: scraper.url,
      location: scraper.location
    }));
    
    res.json({
      count: galleries.length,
      galleries
    });
  } catch (error) {
    console.error('Error fetching art galleries:', error);
    res.status(500).json({ error: 'Failed to fetch art galleries' });
  }
});

/**
 * GET /api/art-galleries/events
 * Returns events from all art galleries
 */
router.get('/events', async (req, res) => {
  try {
    // Check cache validity
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp < cache.TTL)) {
      console.log('Serving art gallery events from cache');
      return res.json(cache.data);
    }
    
    console.log('Fetching fresh art gallery events...');
    
    // Parameters for filtering
    const galleryName = req.query.gallery;
    const upcoming = req.query.upcoming === 'true';
    
    // Collect events from all scrapers (or filtered by gallery name)
    let allEvents = [];
    let targetScrapers = scrapers;
    
    // Filter scrapers if gallery name is specified
    if (galleryName) {
      targetScrapers = scrapers.filter(s => 
        s.name.toLowerCase().includes(galleryName.toLowerCase())
      );
      
      if (targetScrapers.length === 0) {
        return res.status(404).json({ 
          error: `No gallery found matching '${galleryName}'` 
        });
      }
    }
    
    // Process each scraper
    for (const scraper of targetScrapers) {
      try {
        console.log(`Scraping events from ${scraper.name}...`);
        const events = await scraper.scrape();
        allEvents = allEvents.concat(events);
      } catch (error) {
        console.error(`Error scraping ${scraper.name}:`, error);
        // Continue with other scrapers even if one fails
      }
    }
    
    // Transform the raw events to the app format
    const transformedEvents = transformArtGalleryEvents(allEvents);
    
    // Apply filters
    let filteredEvents = transformedEvents;
    
    if (upcoming) {
      const now = new Date();
      filteredEvents = filteredEvents.filter(event => 
        !event.startDate || event.startDate >= now
      );
    }
    
    // Update cache
    const response = {
      count: filteredEvents.length,
      source: targetScrapers.map(s => s.name),
      events: filteredEvents
    };
    
    cache.data = response;
    cache.timestamp = now;
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching art gallery events:', error);
    res.status(500).json({ error: 'Failed to fetch art gallery events' });
  }
});

/**
 * GET /api/art-galleries/events/:galleryName
 * Returns events from a specific gallery
 */
router.get('/events/:galleryName', async (req, res) => {
  try {
    const galleryName = req.params.galleryName;
    
    // Find the scraper for this gallery
    const scraper = scrapers.find(s => 
      s.name.toLowerCase().replace(/\s+/g, '-') === galleryName.toLowerCase()
    );
    
    if (!scraper) {
      return res.status(404).json({ 
        error: 'Gallery not found', 
        available: scrapers.map(s => s.name.toLowerCase().replace(/\s+/g, '-'))
      });
    }
    
    console.log(`Fetching events from ${scraper.name}...`);
    const events = await scraper.scrape();
    
    // Transform events to app format
    const transformedEvents = transformArtGalleryEvents(events);
    
    res.json({
      name: scraper.name,
      count: transformedEvents.length,
      location: scraper.location,
      events: transformedEvents
    });
  } catch (error) {
    console.error('Error fetching gallery events:', error);
    res.status(500).json({ error: 'Failed to fetch gallery events' });
  }
});

/**
 * POST /api/art-galleries/refresh
 * Force refresh the art gallery events cache
 */
router.post('/refresh', async (req, res) => {
  try {
    // Clear cache
    cache.data = null;
    cache.timestamp = null;
    
    res.json({ success: true, message: 'Art gallery events cache cleared' });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

module.exports = router;
