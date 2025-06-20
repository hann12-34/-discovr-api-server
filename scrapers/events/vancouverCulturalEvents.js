/**
 * Vancouver Cultural Events Scraper
 * Extracts event information from:
 * - https://www.vancouverpresents.com/
 * - https://www.alliancefrancaise.ca/en/culture/more
 * - https://www.italianculturalcentre.ca/upcoming-events
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
 * Scrapes Vancouver Presents
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeVancouverPresents() {
  console.log("Scraping Vancouver Presents events...");
  const events = [];
  const url = "https://www.vancouverpresents.com/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, article, .post, .listing-item').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, .title, .post-title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, time, .post-date, .event-date').first().text().trim();
      
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
      
      // Extract venue
      let venueName = $element.find('.venue, .location').first().text().trim();
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://www.vancouverpresents.com${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .summary').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - A cultural event in Vancouver.`;
      }
      
      // Extract link
      let eventURL = '';
      const linkElement = $element.find('a').first();
      if (linkElement.length) {
        eventURL = linkElement.attr('href') || '';
        if (eventURL && !eventURL.startsWith('http')) {
          eventURL = `https://www.vancouverpresents.com${eventURL.startsWith('/') ? '' : '/'}${eventURL}`;
        }
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: venueName || "Various Venues",
          address: "",
          city: "Vancouver",
          state: "BC",
          zipCode: "",
          venueType: "theater",
          website: url,
          capacity: null
        },
        sourceURL: url,
        officialWebsite: eventURL || url,
        imageURL,
        location: "Vancouver, BC",
        latitude: 49.2827,
        longitude: -123.1207,
        type: "Event",
        price: "Varies",
        category: "Culture",
        season: determineSeason(startDate),
        status: "upcoming",
        source: "scraped",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Vancouver Presents:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes Alliance Française events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeAllianceFrancaise() {
  console.log("Scraping Alliance Française events...");
  const events = [];
  const url = "https://www.alliancefrancaise.ca/en/culture/more";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, .event-item, article, [class*="event"]').each((i, element) => {
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
          imageURL = `https://www.alliancefrancaise.ca${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .summary').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - A French cultural event at Alliance Française Vancouver.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: "Alliance Française Vancouver",
          address: "6161 Cambie St",
          city: "Vancouver", 
          state: "BC",
          zipCode: "V5Z 3B2",
          venueType: "cultural",
          website: "https://www.alliancefrancaise.ca",
          capacity: null
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "Vancouver, BC",
        latitude: 49.2305,
        longitude: -123.1152,
        type: "Event",
        price: "Varies",
        category: "Culture",
        season: determineSeason(startDate),
        status: "upcoming",
        source: "scraped",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Alliance Française:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes Italian Cultural Centre events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeItalianCulturalCentre() {
  console.log("Scraping Italian Cultural Centre events...");
  const events = [];
  const url = "https://www.italianculturalcentre.ca/upcoming-events";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event, .event-item, article, [class*="event"]').each((i, element) => {
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
          imageURL = `https://www.italianculturalcentre.ca${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p, .description, .excerpt, .summary').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - An Italian cultural event at the Italian Cultural Centre in Vancouver.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: "Italian Cultural Centre",
          address: "3075 Slocan St",
          city: "Vancouver", 
          state: "BC",
          zipCode: "V5M 3E4",
          venueType: "cultural",
          website: "https://www.italianculturalcentre.ca",
          capacity: null
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "Vancouver, BC",
        latitude: 49.2592,
        longitude: -123.0478,
        type: "Event",
        price: "Varies",
        category: "Culture",
        season: determineSeason(startDate),
        status: "upcoming",
        source: "scraped",
        description
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Italian Cultural Centre:", error);
    return []; // No fallbacks
  }
}

/**
 * Main scraper function that aggregates cultural events from all sources
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Cultural Events scraper...");
  let events = [];
  
  // Scrape Vancouver Presents
  const vancouverPresentsEvents = await scrapeVancouverPresents();
  events = events.concat(vancouverPresentsEvents);
  console.log(`Found ${vancouverPresentsEvents.length} events at Vancouver Presents`);
  
  // Scrape Alliance Française
  const allianceFrancaiseEvents = await scrapeAllianceFrancaise();
  events = events.concat(allianceFrancaiseEvents);
  console.log(`Found ${allianceFrancaiseEvents.length} events at Alliance Française`);
  
  // Scrape Italian Cultural Centre
  const italianCentreEvents = await scrapeItalianCulturalCentre();
  events = events.concat(italianCentreEvents);
  console.log(`Found ${italianCentreEvents.length} events at Italian Cultural Centre`);
  
  console.log(`Found ${events.length} cultural events in total`);
  return events;
}

module.exports = {
  name: 'Vancouver Cultural Events',
  urls: [
    'https://www.vancouverpresents.com/',
    'https://www.alliancefrancaise.ca/en/culture/more',
    'https://www.italianculturalcentre.ca/upcoming-events'
  ],
  scrape
};
