/**
 * Dragon Boat BC Scraper
 * Website: https://dragonboatbc.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Scrapes events from Dragon Boat BC
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Dragon Boat BC' });
  const events = [];
  
  try {
    logger.info('Starting Dragon Boat BC scraper');
    const response = await axios.get('https://dragonboatbc.ca/');
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
    //     venue: 'Dragon Boat BC'
    //   });
    // });

    // For scaffolded scraper return empty array until implemented
    return [];
    
  } catch (error) {
    logger.error({ error }, 'Error scraping Dragon Boat BC');
    return [];
  }
}

/**
 * Process and save events to the database
 * @param {Array} events - Array of scraped events
 * @returns {Promise<void>}
 */
async function saveEvents(events) {
  const logger = scrapeLogger.child({ scraper: 'Dragon Boat BC' });
  
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
        source: 'Dragon Boat BC'
      });
      
      // Save event to database
      await event.save();
      logger.info({ eventId: event._id }, 'Saved event to database');
    }
    
    logger.info('Completed saving events from Dragon Boat BC');
  } catch (error) {
    logger.error({ error }, 'Error saving events from Dragon Boat BC');
  }
}

module.exports = {
  name: 'Dragon Boat BC',
  urls: ['https://dragonboatbc.ca/'],
  scrape
};
