/**
 * Museum of Anthropology (MOA) at UBC Scraper
 * URL: https://moa.ubc.ca/exhibitions-events/
 * No fallback events - returns empty array if no events found or on error
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const scrapeLogger = require('../../scrapeLogger');

// Define venue information
const VENUE_NAME = 'Museum of Anthropology at UBC';
const VENUE_ADDRESS = '6393 NW Marine Drive';
const VENUE_CITY = 'Vancouver';
const VENUE_REGION = 'BC';
const VENUE_POSTAL_CODE = 'V6T 1Z2';
const VENUE_COUNTRY = 'Canada';
const BASE_URL = 'https://moa.ubc.ca';
const EXHIBITIONS_EVENTS_URL = `${BASE_URL}/exhibitions-events/`;

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
 * Extract date information from text
 * @param {string} dateText - Text containing date information
 * @returns {Object|null} - Extracted date information or null if not found
 */
function extractDateInfo(dateText) {
  try {
    if (!dateText) return null;
    
    // MOA typically formats dates as "Month Day, Year – Month Day, Year" for exhibitions
    // or "Month Day, Year" for single-day events
    
    // First, try to match a date range pattern (e.g., "June 15, 2025 – September 10, 2025")
    const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})\s*[–-]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})/i;
    const dateRangeMatch = dateText.match(dateRangePattern);
    
    if (dateRangeMatch) {
      const [, startMonth, startDayStr, startYearStr, endMonth, endDayStr, endYearStr] = dateRangeMatch;
      
      const startDay = parseInt(startDayStr, 10);
      const startYear = parseInt(startYearStr, 10);
      const endDay = parseInt(endDayStr, 10);
      const endYear = parseInt(endYearStr, 10);
      
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const startMonthIndex = monthNames.findIndex(m => 
        startMonth.toLowerCase().startsWith(m.substring(0, 3))
      );
      
      const endMonthIndex = monthNames.findIndex(m => 
        endMonth.toLowerCase().startsWith(m.substring(0, 3))
      );
      
      if (startMonthIndex !== -1 && endMonthIndex !== -1) {
        const startDate = new Date(startYear, startMonthIndex, startDay);
        const endDate = new Date(endYear, endMonthIndex, endDay);
        
        return {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          isRange: true
        };
      }
    }
    
    // Try to match a single date (e.g., "June 15, 2025")
    const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})/i;
    const singleDateMatch = dateText.match(singleDatePattern);
    
    if (singleDateMatch) {
      const [, month, dayStr, yearStr] = singleDateMatch;
      
      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);
      
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const monthIndex = monthNames.findIndex(m => 
        month.toLowerCase().startsWith(m.substring(0, 3))
      );
      
      if (monthIndex !== -1) {
        const date = new Date(year, monthIndex, day);
        
        return {
          startDate: format(date, 'yyyy-MM-dd'),
          endDate: null,
          isRange: false
        };
      }
    }
    
    // Look for any times in the text (e.g., "7:00 PM")
    const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
    const timeMatch = dateText.match(timePattern);
    
    let time = null;
    if (timeMatch) {
      const [, hourStr, minuteStr, ampm] = timeMatch;
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      // Convert to 24-hour format
      if (ampm.toLowerCase() === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
      
      time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    }
    
    // Return time info if available
    if (time) {
      return { time };
    }
    
    return null;
  } catch (error) {
    scrapeLogger.error(`Error extracting date info: ${error.message}`);
    return null;
  }
}

