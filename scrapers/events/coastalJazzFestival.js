/**
 * Coastal Jazz Festival Scraper
 * Website: https://www.coastaljazz.ca/events/category/festival/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Scrapes events from Coastal Jazz Festival
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Coastal Jazz Festival' });
  const events = [];
  
  try {
    logger.info('Starting Coastal Jazz Festival scraper');
    const response = await axios.get('https://www.coastaljazz.ca/events/category/festival/');
    const $ = cheerio.load(response.data);
    
    // TODO: Implement scraping logic
    // Example:
    // $('.event-item').each((i, el) => {
    //   const title = $(el).find('.event-title').text().trim();
    //   const date = $(el).find('.event-date').text().trim();
    //   const url = $(el).find('a').attr('href');
    //   const image = $(el).find('img').attr('src');
    //   const description = $(el).find('.event-description').text().trim();
    //
    //   events.push({
    //     title,
    //     date,
    //     url,
    //     image,
    //     description,
    //     venue: 'Coastal Jazz Festival'
    //   });
    // });

    // For scaffolded scraper return empty array until implemented
    return [];
    
  } catch (error) {
    logger.error({ error }, 'Error scraping Coastal Jazz Festival');
    return [];
  }
}

/**
 * Process and save events to the database
 * @param {Array} events - Array of scraped events
 * @returns {Promise<void>}
 */
async function saveEvents(events) {
  const logger = scrapeLogger.child({ scraper: 'Coastal Jazz Festival' });
  
  try {
    for (const eventData of events) {
      // Create Event document
      const event = new Event({
        title: eventData.title,
        date: eventData.date,
        url: eventData.url,
        imageUrl: eventData.image,
        description: eventData.description,
        venue: eventData.venue,
        source: 'Coastal Jazz Festival'
      });
      
      // Save event to database
      await event.save();
      logger.info({ eventId: event._id }, 'Saved event to database');
    }
    
    logger.info('Completed saving events from Coastal Jazz Festival');
  } catch (error) {
    logger.error({ error }, 'Error saving events from Coastal Jazz Festival');
  }
}

module.exports = {
  name: 'Coastal Jazz Festival',
  urls: ['https://www.coastaljazz.ca/events/category/festival/'],
  scrape
};
