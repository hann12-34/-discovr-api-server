/**
 * Vancouver Outdoor Events Scraper
 * Extracts event information from:
 * - https://vandusengarden.org/events/
 * - https://events.metrovancouver.org/
 * - https://stanleyparkecology.ca/events/
 * 
 * Last updated: June 16, 2025 - Strictly no fallbacks
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Determines the season based on the event date
 * @param {Date} date - Event date
 * @returns {string} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return "all";
  
  const month = date.getMonth();
  
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

/**
 * Parse date string to Date object
 * @param {string} dateString - String containing date information
 * @returns {Date|null} Date object or null if parsing fails
 */
function parseEventDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Try to identify date patterns
    const currentYear = new Date().getFullYear();
    
    // Handle dates like "May 25, 2025" or "May 25"
    const fullDateMatch = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/);
    if (fullDateMatch) {
      const month = fullDateMatch[1];
      const day = parseInt(fullDateMatch[2]);
      const year = fullDateMatch[3] ? parseInt(fullDateMatch[3]) : currentYear;
      
      const date = new Date(`${month} ${day}, ${year}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Handle dates like "2025-05-25" or "05/25/2025"
    const numericDateMatch = dateString.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (numericDateMatch) {
      let year, month, day;
      
      if (numericDateMatch[1]) {
        // Format: 2025-05-25
        year = parseInt(numericDateMatch[1]);
        month = parseInt(numericDateMatch[2]) - 1; // JS months are 0-indexed
        day = parseInt(numericDateMatch[3]);
      } else {
        // Format: 05/25/2025
        month = parseInt(numericDateMatch[4]) - 1;
        day = parseInt(numericDateMatch[5]);
        year = parseInt(numericDateMatch[6]);
        if (year < 100) year += 2000; // Fix 2-digit years
      }
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try direct parsing as last resort
    const directDate = new Date(dateString);
    if (!isNaN(directDate.getTime())) {
      return directDate;
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing date "${dateString}":`, error);
    return null;
  }
}

/**
 * Extract dates from text that may contain date ranges
 * @param {string} text - Text containing date information
 * @returns {Object} Start and end dates
 */
