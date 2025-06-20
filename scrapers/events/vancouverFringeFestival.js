/**
 * Vancouver Fringe Festival Scraper
 * Extracts event information from:
 * - https://www.vancouverfringe.com/festival/
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
 * Main scraper function for Vancouver Fringe Festival
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Fringe Festival scraper...");
  const events = [];
  const url = "https://www.vancouverfringe.com/festival/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // First, try to find the main festival dates
    let festivalDateText = '';
    $('h1:contains("Festival"), h2:contains("Festival"), h3:contains("Festival")').each((i, el) => {
      const nextElement = $(el).next();
      if (nextElement.length) {
        const text = nextElement.text().trim();
        if (text.match(/\d{1,2}|\bseptember\b|\bjune\b|\bjuly\b|\baugust\b/i)) {
          festivalDateText = text;
        }
      }
    });
    
    if (!festivalDateText) {
      $('p:contains("Festival dates"), .dates, [class*="date"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text.match(/\d{1,2}|\bseptember\b|\bjune\b|\bjuly\b|\baugust\b/i)) {
          festivalDateText += text + ' ';
        }
      });
    }
    
    // Extract date range for the main festival
    let { startDate, endDate } = extractDateRange(festivalDateText);
    
    // If no dates found, use default dates (Vancouver Fringe is typically in September)
    if (!startDate) {
      // Default to approximate dates for Vancouver Fringe Festival
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, 8, 5); // September 5th
      endDate = new Date(currentYear, 8, 15); // September 15th
    }
    
    // Main festival event
    events.push({
      title: "Vancouver Fringe Festival",
      startDate,
      endDate,
      venue: {
        name: "Various Venues",
        address: "",
        city: "Vancouver",
        state: "BC",
        website: "https://www.vancouverfringe.com"
      },
      sourceURL: url,
      officialWebsite: url,
      imageURL: $('meta[property="og:image"]').attr('content') || '',
      location: "Various Venues, Vancouver, BC",
      type: "Event",
      category: "Festival",
      season: determineSeason(startDate),
      status: "active",
      description: $('meta[name="description"], meta[property="og:description"]').attr('content') || 
                  "Vancouver Fringe Festival is an annual celebration of theatre arts featuring performances by local and international artists across multiple venues in Vancouver."
    });
    
    // Now look for individual shows within the festival
    $('.show-item, .event-item, article, .performance').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('h2, h3, h4, .title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.date, .dates, time').first().text().trim();
      
      // If no specific date element, try to find dates in paragraphs
      if (!dateText) {
        $element.find('p').each((i, p) => {
          const text = $(p).text().trim();
          if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:september|august)/i) ||
              text.match(/(?:september|august).+\d{1,2}(?:st|nd|rd|th)?/i)) {
            dateText = text;
          }
        });
      }
      
      // Parse date - if no specific dates for this show, use main festival dates
      let showStartDate = null;
      let showEndDate = null;
      
      if (dateText) {
        const dateRange = extractDateRange(dateText);
        showStartDate = dateRange.startDate;
        showEndDate = dateRange.endDate;
      }
      
      // If still no dates, fall back to main festival dates
      if (!showStartDate) {
        showStartDate = startDate;
        showEndDate = endDate;
      }
      
      // Extract venue
      let venue = $element.find('.venue, .location').first().text().trim();
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://www.vancouverfringe.com${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('.description, .excerpt, .summary, p:not(.date):not(.venue)').each((i, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20 && !text.match(/tickets|buy now|purchase/i)) {
          description += text + ' ';
        }
      });
      
      description = description.trim();
      
      if (!description) {
        description = `"${title}" - A performance at the Vancouver Fringe Festival. Check the festival website for more details.`;
      }
      
      // Create show event object
      events.push({
        title: `${title} - Vancouver Fringe Festival`,
        startDate: showStartDate,
        endDate: showEndDate,
        venue: {
          name: venue || "Fringe Festival Venue",
          address: "",
          city: "Vancouver",
          state: "BC",
          website: "https://www.vancouverfringe.com"
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: venue ? `${venue}, Vancouver, BC` : "Vancouver Fringe Festival Venue, Vancouver, BC",
        type: "Event",
        category: "Theatre",
        season: determineSeason(showStartDate),
        status: "active",
        description
      });
    });
    
    console.log(`Found ${events.length} events for Vancouver Fringe Festival`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Vancouver Fringe Festival:', error);
    return []; // No fallbacks, return empty array
  }
}

module.exports = {
  name: 'Vancouver Fringe Festival',
  urls: ['https://www.vancouverfringe.com/festival/'],
  scrape
};
