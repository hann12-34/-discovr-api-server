/**
 * Rogers Arena Events Scraper
 * Extracts event information from Rogers Arena events:
 * - https://rogersarena.com/event/wu-tang-clan/
 * - https://rogersarena.com/event/katy-perry-the-lifetimes-tour/
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
 * Scrape an event page for an event at Rogers Arena
 * @param {string} eventUrl - URL of the event
 * @returns {Promise<Object|null>} Event object or null if scraping fails
 */
async function scrapeEventPage(eventUrl) {
  console.log(`Scraping event at ${eventUrl}`);
  
  try {
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('h1, .event-title, .title').first().text().trim();
    if (!title) {
      console.log(`No title found for ${eventUrl}`);
      return null;
    }
    
    // Extract date
    let dateText = '';
    $('.event-date, .date, time, [class*="date"], [class*="time"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i)) {
        dateText += text + ' ';
      }
    });
    
    if (!dateText) {
      $('p, .info, .details').each((i, el) => {
        const text = $(el).text().trim();
        if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i) ||
            text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december).+\d{1,2}(?:st|nd|rd|th)?/i)) {
          dateText += text + ' ';
        }
      });
    }
    
    // Parse the date
    const startDate = parseEventDate(dateText);
    if (!startDate) {
      console.log(`No valid date found for ${title} at ${eventUrl}`);
      return null;
    }
    
    // Extract image
    let imageURL = '';
    $('meta[property="og:image"]').each((i, el) => {
      const content = $(el).attr('content');
      if (content && !imageURL) {
        imageURL = content;
      }
    });
    
    if (!imageURL) {
      $('.event-image img, .hero img, [class*="image"] img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !imageURL) {
          imageURL = src.startsWith('http') ? src : `https://rogersarena.com${src}`;
        }
      });
    }
    
    // Extract description
    let description = '';
    $('meta[name="description"], meta[property="og:description"]').each((i, el) => {
      const content = $(el).attr('content');
      if (content && content.length > 10) {
        description += content + ' ';
      }
    });
    
    if (!description || description.length < 50) {
      $('.event-description, .description, [class*="desc"], [class*="about"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 30 && !text.match(/copyright|rights reserved/i)) {
          description += text + ' ';
        }
      });
    }
    
    // Calculate season
    const season = determineSeason(startDate);
    
    // Determine category (music, sports, etc.)
    let category = "Entertainment";
    if (title.match(/concert|music|singer|band|tour/i)) {
      category = "Music";
    } else if (title.match(/comedy|stand-up|comedian/i)) {
      category = "Comedy";
    } else if (title.match(/hockey|nhl|canucks|nba|basketball|sports/i)) {
      category = "Sports";
    }
    
    return {
      title,
      startDate,
      endDate: null,
      venue: {
        name: "Rogers Arena",
        address: "800 Griffiths Way",
        city: "Vancouver",
        state: "BC",
        website: "https://rogersarena.com/"
      },
      sourceURL: eventUrl,
      officialWebsite: eventUrl,
      imageURL,
      location: "Rogers Arena, 800 Griffiths Way, Vancouver, BC",
      type: "Event",
      category,
      season,
      status: "active",
      description: description || `${title} at Rogers Arena.`
    };
  } catch (error) {
    console.error(`Error scraping ${eventUrl}:`, error);
    return null;
  }
}

/**
 * Scrape the Rogers Arena website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Rogers Arena events scraper...");
  const events = [];
  
  // Define specific event URLs to scrape
  const eventUrls = [
    "https://rogersarena.com/event/wu-tang-clan/",
    "https://rogersarena.com/event/katy-perry-the-lifetimes-tour/"
  ];
  
  // Process each event URL
  for (const url of eventUrls) {
    try {
      const event = await scrapeEventPage(url);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
    }
  }
  
  // Optionally scrape the main Rogers Arena events page to find more events
  try {
    const mainUrl = "https://rogersarena.com/events/";
    const response = await axios.get(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for event cards/links on the page
    const eventLinks = [];
    $('.event-card a, [class*="event"] a, .events-list a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/event/') && !eventUrls.includes(href)) {
        // Normalize URL
        const fullUrl = href.startsWith('http') ? href : `https://rogersarena.com${href}`;
        if (!eventLinks.includes(fullUrl)) {
          eventLinks.push(fullUrl);
        }
      }
    });
    
    console.log(`Found ${eventLinks.length} additional events on main page`);
    
    // Process up to 5 additional events to avoid overloading
    const additionalUrls = eventLinks.slice(0, 5);
    for (const url of additionalUrls) {
      try {
        const event = await scrapeEventPage(url);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
      }
    }
  } catch (error) {
    console.error("Error scraping Rogers Arena main events page:", error);
  }
  
  return events;
}

module.exports = {
  name: "Rogers Arena Events",
  urls: [
    "https://rogersarena.com/event/wu-tang-clan/",
    "https://rogersarena.com/event/katy-perry-the-lifetimes-tour/"
  ],
  scrape
};
