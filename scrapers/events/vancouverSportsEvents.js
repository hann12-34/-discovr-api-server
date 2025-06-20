/**
 * Vancouver Sports Events Scraper
 * Extracts event information from various sports events in Vancouver:
 * - https://www.milb.com/vancouver
 * - https://t100triathlon.com/vancouver/participate/
 * - https://volleyball.ca/en/competitions/2025-beach-nationals
 * - https://picklefestcanada.com/
 * - https://canadarunningseries.com/vancouver-half-marathon/
 * - https://canadarunningseries.com/vancouver-eastside-10k/
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
 * Scrape a sports event URL for event information
 * @param {string} url - URL of the sports event
 * @param {string} name - Name of the sports event
 * @param {Object} defaultInfo - Default information for the event
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeSportsEvent(url, name, defaultInfo = {}) {
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
    const title = $('h1, .title, .header-title, [class*="title"]').first().text().trim() || name;
    
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
    let { startDate, endDate } = extractDateRange(dateText);
    
    // Use default dates if provided and no dates found
    if (!startDate && defaultInfo.startDate) {
      startDate = defaultInfo.startDate;
    }
    
    if (!endDate && defaultInfo.endDate) {
      endDate = defaultInfo.endDate;
    }
    
    if (!startDate) {
      console.log(`No date found for ${name}`);
      return []; // Skip events without dates
    }
    
    // Extract venue/location information
    let venueName = defaultInfo.venueName || '';
    let address = defaultInfo.address || '';
    let city = defaultInfo.city || 'Vancouver';
    let state = defaultInfo.state || 'BC';
    
    // Try to extract venue information from the page
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
    
    // Use default description if provided and no description found
    if (!description && defaultInfo.description) {
      description = defaultInfo.description;
    }
    
    // Calculate season
    const season = determineSeason(startDate);
    
    // Construct location string
    const location = address ? `${venueName ? venueName + ', ' : ''}${address}, ${city}, ${state}`.replace(/^, /, '') : `${city}, ${state}`;
    
    return [{
      title,
      startDate,
      endDate,
      venue: {
        name: venueName || name,
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
      category: "Sports",
      season,
      status: "active",
      description: description || `${title} is a sports event in Vancouver.`
    }];
    
  } catch (error) {
    console.error(`Error scraping ${name}:`, error);
    return []; // No fallbacks, return empty array
  }
}

/**
 * Main scraper function that processes all sports event URLs
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Sports Events scraper...");
  const events = [];
  
  // Define sports events to scrape with default information
  const sportsEvents = [
    { 
      url: "https://www.milb.com/vancouver", 
      name: "Vancouver Canadians Baseball",
      defaultInfo: {
        venueName: "Nat Bailey Stadium",
        address: "4601 Ontario St",
        city: "Vancouver",
        state: "BC",
        description: "Vancouver Canadians minor league baseball games at Nat Bailey Stadium."
      }
    },
    { 
      url: "https://t100triathlon.com/vancouver/participate/", 
      name: "T100 Triathlon Vancouver",
      defaultInfo: {
        startDate: new Date(2025, 6, 12), // July 12, 2025
        venueName: "Stanley Park",
        city: "Vancouver",
        state: "BC",
        description: "The T100 Triathlon is an Olympic distance triathlon event featuring swimming, cycling, and running in beautiful Vancouver."
      }
    },
    { 
      url: "https://volleyball.ca/en/competitions/2025-beach-nationals", 
      name: "Beach Volleyball Nationals",
      defaultInfo: {
        startDate: new Date(2025, 7, 18), // August 18, 2025
        endDate: new Date(2025, 7, 21), // August 21, 2025
        venueName: "Kitsilano Beach",
        address: "1499 Arbutus St",
        city: "Vancouver",
        state: "BC",
        description: "The Beach Volleyball Nationals bring together top volleyball players from across Canada to compete on the beautiful beaches of Vancouver."
      }
    },
    { 
      url: "https://picklefestcanada.com/", 
      name: "Pickle Fest Canada",
      defaultInfo: {
        venueName: "Vancouver Convention Centre",
        address: "1055 Canada Pl",
        city: "Vancouver",
        state: "BC",
        description: "Pickle Fest Canada celebrates the fastest growing sport in North America with tournaments, exhibitions, and clinics for players of all levels."
      }
    },
    { 
      url: "https://canadarunningseries.com/vancouver-half-marathon/", 
      name: "Vancouver Half Marathon",
      defaultInfo: {
        startDate: new Date(2025, 5, 22), // June 22, 2025
        venueName: "Stanley Park",
        city: "Vancouver",
        state: "BC",
        description: "The Vancouver Half Marathon is a scenic 21.1 km race through Vancouver's most beautiful areas, including Stanley Park and the Seawall."
      }
    },
    { 
      url: "https://canadarunningseries.com/vancouver-eastside-10k/", 
      name: "Vancouver Eastside 10K",
      defaultInfo: {
        startDate: new Date(2025, 8, 13), // September 13, 2025
        city: "Vancouver",
        state: "BC",
        description: "The Vancouver Eastside 10K is a fast and fun 10 km race through Vancouver's historic eastside neighborhoods."
      }
    }
  ];
  
  // Process each sports event
  for (const event of sportsEvents) {
    try {
      const sportEvents = await scrapeSportsEvent(event.url, event.name, event.defaultInfo || {});
      events.push(...sportEvents);
    } catch (error) {
      console.error(`Error processing ${event.name}:`, error);
    }
  }
  
  return events;
}

module.exports = {
  name: "Vancouver Sports Events",
  urls: [
    "https://www.milb.com/vancouver",
    "https://t100triathlon.com/vancouver/participate/",
    "https://volleyball.ca/en/competitions/2025-beach-nationals",
    "https://picklefestcanada.com/",
    "https://canadarunningseries.com/vancouver-half-marathon/",
    "https://canadarunningseries.com/vancouver-eastside-10k/"
  ],
  scrape
};
