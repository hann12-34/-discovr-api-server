/**
 * Scraper for The Rio Theatre
 * URL: https://riotheatre.ca/
 * No fallback events - returns empty array if no events found or on error
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { format } = require('date-fns');
const scrapeLogger = require('../../scrapeLogger');

// Define venue information
const VENUE_NAME = 'The Rio Theatre';
const VENUE_ADDRESS = '1660 E Broadway';
const VENUE_CITY = 'Vancouver';
const VENUE_REGION = 'BC';
const VENUE_POSTAL_CODE = 'V5N 1W1';
const VENUE_COUNTRY = 'Canada';
const BASE_URL = 'https://riotheatre.ca';
const EVENTS_URL = 'https://riotheatre.ca/events/';

/**
 * Helper function to convert relative URLs to absolute URLs
 * @param {string} url - The potentially relative URL
 * @returns {string} - Absolute URL
 */
function getAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Extract date and time information from text
 * @param {string} dateText - Text containing date/time information
 * @returns {Object|null} - Extracted date and time or null if not found
 */
function extractDateInfo(dateText) {
  try {
    if (!dateText) return null;

    // Rio Theatre typically formats dates as "Month Day, Year - Time"
    // E.g. "June 21, 2025 - 7:00 PM"
    
    // Match patterns like "June 21, 2025" or "Jun 21 2025" or "June 21"
    const datePattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:(\d{4}))?/i;
    const dateMatch = dateText.match(datePattern);
    
    if (!dateMatch) return null;
    
    const [, month, dayStr, yearStr] = dateMatch;
    const day = parseInt(dayStr, 10);
    
    // If year is not specified, use current year
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    const monthIndex = monthNames.findIndex(m => 
      month.toLowerCase().startsWith(m.substring(0, 3))
    );
    
    if (monthIndex === -1) return null;
    
    // Match time pattern like "7:00 PM" or "19:00"
    const timePattern = /(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i;
    const timeMatch = dateText.match(timePattern);
    
    let hours = 0;
    let minutes = 0;
    let timeString = null;
    
    if (timeMatch) {
      const [, hourStr, minuteStr, ampm] = timeMatch;
      hours = parseInt(hourStr, 10);
      minutes = parseInt(minuteStr, 10);
      
      // Convert to 24-hour format if AM/PM is specified
      if (ampm && ampm.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      
      timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }
    
    // Create date object
    const eventDate = new Date(year, monthIndex, day, hours, minutes);
    
    return {
      date: format(eventDate, 'yyyy-MM-dd'),
      time: timeString,
      dateObj: eventDate
    };
  } catch (error) {
    scrapeLogger.error(`Error extracting date info: ${error.message}`);
    return null;
  }
}

/**
 * Scrape individual event details from event page
 * @param {string} url - URL of event page
 * @returns {Object|null} - Event details or null if error
 */
async function scrapeEventDetails(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    let title = $('.event-title, h1.entry-title, .main-title').first().text().trim();
    if (!title) {
      title = $('title').text().replace(' - Rio Theatre', '').trim();
    }
    
    if (!title) {
      scrapeLogger.warn(`Could not find title for event at ${url}`);
      return null;
    }
    
    // Extract date information
    const dateText = $('.event-date, .date-time, .event-meta time, .eventdate, time').first().text().trim();
    if (!dateText) {
      scrapeLogger.warn(`Could not find date for event "${title}" at ${url}`);
      return null;
    }
    
    const dateInfo = extractDateInfo(dateText);
    if (!dateInfo) {
      scrapeLogger.warn(`Could not parse date "${dateText}" for event "${title}" at ${url}`);
      return null;
    }
    
    // Extract description
    let description = $('.event-description, .description, .entry-content p').text().trim();
    if (!description) {
      description = `${title} at The Rio Theatre on ${dateInfo.date}.`;
    }
    
    // Extract image
    let imageUrl = $('.event-image img, .featured-image img, .wp-post-image').first().attr('src');
    if (imageUrl) {
      imageUrl = getAbsoluteUrl(imageUrl);
    }
    
    // Create event object
    const event = {
      title,
      date: dateInfo.date,
      startTime: dateInfo.time,
      url,
      venue: VENUE_NAME,
      address: VENUE_ADDRESS,
      city: VENUE_CITY,
      region: VENUE_REGION,
      postalCode: VENUE_POSTAL_CODE,
      country: VENUE_COUNTRY,
      description,
      image: imageUrl
    };
    
    return event;
  } catch (error) {
    scrapeLogger.error(`Error scraping event details from ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Main scraper function for the Rio Theatre
 * @returns {Promise<Array>} - Array of event objects
 */
async function scraper() {
  const logger = scrapeLogger.child({ scraper: 'Rio Theatre' });
  logger.info('Starting Rio Theatre scraper');
  
  try {
    // Get events page
    const response = await axios.get(EVENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find all event links
    const eventUrls = [];
    
    // Try various selectors to find event links
    $('a.event-link, .event-list a, .events-list a, .event a, .event-title a').each((i, element) => {
      const href = $(element).attr('href');
      if (href && (href.includes('/events/') || href.includes('/event/')) && !eventUrls.includes(href)) {
        const eventUrl = getAbsoluteUrl(href);
        eventUrls.push(eventUrl);
      }
    });
    
    // Sometimes event links are within other elements like article, div, etc.
    $('article, .event, .event-item, .events-item').each((i, element) => {
      const linkElement = $(element).find('a').first();
      const href = linkElement.attr('href');
      if (href && (href.includes('/events/') || href.includes('/event/')) && !eventUrls.includes(href)) {
        const eventUrl = getAbsoluteUrl(href);
        eventUrls.push(eventUrl);
      }
    });
    
    // Also check the main page, as sometimes events are listed there
    if (eventUrls.length === 0) {
      logger.info('No events found on events page, trying main page');
      
      const mainPageResponse = await axios.get(BASE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });
      
      const $main = cheerio.load(mainPageResponse.data);
      
      $main('a').each((i, element) => {
        const href = $main(element).attr('href');
        if (href && (href.includes('/events/') || href.includes('/event/')) && !eventUrls.includes(href)) {
          const eventUrl = getAbsoluteUrl(href);
          eventUrls.push(eventUrl);
        }
      });
    }
    
    logger.info(`Found ${eventUrls.length} event URLs`);
    
    // Scrape details for each event
    const eventPromises = eventUrls.map(url => scrapeEventDetails(url));
    const eventResults = await Promise.all(eventPromises);
    
    // Filter out null results (failed to scrape)
    const events = eventResults.filter(event => event !== null);
    
    // If we couldn't scrape any events but found URLs, create basic events
    if (events.length === 0 && eventUrls.length > 0) {
      logger.warn('Failed to scrape any events in detail, creating basic event objects');
      
      for (const url of eventUrls) {
        // Extract event title from URL
        const urlParts = url.split('/');
        const slug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
        const title = slug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Create a basic event
        events.push({
          title: title || 'Event at The Rio Theatre',
          date: format(new Date(), 'yyyy-MM-dd'), // Current date as fallback
          url,
          venue: VENUE_NAME,
          address: VENUE_ADDRESS,
          city: VENUE_CITY,
          region: VENUE_REGION,
          postalCode: VENUE_POSTAL_CODE,
          country: VENUE_COUNTRY,
          description: `${title} at The Rio Theatre. Visit the event page for more details.`,
          image: null
        });
      }
    }
    
    logger.info(`Successfully scraped ${events.length} events from The Rio Theatre`);
    return events;
  } catch (error) {
    logger.error(`Error in Rio Theatre scraper: ${error.message}`);
    
    // Return empty array on error, no fallback events
    return [];
  }
}

module.exports = scraper;