function extractDateRange(text) {
  if (!text) return { startDate: null, endDate: null };
  
  // Look for date ranges like "May 25 - September 15, 2025"
  const rangeMatch = text.match(/([A-Za-z]+\s+\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*([A-Za-z]+\s+\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
  
  if (rangeMatch) {
    const startDateStr = rangeMatch[1];
    const endDateStr = rangeMatch[2];
    const year = rangeMatch[3] || new Date().getFullYear().toString();
    
    const startDate = parseEventDate(`${startDateStr}, ${year}`);
    const endDate = parseEventDate(`${endDateStr}, ${year}`);
    
    return { startDate, endDate };
  }
  
  // Single date
  const singleDate = parseEventDate(text);
  return { startDate: singleDate, endDate: null };
}

/**
 * Scrapes events from VanDusen Botanical Garden
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeVanDusen() {
  console.log("Scraping VanDusen Botanical Garden events...");
  const events = [];
  const url = "https://vandusengarden.org/events/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, .event-card, .event-item, article, [class*="event"]').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .event-title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, .event-date, time').first().text().trim();
      
      // If no specific date element, look for date patterns in text
      if (!dateText) {
        $element.find('p, div').each((i, el) => {
          const text = $(el).text().trim();
          if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
              text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december).+\d{1,2}(?:st|nd|rd|th)?/i)) {
            dateText = text;
          }
        });
      }
      
      // Extract date range
      const { startDate, endDate } = extractDateRange(dateText);
      
      if (!startDate) return; // Skip if no date found
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://vandusengarden.org${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .summary').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - A special event at VanDusen Botanical Garden in Vancouver.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: "VanDusen Botanical Garden",
          address: "5251 Oak St",
          city: "Vancouver", 
          state: "BC",
          zipCode: "V6M 4H1",
          venueType: "outdoor",
          website: "https://vandusengarden.org",
          capacity: null
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "Vancouver, BC",
        latitude: 49.2387,
        longitude: -123.1295,
        type: "Event",
        price: "Varies",
        category: "Garden",
        season: determineSeason(startDate),
        status: "upcoming",
        source: "scraped",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping VanDusen Botanical Garden:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes events from Metro Vancouver Parks
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeMetroVancouver() {
  console.log("Scraping Metro Vancouver Park events...");
  const events = [];
  const url = "https://events.metrovancouver.org/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, .event-item, [class*="event"], article').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .event-title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, .event-date, time').first().text().trim();
      
      // If no specific date element, look for date patterns in text
      if (!dateText) {
        $element.find('p, div').each((i, el) => {
          const text = $(el).text().trim();
          if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
              text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december).+\d{1,2}(?:st|nd|rd|th)?/i)) {
            dateText = text;
          }
        });
      }
      
      // Extract date range
      const { startDate, endDate } = extractDateRange(dateText);
      
      if (!startDate) return; // Skip if no date found
      
      // Extract location/venue
      let venueName = $element.find('.location, .venue, [class*="location"], [class*="venue"]').first().text().trim();
      if (!venueName) {
        venueName = "Metro Vancouver Park";
      }
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://events.metrovancouver.org${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .summary').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - An outdoor event at ${venueName} in Metro Vancouver.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: venueName,
          address: "",
          city: "Vancouver", 
          state: "BC",
          website: "https://events.metrovancouver.org"
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: `${venueName}, Vancouver, BC`,
        type: "Event",
        category: "Outdoor",
        season: determineSeason(startDate),
        status: "active",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Metro Vancouver Parks:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes events from Stanley Park Ecology Society
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeStanleyParkEcology() {
  console.log("Scraping Stanley Park Ecology events...");
  const events = [];
  const url = "https://stanleyparkecology.ca/events/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, .event-card, .event-item, article, [class*="event"]').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .event-title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, .event-date, time').first().text().trim();
      
      // If no specific date element, look for date patterns in text
      if (!dateText) {
        $element.find('p, div').each((i, el) => {
          const text = $(el).text().trim();
          if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
              text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december).+\d{1,2}(?:st|nd|rd|th)?/i)) {
            dateText = text;
          }
        });
      }
      
      // Extract date range
      const { startDate, endDate } = extractDateRange(dateText);
      
      if (!startDate) return; // Skip if no date found
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://stanleyparkecology.ca${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .summary').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - An ecological event at Stanley Park in Vancouver.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: "Stanley Park",
          address: "Stanley Park Drive",
          city: "Vancouver", 
          state: "BC",
          website: "https://stanleyparkecology.ca"
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "Stanley Park, Vancouver, BC",
        type: "Event",
        category: "Nature",
        season: determineSeason(startDate),
        status: "active",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Stanley Park Ecology Society:", error);
    return []; // No fallbacks
  }
}

/**
 * Main scraper function that aggregates outdoor events from all sources
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Outdoor Events scraper...");
  let events = [];
  
  // Scrape VanDusen Botanical Garden
  const vanDusenEvents = await scrapeVanDusen();
  events = events.concat(vanDusenEvents);
  console.log(`Found ${vanDusenEvents.length} events at VanDusen Botanical Garden`);
  
  // Scrape Metro Vancouver Parks
  const metroVancouverEvents = await scrapeMetroVancouver();
  events = events.concat(metroVancouverEvents);
  console.log(`Found ${metroVancouverEvents.length} events at Metro Vancouver Parks`);
  
  // Scrape Stanley Park Ecology Society
  const stanleyParkEvents = await scrapeStanleyParkEcology();
  events = events.concat(stanleyParkEvents);
  console.log(`Found ${stanleyParkEvents.length} events at Stanley Park Ecology Society`);
  
  console.log(`Found ${events.length} outdoor events in total`);
  return events;
}

module.exports = {
  name: 'Vancouver Outdoor Events',
  urls: [
    'https://vandusengarden.org/events/',
    'https://events.metrovancouver.org/',
    'https://stanleyparkecology.ca/events/'
  ],
  scrape
};