/**
 * Scrape individual exhibition or event details
 * @param {string} url - URL of the exhibition or event page
 * @returns {Promise<Object|null>} - Event details or null if error
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
    const title = $('h1.entry-title, .page-title, h1').first().text().trim();
    if (!title) {
      scrapeLogger.warn(`Could not find title for page at ${url}`);
      return null;
    }
    
    // Extract date information
    let dateText = $('.event-date, .date-display, .event-details time, .exhibition-dates').text().trim();
    if (!dateText) {
      // Try to find date in other common elements
      $('p, .event-info, .exhibition-info').each((i, element) => {
        const text = $(element).text();
        if (text.match(/\d{4}/) && (text.includes('January') || text.includes('February') || 
            text.includes('March') || text.includes('April') || text.includes('May') || 
            text.includes('June') || text.includes('July') || text.includes('August') || 
            text.includes('September') || text.includes('October') || text.includes('November') || 
            text.includes('December'))) {
          dateText = text;
          return false; // break the loop
        }
      });
    }
    
    // Extract date information
    const dateInfo = dateText ? extractDateInfo(dateText) : null;
    
    // If no date info found, use current date as start date for exhibitions
    const today = new Date();
    const startDate = dateInfo?.startDate || format(today, 'yyyy-MM-dd');
    
    // For exhibitions, set a default end date 3 months in the future if not specified
    let endDate = null;
    if (url.includes('/exhibition/')) {
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(today.getMonth() + 3);
      endDate = dateInfo?.endDate || format(threeMonthsLater, 'yyyy-MM-dd');
    } else {
      endDate = dateInfo?.endDate || null;
    }
    
    // Extract description
    let description = '';
    $('.entry-content p, .event-description p, .exhibition-description p').each((i, element) => {
      const text = $(element).text().trim();
      if (text.length > 20) { // Only include substantive paragraphs
        description += text + ' ';
      }
    });
    
    if (!description) {
      description = `${title} at the Museum of Anthropology at UBC. Check the museum's website for more details.`;
    }
    
    // Extract image
    let imageUrl = $('.featured-image img, .wp-post-image, .event-image img, .exhibition-image img').first().attr('src');
    if (imageUrl) {
      imageUrl = getAbsoluteUrl(imageUrl);
    }
    
    // Determine event type based on URL
    const isExhibition = url.includes('/exhibition/');
    
    // Create event object
    const event = {
      title,
      date: startDate,
      startTime: dateInfo?.time || null,
      endDate,
      url,
      venue: VENUE_NAME,
      address: VENUE_ADDRESS,
      city: VENUE_CITY,
      region: VENUE_REGION,
      postalCode: VENUE_POSTAL_CODE,
      country: VENUE_COUNTRY,
      description: description.trim(),
      image: imageUrl,
      type: isExhibition ? 'Exhibition' : 'Event'
    };
    
    return event;
  } catch (error) {
    scrapeLogger.error(`Error scraping details for ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Main scraper function for MOA
 * @returns {Promise<Array>} - Array of event objects
 */
async function scraper() {
  const logger = scrapeLogger.child({ scraper: 'Museum of Anthropology' });
  logger.info('Starting Museum of Anthropology scraper');
  
  try {
    // Array to store events and exhibitions
    const events = [];
    
    // First, scrape the exhibitions and events page
    const mainResponse = await axios.get(EXHIBITIONS_EVENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(mainResponse.data);
    
    // Find all exhibition and event links
    const eventUrls = new Set();
    
    // Look for exhibitions
    $('a').each((i, element) => {
      const href = $(element).attr('href');
      if (href && (href.includes('/exhibition/') || href.includes('/event/'))) {
        const fullUrl = getAbsoluteUrl(href);
        eventUrls.add(fullUrl);
      }
    });
    
    logger.info(`Found ${eventUrls.size} exhibition and event URLs`);
    
    // Check specific exhibition and event listing pages if main page didn't yield results
    if (eventUrls.size === 0) {
      const pagesToCheck = [
        `${BASE_URL}/exhibitions/`,
        `${BASE_URL}/events/`,
        `${BASE_URL}/whats-on/`
      ];
      
      for (const pageUrl of pagesToCheck) {
        try {
          logger.info(`Checking additional page: ${pageUrl}`);
          
          const response = await axios.get(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
          });
          
          const $page = cheerio.load(response.data);
          
          $page('a').each((i, element) => {
            const href = $page(element).attr('href');
            if (href && (href.includes('/exhibition/') || href.includes('/event/'))) {
              const fullUrl = getAbsoluteUrl(href);
              eventUrls.add(fullUrl);
            }
          });
        } catch (pageError) {
          logger.warn(`Error checking page ${pageUrl}: ${pageError.message}`);
        }
      }
      
      logger.info(`After checking additional pages, found ${eventUrls.size} exhibition and event URLs`);
    }
    
    // Scrape details for each exhibition and event
    const eventPromises = Array.from(eventUrls).map(url => scrapeEventDetails(url));
    const eventResults = await Promise.all(eventPromises);
    
    // Filter out null results
    const validEvents = eventResults.filter(event => event !== null);
    events.push(...validEvents);
    
    logger.info(`Successfully scraped ${events.length} exhibitions and events from Museum of Anthropology`);
    
    return events;
  } catch (error) {
    logger.error(`Error in Museum of Anthropology scraper: ${error.message}`);
    
    // Return empty array on error, no fallback events
    return [];
  }
}

module.exports = scraper;
