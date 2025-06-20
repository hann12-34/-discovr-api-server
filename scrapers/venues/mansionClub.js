/**
 * Scraper for Mansion Club venue website
 * Extracts event information from https://www.mansionclubvancouver.com/
 * Last updated: June 17, 2025 - Removed all fallbacks and improved logging
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString) {
  try {
    if (!dateString) return null;
    
    const dateStr = dateString.trim();
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try formats like "DD MMM YYYY"
    const dateMatch = dateStr.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
      const year = parseInt(dateMatch[3]);
      return new Date(year, month, day);
    }
    
    // Logging handled by the calling function now
    return null;
  } catch (error) {
    // Logging handled by the calling function now
    return null;
  }
}

/**
 * Determine season based on date
 * @param {Date} date - Event date
 * @returns {string} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return "all";
  
  const month = date.getMonth();
  
  // Define seasons by month
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter"; // November, December, January
}

/**
 * Make absolute URL from relative URL
 * @param {string} relativeUrl - Relative URL
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const relative = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  
  return `${base}${relative}`;
}

/**
 * Scrape Mansion Club website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Mansion Club' });
  logger.info("Starting Mansion Club scraper...");
  const events = [];
  const venueUrl = "https://mansionclub.ca/collections/upcoming-events";
  
  try {
    // Get the venue's HTML content
    const response = await axios.get(venueUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Find all events - this site likely uses product listings for events
    let eventElements = $(".product-card, .grid-view-item, .event-item, article");
    logger.info(`Found ${eventElements.length} potential events at Mansion Club`);
    
    // Try alternative ways to find events if none found initially
    if (eventElements.length === 0) {
      // Try alternative selectors
      eventElements = $(".calendar-event, .event-calendar-item, .event-item");
      logger.info(`Found ${eventElements.length} events with alternate selectors`);
      
      // If still no events, try to look at Instagram feed or social media sections
      if (eventElements.length === 0) {
        const instagramPosts = $("#instagram-feed .post, .instagram-media, [class*='instagram']");
        
        logger.info(`Looking for events in social media posts: found ${instagramPosts.length} posts`);
        
        // Process Instagram posts that appear to be about events
        instagramPosts.each((i, element) => {
          try {
            const $element = $(element);
            const caption = $element.find(".caption, .post-text").text().trim();
            
            // Only extract if it looks like an event post (has date patterns, event keywords)
            if (caption.match(/\b(tonight|tomorrow|event|party|dj|show)\b/i)) {
              // Try to extract a date
              const dateMatch = caption.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\w\.]* \d{1,2}(?:st|nd|rd|th)?\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/i);
              let startDate = null;
              
              if (dateMatch) {
                startDate = parseEventDate(dateMatch[0]);
              }
              
              // Extract event title (first line or capitalized phrase)
              let title = caption.split('\n')[0].trim();
              if (title.length > 70) {
                // Look for something that resembles an event title
                const possibleTitle = caption.match(/([A-Z][A-Za-z0-9\s']+[!\?]?)\s/); 
                if (possibleTitle) {
                  title = possibleTitle[1].trim();
                } else {
                  // Not a proper event post, skip
                  return;
                }
              }
              
              // Don't continue if we don't have a proper title
              if (!title || title.length < 3) {
                logger.warn('Social media post missing proper title, skipping');
                return;
              }
              
              // Skip events without date information
              if (!startDate) {
                logger.warn(`Social media event "${title}" missing date information, skipping`);
                return;
              }
              
              // Get the post image if available
              let imageURL = '';
              const img = $element.find("img");
              if (img.length) {
                imageURL = img.attr('data-src') || img.attr('src') || '';
              }
              
              // Add this as an event
              events.push({
                title,
                startDate,
                endDate: null,
                venue: {
                  name: "Mansion Club",
                  address: "1161 Granville St",
                  city: "Vancouver",
                  state: "BC",
                  website: venueUrl
                },
                sourceURL: venueUrl,
                officialWebsite: venueUrl,
                imageURL,
                location: "1161 Granville St, Vancouver, BC",
                type: "Event",
                category: "Nightlife",
                season: startDate ? determineSeason(startDate) : "all",
                status: "active",
                description: caption
              });
            }
          } catch (error) {
            logger.error({ error }, `Error processing Instagram post for Mansion Club: ${error.message}`);
          }
        });
      }
    }
    
    // Process each event found
    eventElements.each((i, element) => {
      try {
        const $element = $(element);
        const titleElement = $element.find(".product-title, .title, h1, h2, h3").first();
        const dateElement = $element.find(".event-date, .date").first();
        const imageElement = $element.find("img").first();
        const priceElement = $element.find(".price, .product-price").first();
        
        // Get event title
        const title = titleElement.text().trim();
        if (!title) {
          logger.warn('Event missing title, skipping');
          return;
        }
        
        // Try to extract date from title or other fields
        let dateText = dateElement.text().trim();
        if (!dateText) {
          // Try to extract date from title (common format for club events)
          const datePart = title.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}|\d{4})\b/i);
          if (datePart) {
            dateText = datePart[0];
          }
        }
        
        // Skip events without date information
        if (!dateText) {
          logger.warn(`Event "${title}" missing date information, skipping`);
          return;
        }
        
        const startDate = parseEventDate(dateText);
        
        // Skip events where date parsing failed
        if (!startDate) {
          logger.warn(`Failed to parse date for event "${title}" with date text "${dateText}", skipping`);
          return;
        }
        
        const season = determineSeason(startDate);
        
        // Get event image
        let imageURL = '';
        if (imageElement && imageElement.attr('src')) {
          imageURL = makeAbsoluteUrl(imageElement.attr('src'), venueUrl);
        }
        
        // Get price if available
        let price = '';
        if (priceElement) {
          price = priceElement.text().trim();
        }
        
        // Create event object
        const event = {
          title,
          startDate,
          endDate: null,
          venue: {
            name: "Mansion Club",
            address: "919 Granville St",
            city: "Vancouver",
            state: "BC",
            website: venueUrl
          },
          sourceURL: venueUrl,
          officialWebsite: venueUrl,
          imageURL,
          price,
          location: "919 Granville St, Vancouver, BC",
          type: "Event",
          category: "Nightlife",
          season,
          status: "active",
          description: `${title} at Mansion Club in Vancouver.${price ? ' Price: ' + price : ''}`
        };
        
        events.push(event);
      } catch (error) {
        logger.error({ error }, `Error processing Mansion Club event: ${error.message}`);
      }
    });
    
    logger.info(`Successfully scraped ${events.length} events from Mansion Club`);
    return events;
  } catch (error) {
    logger.error({ error }, `Error scraping Mansion Club: ${error.message}`);
    // No fallback events - return empty array on error
    return [];
  }
}

module.exports = {
  name: "Mansion Club",
  url: "https://mansionclub.ca/collections/upcoming-events",
  urls: ["https://mansionclub.ca/collections/upcoming-events"],
  scrape
};
