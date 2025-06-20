/**
 * Scraper for Playland/PNE events
 * Extracts event information from https://www.pne.ca/playland/
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
 * Scrape PNE/Playland website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Playland/PNE scraper...");
  const events = [];
  const venueUrl = "https://www.pne.ca/playland/";
  
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
    
    // Get main Playland event info
    let operatingInfo = '';
    $('p, .operating-hours, .dates, .info, [class*="hour"], [class*="date"], [class*="time"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/(?:open|hours|dates|days|times|schedule|season)/i)) {
        operatingInfo += text + ' ';
      }
    });
    
    // Extract start and end dates for the season
    const { startDate, endDate } = extractDateRange(operatingInfo);
    
    if (startDate) {
      // Get event image
      let imageURL = '';
      $('img[class*="banner"], img[class*="hero"], .main-image img, .header img').each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !imageURL) {
          imageURL = src.startsWith('http') ? src : `https://www.pne.ca${src}`;
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
      
      // Season calculation
      const season = determineSeason(startDate);
      
      // Add main Playland event
      events.push({
        title: "Playland at the PNE",
        startDate,
        endDate,
        venue: {
          name: "Pacific National Exhibition",
          address: "2901 E Hastings St",
          city: "Vancouver",
          state: "BC",
          website: "https://www.pne.ca/"
        },
        sourceURL: venueUrl,
        officialWebsite: venueUrl,
        imageURL,
        location: "2901 E Hastings St, Vancouver, BC",
        type: "Event",
        category: "Amusement Park",
        season,
        status: "active",
        description: description || `Playland is Vancouver's amusement park, featuring rides, attractions, and entertainment for all ages. ${operatingInfo}`
      });
    }
    
    // Check for special events
    console.log("Checking for PNE special events...");
    
    try {
      // Try to find events on the main page or fetch from events page
      const eventsUrl = "https://www.pne.ca/events/";
      const eventsResponse = await axios.get(eventsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });
      
      const $events = cheerio.load(eventsResponse.data);
      
      // Look for event items
      const eventElements = $events('.event-item, .event-card, article, [class*="event"]');
      console.log(`Found ${eventElements.length} potential events at PNE`);
      
      eventElements.each((i, element) => {
        try {
          const $element = $events(element);
          
          // Extract title
          const title = $element.find('h2, h3, .title').first().text().trim();
          if (!title) return;
          
          // Extract date
          let dateText = '';
          $element.find('.date, .event-date, time').each((i, date) => {
            dateText += $events(date).text().trim() + ' ';
          });
          
          if (!dateText) {
            // Try to find date in content
            const contentDate = $element.text().match(/(?:on|date:?|when:?)\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?)/i);
            if (contentDate) {
              dateText = contentDate[1];
            }
          }
          
          // Parse date
          const eventDate = parseEventDate(dateText);
          if (!eventDate) return; // Skip events without valid dates
          
          // Extract event URL
          let eventUrl = '';
          const linkEl = $element.find('a');
          if (linkEl.length) {
            const href = linkEl.attr('href');
            if (href) {
              eventUrl = href.startsWith('http') ? href : `https://www.pne.ca${href}`;
            }
          }
          
          // Extract image
          let imageURL = '';
          const img = $element.find('img');
          if (img.length) {
            const src = img.attr('src') || img.attr('data-src');
            if (src) {
              imageURL = src.startsWith('http') ? src : `https://www.pne.ca${src}`;
            }
          }
          
          // Extract description
          let description = '';
          $element.find('p, .description, .excerpt').each((i, desc) => {
            description += $events(desc).text().trim() + ' ';
          });
          
          // Calculate season
          const season = determineSeason(eventDate);
          
          events.push({
            title,
            startDate: eventDate,
            endDate: null,
            venue: {
              name: "Pacific National Exhibition",
              address: "2901 E Hastings St",
              city: "Vancouver",
              state: "BC",
              website: "https://www.pne.ca/"
            },
            sourceURL: eventUrl || eventsUrl,
            officialWebsite: eventUrl || eventsUrl,
            imageURL,
            location: "2901 E Hastings St, Vancouver, BC",
            type: "Event",
            category: "Entertainment",
            season,
            status: "active",
            description: description || `Special event at the PNE: ${title}.`
          });
        } catch (error) {
          console.error(`Error processing PNE event:`, error);
        }
      });
    } catch (eventsError) {
      console.error("Error fetching PNE events:", eventsError);
    }
    
    return events;
  } catch (error) {
    console.error("Error scraping PNE/Playland:", error);
    // No fallback events, return empty array if scraping fails
    return events;
  }
}

module.exports = {
  name: "Playland PNE",
  url: "https://www.pne.ca/playland/",
  urls: ["https://www.pne.ca/playland/"],
  scrape
};
