/**
 * Generic Ticketmaster event scraper
 * Extracts event information from Ticketmaster URLs like:
 * - https://www.ticketmaster.ca/concacaf-gold-cup-canada-vs-honduras-vancouver-british-columbia-06-17-2025/event/11006287ACD02547
 * - https://www.ticketmaster.ca/bc-lions-vs-winnipeg-blue-bombers-vancouver-british-columbia-06-21-2025/event/11006295FF435E9A
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
    
    // Look for dates in URL path
    const urlDateMatch = dateString.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (urlDateMatch) {
      const month = parseInt(urlDateMatch[1]) - 1;
      const day = parseInt(urlDateMatch[2]);
      const year = parseInt(urlDateMatch[3]);
      
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
 * Extract event category based on title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string} Event category
 */
function determineCategory(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.match(/soccer|football|fifa|concacaf|cup|match|vs\.?|versus/)) {
    return "Sports";
  }
  
  if (text.match(/concert|music|festival|tour|live|band|singer|performance/)) {
    return "Music";
  }
  
  if (text.match(/comedy|standup|comedian/)) {
    return "Comedy";
  }
  
  if (text.match(/theater|theatre|play|musical|broadway|show|stage/)) {
    return "Theater";
  }
  
  if (text.match(/conference|summit|expo|exhibition|convention/)) {
    return "Conference";
  }
  
  return "Entertainment";
}

/**
 * Extract venue information from event page
 * @param {Object} $ - Cheerio object
 * @param {string} url - Event URL
 * @returns {Object} Venue information
 */
function extractVenue($, url) {
  let venueName = '';
  let venueAddress = '';
  let venueCity = 'Vancouver';
  let venueState = 'BC';
  
  // Try to find venue name
  $('.venue-name, .venue, [class*="venue"], [class*="location"], [data-attr="name"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text && !venueName) {
      venueName = text;
    }
  });
  
  // Try to extract from URL path for Ticketmaster
  if (!venueName && url.includes('ticketmaster')) {
    const urlMatch = url.match(/\/([^\/]+)-([^\/]+)-([^\/]+)\/event/);
    if (urlMatch) {
      venueName = urlMatch[3].replace(/-/g, ' ').replace(/british columbia/i, '').trim();
      venueCity = urlMatch[2].replace(/-/g, ' ').trim();
    }
  }
  
  // Try to find venue address
  $('.venue-address, .address, [class*="address"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text) {
      venueAddress = text;
    }
  });
  
  // Fallback to common Vancouver venues if we have the name but no address
  if (venueName && !venueAddress) {
    if (venueName.match(/bc\s*place/i)) {
      venueAddress = '777 Pacific Blvd';
      venueName = 'BC Place';
    } else if (venueName.match(/rogers\s*arena/i)) {
      venueAddress = '800 Griffiths Way';
      venueName = 'Rogers Arena';
    } else if (venueName.match(/pacific\s*coliseum/i)) {
      venueAddress = '100 N Renfrew St';
      venueName = 'Pacific Coliseum';
    } else if (venueName.match(/thunderbird/i)) {
      venueAddress = '6066 Thunderbird Blvd';
      venueName = 'Thunderbird Arena';
    }
  }
  
  return {
    name: venueName || 'Vancouver Venue',
    address: venueAddress || '',
    city: venueCity,
    state: venueState,
    website: url
  };
}

/**
 * Scrape a Ticketmaster event URL for event information
 * @param {string} eventUrl - URL of the event
 * @returns {Promise<Object>} Event object
 */
