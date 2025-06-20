/**
 * Vancouver Civic Theatres Scraper
 * Extracts event information from:
 * - https://www.vancouvercivictheatres.com/events/
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
 * Main scraper function for Vancouver Civic Theatres
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Civic Theatres scraper...");
  const events = [];
  const url = "https://www.vancouvercivictheatres.com/events/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    $('.event-item, .event-card, article.event').each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.find('.event-title, h2, h3').first().text().trim();
      if (!title) return; // Skip if no title
      
      // Extract dates
      let dateText = $element.find('.event-date, .date, time').first().text().trim();
      
      // Parse date
      const date = parseEventDate(dateText);
      if (!date) return; // Skip if no date found
      
      // Extract venue
      let venue = $element.find('.venue, .location').first().text().trim();
      if (!venue) {
        venue = "Vancouver Civic Theatres"; // Default venue
      }
      
      // Determine location based on venue name
      let address = "";
      let city = "Vancouver";
      let state = "BC";
      
      if (venue.includes("Orpheum")) {
        address = "601 Smithe St";
        venue = "The Orpheum";
      } else if (venue.includes("Queen Elizabeth")) {
        address = "630 Hamilton St";
        venue = "Queen Elizabeth Theatre";
      } else if (venue.includes("Vancouver Playhouse")) {
        address = "600 Hamilton St";
        venue = "Vancouver Playhouse";
      } else if (venue.includes("Annex")) {
        address = "823 Seymour St";
        venue = "Annex Theatre";
      }
      
      // Extract image
      let imageURL = '';
      const imgElement = $element.find('img').first();
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://www.vancouvercivictheatres.com${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      $element.find('.description, .excerpt, .event-description, p').each((i, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20) { // Avoid empty or very short texts
          description += text + ' ';
        }
      });
      
      description = description.trim();
      
      if (!description) {
        description = `${title} at ${venue}. Check the venue's website for more information.`;
      }
      
      // Extract ticket link
      let ticketLink = '';
      $element.find('a.ticket-link, a.buy-tickets, a[href*="ticket"]').each((i, link) => {
        const href = $(link).attr('href');
        if (href) {
          ticketLink = href.startsWith('http') ? href : `https://www.vancouvercivictheatres.com${href.startsWith('/') ? '' : '/'}${href}`;
        }
      });
      
      // Create event object
      events.push({
        title,
        startDate: date,
        endDate: null, // Most theatrical performances are single-day events
        venue: {
          name: venue,
          address,
          city,
          state,
          website: "https://www.vancouvercivictheatres.com"
        },
        sourceURL: url,
        officialWebsite: ticketLink || url,
        imageURL,
        location: `${venue}, ${address ? address + ', ' : ''}${city}, ${state}`,
        type: 'Event',
        category: 'Theatre',
        season: determineSeason(date),
        status: 'active',
        description
      });
    });
    
    console.log(`Found ${events.length} events at Vancouver Civic Theatres`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Vancouver Civic Theatres:', error);
    return []; // No fallbacks, return empty array
  }
}

module.exports = {
  name: 'Vancouver Civic Theatres',
  urls: ['https://www.vancouvercivictheatres.com/events/'],
  scrape
};
