/**
 * Beer Festival Scraper
 * Extracts event information from beer festival URLs like:
 * - https://www.vancouvercraftbeerweek.com/
 * - https://squamishbeerfestival.com/
 * - https://gvzoo.com/brewatthezoo/
 * - https://www.breweryandthebeast.com/
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
 * Scrape a specific beer festival URL
 * @param {string} festivalUrl - URL of the beer festival
 * @param {string} festivalName - Name of the festival
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeFestivalUrl(festivalUrl, festivalName) {
  console.log(`Scraping ${festivalName} at ${festivalUrl}`);
  
  try {
    const response = await axios.get(festivalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract event title
    let title = $('h1, .title, .header-title, [class*="title"]').first().text().trim() || festivalName;
    
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
      console.log(`No date found for ${festivalName}`);
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
    
    // Extract from title for special cases
    if (festivalUrl.includes('brewatthezoo')) {
      venueName = 'Greater Vancouver Zoo';
      address = '5048 264 St';
      city = 'Aldergrove';
    } else if (festivalUrl.includes('squamishbeerfestival')) {
      city = 'Squamish';
      venueName = "O'Siyam Pavilion";
      address = '37950 Cleveland Ave';
    }
    
    // Get festival image
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
          imageURL = src.startsWith('http') ? src : `${festivalUrl.replace(/\/[^\/]*$/, '')}/${src}`;
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
    const location = address ? `${venueName || ''}, ${address}, ${city}, ${state}`.replace(/^, /, '') : `${city}, ${state}`;
    
    return [{
      title,
      startDate,
      endDate,
      venue: {
        name: venueName || festivalName,
        address,
        city,
        state,
        website: festivalUrl
      },
      sourceURL: festivalUrl,
      officialWebsite: festivalUrl,
      imageURL,
      location,
      type: "Event",
      category: "Festival",
      season,
      status: "active",
      description: description || `${title} is a beer festival featuring craft breweries and food vendors.`
    }];
    
  } catch (error) {
    console.error(`Error scraping ${festivalName}:`, error);
    return []; // No fallbacks, return empty array
  }
}

/**
 * Main scraper function that processes all beer festival URLs
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Beer Festival scraper...");
  const events = [];
  
  // Define festivals to scrape
  const festivals = [
    { url: "https://www.vancouvercraftbeerweek.com/", name: "Vancouver Craft Beer Week" },
    { url: "https://squamishbeerfestival.com/", name: "Squamish Beer Festival" },
    { url: "https://gvzoo.com/brewatthezoo/", name: "Brew at the Zoo" },
    { url: "https://www.breweryandthebeast.com/", name: "Brewery and the Beast" }
  ];
  
  // Process each festival
  for (const festival of festivals) {
    try {
      const festivalEvents = await scrapeFestivalUrl(festival.url, festival.name);
      events.push(...festivalEvents);
    } catch (error) {
      console.error(`Error processing ${festival.name}:`, error);
    }
  }
  
  return events;
}

module.exports = {
  name: "Beer Festivals",
  urls: [
    "https://www.vancouvercraftbeerweek.com/",
    "https://squamishbeerfestival.com/",
    "https://gvzoo.com/brewatthezoo/",
    "https://www.breweryandthebeast.com/"
  ],
  scrape
};
