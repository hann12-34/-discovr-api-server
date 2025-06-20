/**
 * VanDusen Garden Events Scraper
 * Website: https://www.vandusen.org/events/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Scrapes events from VanDusen Garden Events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'VanDusen Garden Events' });
  const events = [];
  
  try {
    logger.info('Starting VanDusen Garden Events scraper');
    const response = await axios.get('https://www.vandusen.org/events/');
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
    //     venue: 'VanDusen Garden Events'
    //   });
    // });

    // For scaffolded scraper return empty array until implemented
    return [];
    
  } catch (error) {
    logger.error({ error }, 'Error scraping VanDusen Garden Events');
    return [];
  }
}

/**
 * Process and save events to the database
 * @param {Array} events - Array of scraped events
 * @returns {Promise<void>}
 */
async function saveEvents(events) {
  const logger = scrapeLogger.child({ scraper: 'VanDusen Garden Events' });
  
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
        source: 'VanDusen Garden Events'
      });
      
      // Save event to database
      await event.save();
      logger.info({ eventId: event._id }, 'Saved event to database');
    }
    
    logger.info('Completed saving events from VanDusen Garden Events');
  } catch (error) {
    logger.error({ error }, 'Error saving events from VanDusen Garden Events');
  }
}

module.exports = {
  name: 'VanDusen Garden Events',
  urls: ['https://www.vandusen.org/events/'],
  scrape
};
