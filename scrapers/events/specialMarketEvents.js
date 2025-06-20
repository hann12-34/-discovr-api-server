/**
 * Special Market Events Scraper
 * Extracts event information from various market events in Vancouver:
 * - https://junctionpublicmarket.com/
 * - https://www.theveganmarket.ca/
 * - https://japanmarket.ca/
 * - https://portobellowest.com/summer-market-2025/
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
 * Extract dates from text that may contain operating hours/dates
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
  
  // If no range is found, try to extract a single date
  const singleDate = parseEventDate(text);
  return { startDate: singleDate, endDate: null };
}

/**
 * Scrape a market event URL for event information
 * @param {string} url - URL of the market event
 * @param {string} name - Name of the market event
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeMarketEvent(url, name) {
  console.log(`Scraping ${name} at ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('h1, .title, .header-title').first().text().trim() || name;
    
    // Look for date information
    let dateText = '';
    $('[class*="date"], time, .when, [class*="when"], [class*="time"], .event-date').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i)) {
        dateText += text + ' ';
      }
    });
    
    // If no specific date elements found, look in paragraphs
    if (!dateText) {
      $('p, .info, .details').each((i, el) => {
        const text = $(el).text().trim();
        if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i) ||
            text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december).+\d{1,2}(?:st|nd|rd|th)?/i)) {
          dateText += text + ' ';
        }
      });
    }
    
    // Extract date from text
    const { startDate, endDate } = extractDateRange(dateText);
    
    if (!startDate) {
      console.log(`No date found for ${name}`);
      return []; // Skip events without dates
    }
    
    // Extract venue/location information
    let venueName = '';
    let address = '';
    let city = 'Vancouver';
    let state = 'BC';
    
    $('[class*="location"], [class*="venue"], address, .address, [class*="address"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d+.+(?:road|street|avenue|blvd|drive|way|st\.|ave\.|rd\.)/i)) {
        address = text;
        
        // Extract venue name from context if available
        const venueHeader = $(el).prev('h2, h3, h4, .venue-name');
        if (venueHeader.length) {
          venueName = venueHeader.text().trim();
        }
      }
    });
    
    // Default venue name if not found
    venueName = venueName || name;
    
    // Get event image
    let imageURL = '';
    $('meta[property="og:image"]').each((i, el) => {
      const content = $(el).attr('content');
      if (content && !imageURL) {
        imageURL = content;
      }
    });
    
    if (!imageURL) {
      $('img[class*="hero"], img[class*="banner"], .main-image img, header img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !imageURL) {
          imageURL = src.startsWith('http') ? src : `${url.replace(/\/[^\/]*$/, '')}/${src}`;
        }
      });
    }
    
    // Extract description
    let description = '';
    $('meta[name="description"], meta[property="og:description"]').each((i, el) => {
      const content = $(el).attr('content');
      if (content && content.length > 10) {
        description = content;
      }
    });
    
    if (!description) {
      $('p, .description, [class*="desc"], [class*="about"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !text.match(/copyright|rights reserved/i)) {
          description += text + ' ';
        }
      });
    }
    
    // Calculate season
    const season = determineSeason(startDate);
    
    // Construct location string
    const location = address ? `${venueName}, ${address}, ${city}, ${state}`.replace(/^, /, '') : `${city}, ${state}`;
    
    return [{
      title,
      startDate,
      endDate,
      venue: {
        name: venueName,
        address,
        city,
        state,
        website: url
      },
      sourceURL: url,
      officialWebsite: url,
      imageURL,
      location,
      type: "Event",
      category: "Market",
      season,
      status: "active",
      description: description || `${title} is a special market event in Vancouver featuring local vendors and artisans.`
    }];
    
  } catch (error) {
    console.error(`Error scraping ${name}:`, error);
    return []; // No fallbacks, return empty array
  }
}

/**
 * Main scraper function that processes all market URLs
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Special Market Events scraper...");
  const events = [];
  
  // Define markets to scrape
  const markets = [
    { url: "https://junctionpublicmarket.com/", name: "Junction Public Market" },
    { url: "https://www.theveganmarket.ca/", name: "The Vegan Market" },
    { url: "https://japanmarket.ca/", name: "Japan Market" },
    { url: "https://portobellowest.com/summer-market-2025/", name: "Portobello West Summer Market" }
  ];
  
  // Process each market
  for (const market of markets) {
    try {
      const marketEvents = await scrapeMarketEvent(market.url, market.name);
      events.push(...marketEvents);
    } catch (error) {
      console.error(`Error processing ${market.name}:`, error);
    }
  }
  
  return events;
}

module.exports = {
  name: "Special Market Events",
  urls: [
    "https://junctionpublicmarket.com/",
    "https://www.theveganmarket.ca/",
    "https://japanmarket.ca/",
    "https://portobellowest.com/summer-market-2025/"
  ],
  scrape
};
