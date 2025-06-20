/**
 * Scraper for Shipyards Night Market
 * Extracts event information from https://shipyardsnightmarket.com/
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
 * Scrape Shipyards Night Market website for event information
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Shipyards Night Market scraper...");
  const events = [];
  const venueUrl = "https://shipyardsnightmarket.com/";
  
  try {
    // Get the website's HTML content
    const response = await axios.get(venueUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Extract event title
    const title = $('h1, .title, .header-title').first().text().trim() || 'Shipyards Night Market';
    
    // Look for dates and operating hours
    let operatingInfo = '';
    $('p, .operating-hours, .dates, .info, [class*="hour"], [class*="date"], [class*="time"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/(?:open|hours|dates|days|times|schedule|friday)/i)) {
        operatingInfo += text + ' ';
      }
    });
    
    // Extract start and end dates
    const { startDate, endDate } = extractDateRange(operatingInfo);
    
    // Create recurring Friday night events from May to September if dates found
    if (startDate && endDate) {
      const currentDate = new Date(startDate);
      
      // Generate events for every Friday between start and end dates
      while (currentDate <= endDate) {
        if (currentDate.getDay() === 5) { // Friday is day 5
          const eventDate = new Date(currentDate);
          
          // Get event image
          let imageURL = '';
          $('img[class*="banner"], img[class*="hero"], .main-image img, .header img').each((i, img) => {
            const src = $(img).attr('src') || $(img).attr('data-src');
            if (src && !imageURL) {
              imageURL = src.startsWith('http') ? src : `${venueUrl}${src}`;
            }
          });
          
          // Extract description
          let description = '';
          $('p, .description, .content, [class*="desc"], [class*="about"]').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && !text.match(/copyright|rights reserved/i)) {
              description += text + ' ';
            }
          });
          
          // Get location information
          let location = "Shipyards, 125 Victory Ship Way, North Vancouver, BC";
          $('[class*="location"], [class*="address"], address').each((i, el) => {
            const text = $(el).text().trim();
            if (text.match(/\d+.+(?:road|street|avenue|blvd|drive|way|st\.|ave\.|rd\.)/i)) {
              location = text;
            }
          });
          
          const season = determineSeason(eventDate);
          const eventTitle = `${title} - ${eventDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric'})}`;
          
          events.push({
            title: eventTitle,
            startDate: eventDate,
            endDate: null,
            venue: {
              name: "Shipyards",
              address: "125 Victory Ship Way",
              city: "North Vancouver",
              state: "BC",
              website: venueUrl
            },
            sourceURL: venueUrl,
            officialWebsite: venueUrl,
            imageURL,
            location,
            type: "Event",
            category: "Market",
            season,
            status: "active",
            description: description || `The Shipyards Night Market features food vendors, a beer garden, and local artisans every Friday night. ${operatingInfo}`
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // If no specific dates found, try to extract event information for a generic event
      
      // Get event image
      let imageURL = '';
      $('img[class*="banner"], img[class*="hero"], .main-image img, .header img').each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !imageURL) {
          imageURL = src.startsWith('http') ? src : `${venueUrl}${src}`;
        }
      });
      
      // Extract description
      let description = '';
      $('p, .description, .content, [class*="desc"], [class*="about"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !text.match(/copyright|rights reserved/i)) {
          description += text + ' ';
        }
      });
      
      // Look for specific event dates in the page content
      const dateMatches = description.match(/(?:starting|begins|opens).*?(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i);
      if (dateMatches) {
        const eventStartDate = parseEventDate(dateMatches[1]);
        if (eventStartDate) {
          const season = determineSeason(eventStartDate);
          
          events.push({
            title,
            startDate: eventStartDate,
            endDate: null,
            venue: {
              name: "Shipyards",
              address: "125 Victory Ship Way",
              city: "North Vancouver",
              state: "BC",
              website: venueUrl
            },
            sourceURL: venueUrl,
            officialWebsite: venueUrl,
            imageURL,
            location: "125 Victory Ship Way, North Vancouver, BC",
            type: "Event",
            category: "Market",
            season,
            status: "active",
            description: description || "The Shipyards Night Market features food vendors, a beer garden, and local artisans."
          });
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error("Error scraping Shipyards Night Market:", error);
    // No fallback events, return empty array if scraping fails
    return events;
  }
}

module.exports = {
  name: "Shipyards Night Market",
  url: "https://shipyardsnightmarket.com/",
  urls: ["https://shipyardsnightmarket.com/"],
  scrape
};
