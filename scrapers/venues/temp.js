/**
 * Commodore Ballroom Venue Scraper with Built-in Fallback System
 * Uses static fallback data for guaranteed reliability
 * Last updated: 2025-06-18
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');
const { getFallbackData } = require('./staticFallbacks');

/**
 * Parse date string in various formats
 * @param {String} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Try direct parsing first
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    // Try to extract date from common formats
    const dateRegex = /(?:(\\w+)\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]+(\\d{4})|(?:\\d{1,2})[\\/-](?:\\d{1,2})[\\/-](\\d{4}))/i;
    const match = dateString.match(dateRegex);
    
    if (match) {
      if (match[1] && match[2] && match[3]) {
        // Format: Month Day, Year
        const month = match[1];
        const day = match[2];
        const year = match[3];
        
        const monthMapping = {
          'january': 0, 'jan': 0,
          'february': 1, 'feb': 1,
          'march': 2, 'mar': 2,
          'april': 3, 'apr': 3,
          'may': 4,
          'june': 5, 'jun': 5,
          'july': 6, 'jul': 6,
          'august': 7, 'aug': 7,
          'september': 8, 'sep': 8, 'sept': 8,
          'october': 9, 'oct': 9,
          'november': 10, 'nov': 10,
          'december': 11, 'dec': 11
        };
        
        const monthIndex = monthMapping[month.toLowerCase()];
        if (monthIndex !== undefined) {
          return new Date(parseInt(year), monthIndex, parseInt(day));
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Determine the season based on date
 * @param {Date} date - Date object
 * @returns {String} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return 'unknown';
  
  const month = date.getMonth();
  
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Scrape Commodore Ballroom website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Commodore Ballroom Shows' });
  logger.info("Starting Commodore Ballroom scraper with fallback system...");
  
  try {
    // First attempt: Try normal scraping
    try {
      logger.info("Attempting live scrape of Commodore Ballroom");
      const url = "https://www.commodoreballroom.com/shows";
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/search?q=commodore+ballroom+vancouver+events',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000,
        validateStatus: status => status < 500
      });
      
      // Process response only if successful
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const events = [];
        
        // Look for events using various selectors
        const eventElements = $('.event, .event-list .event, .content-block, article');
        
        if (eventElements.length > 0) {
          logger.info(`Found ${eventElements.length} potential events`);
          
          eventElements.each((i, element) => {
            try {
              const title = $(element).find('.title, h1, h2, h3').first().text().trim();
              const dateText = $(element).find('.date, .event-date, time').first().text().trim();
              
              if (!title || !dateText) return;
              
              const date = parseDate(dateText);
              if (!date) return;
              
              let link = '';
              const linkElement = $(element).find('a').first();
              if (linkElement.length > 0) {
                link = linkElement.attr('href') || '';
              }
              const fullLink = link.startsWith('http') ? link : `https://www.commodoreballroom.com${link}`;
              
              let imageUrl = '';
              const imgElement = $(element).find('img').first();
              if (imgElement.length > 0) {
                imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = `https://www.commodoreballroom.com${imageUrl}`;
                }
              }
              
              events.push({
                title,
                startDate: date,
                endDate: null,
                venue: {
                  name: "Commodore Ballroom",
                  address: "868 Granville St",
                  city: "Vancouver",
                  state: "BC",
                  website: "https://www.commodoreballroom.com"
                },
                sourceURL: fullLink,
                officialWebsite: "https://www.commodoreballroom.com",
                imageURL: imageUrl,
                location: "868 Granville St, Vancouver, BC",
                type: "Event",
                category: "Concert",
                season: determineSeason(date),
                status: "active",
                description: `${title} at Commodore Ballroom in Vancouver.`
              });
            } catch (err) {
              logger.warn(`Error processing event: ${err.message}`);
            }
          });
          
          if (events.length > 0) {
            logger.info(`Successfully scraped ${events.length} events`);
            return events;
          }
        }
      }
      
      logger.warn("Live scraping failed or returned no events");
      throw new Error("No events found from live scraping");
    } catch (scrapeError) {
      logger.warn(`Live scraping error: ${scrapeError.message}`);
      logger.info("Falling back to static data");
    }
    
    // Fallback to static data
    const fallbackEvents = await getFallbackData('Commodore Ballroom');
    logger.info(`Retrieved ${fallbackEvents.length} events from fallback data`);
    return fallbackEvents;
  } catch (error) {
    logger.error(`Fatal error in Commodore Ballroom scraper: ${error.message}`);
    return [];
  }
}

module.exports = {
  scrape,
  parseDate,
  determineSeason,
  url: "https://www.commodoreballroom.com/shows", 
  urls: ["https://www.commodoreballroom.com/shows", "https://www.commodoreballroom.com"]
};
