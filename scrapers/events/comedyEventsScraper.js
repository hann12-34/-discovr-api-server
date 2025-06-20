/**
 * Vancouver Comedy Events Scraper
 * Extracts event information from:
 * - https://www.littlemountaingallery.com/
 * - https://housespecial.ca/events
 * - https://www.thecomedymix.com/
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
 * Scrapes comedy events from Little Mountain Gallery
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeLittleMountainGallery() {
  console.log("Scraping Little Mountain Gallery events...");
  const events = [];
  const url = "https://www.littlemountaingallery.com/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event-item, .event-card, .events-list .event, [class*="event"]').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .event-title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, time, .event-date').first().text().trim();
      
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
      
      const date = parseEventDate(dateText);
      if (!date) return; // Skip if no date found
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://www.littlemountaingallery.com${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `Comedy event "${title}" at Little Mountain Gallery. Check venue website for more information.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate: date,
        endDate: null,
        venue: {
          name: "Little Mountain Gallery",
          address: "195 E 26th Ave",
          city: "Vancouver",
          state: "BC",
          website: url
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "Little Mountain Gallery, 195 E 26th Ave, Vancouver, BC",
        type: "Event",
        category: "Comedy",
        season: determineSeason(date),
        status: "active",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Little Mountain Gallery:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes comedy events from House Special
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeHouseSpecial() {
  console.log("Scraping House Special events...");
  const events = [];
  const url = "https://housespecial.ca/events";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event-item, .event, [class*="event"]').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .name').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, time').first().text().trim();
      
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
      
      const date = parseEventDate(dateText);
      if (!date) return; // Skip if no date found
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://housespecial.ca${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `Comedy event "${title}" at House Special. Check venue website for more information.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate: date,
        endDate: null,
        venue: {
          name: "House Special",
          address: "3124 Main St",
          city: "Vancouver",
          state: "BC",
          website: url
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "House Special, 3124 Main St, Vancouver, BC",
        type: "Event",
        category: "Comedy",
        season: determineSeason(date),
        status: "active",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping House Special:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes comedy events from The Comedy MIX
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeComedyMIX() {
  console.log("Scraping The Comedy MIX events...");
  const events = [];
  const url = "https://www.thecomedymix.com/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, [class*="event"], .show-item').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .name').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, time, .show-date').first().text().trim();
      
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
      
      const date = parseEventDate(dateText);
      if (!date) return; // Skip if no date found
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://www.thecomedymix.com${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .bio').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `Comedy event "${title}" at The Comedy MIX. Check venue website for more information.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate: date,
        endDate: null,
        venue: {
          name: "The Comedy MIX",
          address: "117 W Pender St, 2nd Floor",
          city: "Vancouver",
          state: "BC",
          website: url
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "The Comedy MIX, 117 W Pender St, 2nd Floor, Vancouver, BC",
        type: "Event",
        category: "Comedy",
        season: determineSeason(date),
        status: "active",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping The Comedy MIX:", error);
    return []; // No fallbacks
  }
}

/**
 * Main scraper function that aggregates comedy events from all sources
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Comedy Events scraper...");
  let events = [];
  
  // Scrape Little Mountain Gallery
  const lmgEvents = await scrapeLittleMountainGallery();
  events = events.concat(lmgEvents);
  console.log(`Found ${lmgEvents.length} events at Little Mountain Gallery`);
  
  // Scrape House Special
  const hsEvents = await scrapeHouseSpecial();
  events = events.concat(hsEvents);
  console.log(`Found ${hsEvents.length} events at House Special`);
  
  // Scrape Comedy MIX
  const mixEvents = await scrapeComedyMIX();
  events = events.concat(mixEvents);
  console.log(`Found ${mixEvents.length} events at The Comedy MIX`);
  
  console.log(`Found ${events.length} comedy events in total`);
  return events;
}

module.exports = {
  name: 'Vancouver Comedy Events',
  urls: [
    'https://www.littlemountaingallery.com/',
    'https://housespecial.ca/events',
    'https://www.thecomedymix.com/'
  ],
  scrape
};
