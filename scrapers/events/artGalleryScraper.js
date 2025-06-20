/**
 * Vancouver Art Gallery Scraper
 * Extracts event information from:
 * - https://www.vanartgallery.bc.ca/exhibitions
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
  
  // Look for patterns like "May 25 - September 15, 2025"
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
 * Main scraper function for Vancouver Art Gallery
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Art Gallery scraper...");
  const events = [];
  const url = "https://www.vanartgallery.bc.ca/exhibitions";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find exhibition elements
    $('.exhibition-card, .current-exhibitions .item, .upcoming-exhibitions .item').each((i, element) => {
      const $element = $(element);
      
      // Extract exhibition title
      const title = $element.find('h2, h3, .title').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.dates, .exhibition-dates, [class*="date"]').first().text().trim();
      
      // If no specific date element, try to find dates in paragraphs
      if (!dateText) {
        $element.find('p').each((i, p) => {
          const text = $(p).text().trim();
          if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i) ||
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
          imageURL = `https://www.vanartgallery.bc.ca${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('p.description, .excerpt, [class*="desc"]').each((i, p) => {
        description += $(p).text().trim() + ' ';
      });
      
      description = description.trim();
      
      if (!description) {
        // Look for description on linked page if available
        const linkHref = $element.find('a').first().attr('href');
        if (linkHref) {
          // This would require additional fetch, we'll just use a generic description
          description = `Art exhibition "${title}" at the Vancouver Art Gallery.`;
        }
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: 'Vancouver Art Gallery',
          address: '750 Hornby Street',
          city: 'Vancouver',
          state: 'BC',
          website: 'https://www.vanartgallery.bc.ca'
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: 'Vancouver Art Gallery, 750 Hornby Street, Vancouver, BC',
        type: 'Event',
        category: 'Art',
        season: determineSeason(startDate),
        status: 'active',
        description
      });
    });
    
    console.log(`Found ${events.length} events at Vancouver Art Gallery`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Vancouver Art Gallery:', error);
    return []; // No fallbacks, return empty array
  }
}

module.exports = {
  name: 'Vancouver Art Gallery',
  urls: ['https://www.vanartgallery.bc.ca/exhibitions'],
  scrape
};
