/**
 * Scraper for Vancouver Playhouse venue
 * Extracts event information from https://vancouvercivictheatres.com/venues/vancouver-playhouse/
 * No fallback events - returns empty array if no events found or on error
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { format } = require('date-fns');
const scrapeLogger = require('../../scrapeLogger');

// Define venue info
const VENUE_NAME = 'Vancouver Playhouse';
const VENUE_ADDRESS = '600 Hamilton St';
const VENUE_CITY = 'Vancouver';
const VENUE_REGION = 'BC';
const VENUE_POSTAL_CODE = 'V6B 2P1';
const VENUE_COUNTRY = 'Canada';
const BASE_URL = 'https://vancouvercivictheatres.com';
const VENUE_URL = `${BASE_URL}/venues/vancouver-playhouse`;

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @returns {Object|null} Parsed date information or null if parsing fails
 */
function parseEventDate(dateString) {
  try {
    if (!dateString) return null;
    
    const dateStr = dateString.trim();
    
    // Match patterns like "May 4, 2025" or "May 4 - 8, 2025"
    const monthDayYearPattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?,?\s+(\d{4})/i;
    const monthDayYearMatch = dateStr.match(monthDayYearPattern);
    
    if (monthDayYearMatch) {
      const [, month, startDayStr, endDayStr, yearStr] = monthDayYearMatch;
      
      const startDay = parseInt(startDayStr, 10);
      const year = parseInt(yearStr, 10);
      const monthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 
        'july', 'august', 'september', 'october', 'november', 'december']
        .indexOf(month.toLowerCase());
      
      if (monthIndex !== -1) {
        const startDate = new Date(year, monthIndex, startDay);
        
        // If there's an end day, calculate end date
        let endDate = null;
        if (endDayStr) {
          const endDay = parseInt(endDayStr, 10);
          endDate = new Date(year, monthIndex, endDay);
        }
        
        return {
          startDate,
          endDate,
          startDateStr: format(startDate, 'yyyy-MM-dd'),
          endDateStr: endDate ? format(endDate, 'yyyy-MM-dd') : null
        };
      }
    }
    
    // Try to parse time information separately (e.g., "8:00 PM")
    const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
    const timeMatch = dateStr.match(timePattern);
    
    let timeStr = null;
    if (timeMatch) {
      const [, hourStr, minuteStr, ampm] = timeMatch;
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      // Convert to 24 hour format
      if (ampm.toLowerCase() === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
      
      timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    }
    
    // Try standard date formats as a fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return {
        startDate: date,
        endDate: null,
        startDateStr: format(date, 'yyyy-MM-dd'),
        endDateStr: null,
        timeStr
      };
    }
    
    // If we found a time but not a date, return just the time
    if (timeStr) {
      return { timeStr };
    }
    
    // No date could be parsed
    return null;
  } catch (error) {
    scrapeLogger.error(`Error parsing date: ${error.message}`);
    return null;
  }
}

/**
 * Make absolute URL from relative URL
 * @param {string} relativeUrl - Relative URL
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(relativeUrl) {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  return `${BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}

/**
 * Vancouver Playhouse scraper
 * @returns {Promise<Array>} Array of event objects
 */
