/**
 * Vancouver Symphony Events Scraper
 * Website: https://vancouversymphony.ca/events/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Scrapes events from Vancouver Symphony
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Vancouver Symphony' });
  const events = [];
  
  try {
    logger.info('Starting Vancouver Symphony scraper');
    const response = await axios.get('https://vancouversymphony.ca/events/');
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
    //     venue: 'Vancouver Symphony'
    //   });
    // });

    // For scaffolded scraper return empty array until implemented
    return [];
    
  } catch (error) {
    logger.error({ error }, 'Error scraping Vancouver Symphony');
    return [];
  }
}

module.exports = {
  name: 'Vancouver Symphony',
  urls: ['https://vancouversymphony.ca/events/'],
  scrape
};
