/**
 * BC Event Calendar Scraper
 * Website: https://www.bceventcalendar.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Scrapes events from BC Event Calendar
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'BC Event Calendar' });
  const events = [];
  
  try {
    logger.info('Starting BC Event Calendar scraper');
    const response = await axios.get('https://www.bceventcalendar.ca/');
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
    //     venue: 'BC Event Calendar'
    //   });
    // });

    // For scaffolded scraper return empty array until implemented
    return [];
    
  } catch (error) {
    logger.error({ error }, 'Error scraping BC Event Calendar');
    return [];
  }
}

/**
 * Process and save events to the database
 * @param {Array} events - Array of scraped events
 * @returns {Promise<void>}
 */
async function saveEvents(events) {
  const logger = scrapeLogger.child({ scraper: 'BC Event Calendar' });
  
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
        source: 'BC Event Calendar'
      });
      
      // Save event to database
      await event.save();
      logger.info({ eventId: event._id }, 'Saved event to database');
    }
    
    logger.info('Completed saving events from BC Event Calendar');
  } catch (error) {
    logger.error({ error }, 'Error saving events from BC Event Calendar');
  }
}

module.exports = {
  name: 'BC Event Calendar',
  urls: ['https://www.bceventcalendar.ca/'],
  scrape
};