async function scraper() {
  const logger = scrapeLogger.child({ scraper: 'Vancouver Playhouse' });
  logger.info("Starting Vancouver Playhouse scraper");
  const events = [];
  
  try {
    // Get main events listings from Vancouver Civic Theatres
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find all event listings
    const eventElements = $('.events-list .event-item, .event-grid article, .event-listing');
    logger.info(`Found ${eventElements.length} total events at Vancouver Civic Theatres`);
    
    // Filter for Vancouver Playhouse events
    let playhouseEvents = [];
    eventElements.each((i, element) => {
      const $element = $(element);
      const venueText = $element.find('.venue-name, .venue, .location').text().toLowerCase();
      
      // Only include events at Vancouver Playhouse
      if (venueText.includes('playhouse')) {
        playhouseEvents.push($element);
      }
    });
    
    logger.info(`Filtered ${playhouseEvents.length} events specifically for Vancouver Playhouse`);
    
    // Process each Vancouver Playhouse event
    for (const $element of playhouseEvents) {
      try {
        // Extract title
        const title = $element.find('.event-title, .title, h2, h3').first().text().trim();
        if (!title) {
          logger.warn('Event missing title, skipping');
          continue;
        }
        
        // Extract date
        const dateText = $element.find('.date, .event-date, .dates').first().text().trim();
        if (!dateText) {
          logger.warn(`Event "${title}" missing date, skipping`);
          continue;
        }
        
        // Parse date information
        const dateInfo = parseEventDate(dateText);
        if (!dateInfo || !dateInfo.startDateStr) {
          logger.warn(`Could not parse date "${dateText}" for event "${title}", skipping`);
          continue;
        }
        
        // Extract event URL
        let eventUrl = '';
        const linkElement = $element.find('a').first();
        if (linkElement && linkElement.attr('href')) {
          eventUrl = makeAbsoluteUrl(linkElement.attr('href'));
        }
        
        // Extract image
        let imageUrl = '';
        const imageElement = $element.find('img').first();
        if (imageElement && imageElement.attr('src')) {
          imageUrl = makeAbsoluteUrl(imageElement.attr('src'));
        }
        
        // Extract description
        let description = $element.find('.description, .event-description, .excerpt').text().trim();
        if (!description) {
          description = `${title} at Vancouver Playhouse on ${dateInfo.startDateStr}.`;
        }
        
        // Create event object
        const event = {
          title,
          date: dateInfo.startDateStr,
          startTime: dateInfo.timeStr || null,
          endDate: dateInfo.endDateStr || null,
          url: eventUrl || VENUE_URL,
          venue: VENUE_NAME,
          address: VENUE_ADDRESS,
          city: VENUE_CITY,
          region: VENUE_REGION,
          postalCode: VENUE_POSTAL_CODE, 
          country: VENUE_COUNTRY,
          description,
          image: imageUrl
        };
        
        events.push(event);
        logger.info(`Added event: ${title} on ${dateInfo.startDateStr}`);
      } catch (eventError) {
        logger.error(`Error processing event: ${eventError.message}`);
        // Skip this event and continue with the next one
        continue;
      }
    }
    
    // If we couldn't find any events on the main listings page, try the venue page directly
    if (events.length === 0) {
      logger.info('No events found on main listings, trying venue-specific page');
      
      const venueResponse = await axios.get(VENUE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });
      
      const $venue = cheerio.load(venueResponse.data);
      
      // Look for event information in upcoming events section
      const upcomingEvents = $venue('.upcoming-events .event, .event-listing, .event-item');
      logger.info(`Found ${upcomingEvents.length} events on venue page`);
      
      upcomingEvents.each((i, element) => {
        try {
          const $event = $venue(element);
          
          // Extract title
          const title = $event.find('.event-title, .title, h2, h3').first().text().trim();
          if (!title) return; // Skip if no title
          
          // Extract date
          const dateText = $event.find('.date, .event-date, .dates').first().text().trim();
          if (!dateText) return; // Skip if no date
          
          // Parse date information
          const dateInfo = parseEventDate(dateText);
          if (!dateInfo || !dateInfo.startDateStr) return; // Skip if date can't be parsed
          
          // Extract URL
          let eventUrl = '';
          const linkElement = $event.find('a').first();
          if (linkElement && linkElement.attr('href')) {
            eventUrl = makeAbsoluteUrl(linkElement.attr('href'));
          }
          
          // Extract image
          let imageUrl = '';
          const imageElement = $event.find('img').first();
          if (imageElement && imageElement.attr('src')) {
            imageUrl = makeAbsoluteUrl(imageElement.attr('src'));
          }
          
          // Create event object
          const event = {
            title,
            date: dateInfo.startDateStr,
            startTime: dateInfo.timeStr || null,
            endDate: dateInfo.endDateStr || null,
            url: eventUrl || VENUE_URL,
            venue: VENUE_NAME,
            address: VENUE_ADDRESS,
            city: VENUE_CITY,
            region: VENUE_REGION,
            postalCode: VENUE_POSTAL_CODE,
            country: VENUE_COUNTRY,
            description: `${title} at Vancouver Playhouse on ${dateInfo.startDateStr}.`,
            image: imageUrl
          };
          
          events.push(event);
          logger.info(`Added event from venue page: ${title} on ${dateInfo.startDateStr}`);
        } catch (eventError) {
          logger.error(`Error processing event from venue page: ${eventError.message}`);
          // Skip this event and continue with the next one
        }
      });
    }
    
    logger.info(`Successfully scraped ${events.length} events from Vancouver Playhouse`);
    return events;
  } catch (error) {
    logger.error(`Error scraping Vancouver Playhouse: ${error.message}`);
    
    // Return empty array on error, no fallback events
    return [];
  }
}

module.exports = scraper;