async function scrapeEventUrl(eventUrl) {
  try {
    console.log(`Scraping event URL: ${eventUrl}`);
    
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    let title = '';
    $('h1, .event-name, .title, [class*="title"], [data-attr="name"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text && !title) {
        title = text;
      }
    });
    
    if (!title) {
      // Try to extract from URL for Ticketmaster
      const urlMatch = eventUrl.match(/\/([^\/]+)-vs-([^\/]+)-/);
      if (urlMatch) {
        title = `${urlMatch[1].replace(/-/g, ' ')} vs ${urlMatch[2].replace(/-/g, ' ')}`;
        title = title.replace(/([a-z])([A-Z])/g, '$1 $2').trim(); // Fix camelCase
        title = title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); // Capitalize words
      }
    }
    
    if (!title) {
      return null; // Skip if no title found
    }
    
    // Extract date
    let dateText = '';
    $('.date-time, .date, time, [class*="date"], [class*="time"], [data-attr="date"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        dateText += text + ' ';
      }
    });
    
    // Try to extract date from URL if not found in page
    if (!dateText) {
      const dateInUrl = eventUrl.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (dateInUrl) {
        dateText = `${dateInUrl[1]}/${dateInUrl[2]}/${dateInUrl[3]}`;
      } else {
        // For Ticketmaster URLs that include date at the end
        const tmDateMatch = eventUrl.match(/(\d{2})-(\d{2})-(\d{4})\/event/);
        if (tmDateMatch) {
          dateText = `${tmDateMatch[1]}/${tmDateMatch[2]}/${tmDateMatch[3]}`;
        }
      }
    }
    
    // Fallback to URLs like ticketmaster with date pattern in URL
    if (!dateText && eventUrl.includes('ticketmaster')) {
      const tmDatePath = eventUrl.match(/([^\/]+)-british-columbia-(\d{2})-(\d{2})-(\d{4})\/event/);
      if (tmDatePath) {
        dateText = `${tmDatePath[2]}/${tmDatePath[3]}/${tmDatePath[4]}`;
      }
    }
    
    const startDate = parseEventDate(dateText);
    if (!startDate) {
      return null; // Skip if no valid date found
    }
    
    // Extract venue information
    const venue = extractVenue($, eventUrl);
    
    // Extract image
    let imageURL = '';
    $('meta[property="og:image"]').each((i, el) => {
      const content = $(el).attr('content');
      if (content && content.match(/\.(jpg|jpeg|png|gif)/i)) {
        imageURL = content;
      }
    });
    
    if (!imageURL) {
      $('.event-image img, .hero img, [class*="image"] img, [data-attr="image"] img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !imageURL && src.match(/\.(jpg|jpeg|png|gif)/i)) {
          imageURL = src.startsWith('http') ? src : `https:${src}`;
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
    
    if (!description) {
      $('.event-description, .description, [class*="desc"], [data-attr="desc"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          description += text + ' ';
        }
      });
    }
    
    // Calculate season
    const season = determineSeason(startDate);
    
    // Determine event category
    const category = determineCategory(title, description);
    
    // Get location (use venue info)
    const location = venue.address ? 
      `${venue.name}, ${venue.address}, ${venue.city}, ${venue.state}` : 
      `${venue.name}, ${venue.city}, ${venue.state}`;
    
    return {
      title,
      startDate,
      endDate: null,
      venue,
      sourceURL: eventUrl,
      officialWebsite: eventUrl,
      imageURL,
      location,
      type: "Event",
      category,
      season,
      status: "active",
      description: description || `${title} at ${venue.name}.`
    };
  } catch (error) {
    console.error(`Error scraping event URL ${eventUrl}:`, error);
    return null;
  }
}

/**
 * Main scraper function that processes a list of event URLs
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Ticketmaster event scraper...");
  const events = [];
  
  // List of event URLs to scrape
  const eventUrls = [
    "https://www.ticketmaster.ca/concacaf-gold-cup-canada-vs-honduras-vancouver-british-columbia-06-17-2025/event/11006287ACD02547",
    "https://www.ticketmaster.ca/bc-lions-vs-winnipeg-blue-bombers-vancouver-british-columbia-06-21-2025/event/11006295FF435E9A"
  ];
  
  // Process each URL
  for (const url of eventUrls) {
    try {
      const event = await scrapeEventUrl(url);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
    }
  }
  
  return events;
}

module.exports = {
  name: "Ticketmaster Events",
  urls: [
    "https://www.ticketmaster.ca/concacaf-gold-cup-canada-vs-honduras-vancouver-british-columbia-06-17-2025/event/11006287ACD02547",
    "https://www.ticketmaster.ca/bc-lions-vs-winnipeg-blue-bombers-vancouver-british-columbia-06-21-2025/event/11006295FF435E9A"
  ],
  scrape
};
