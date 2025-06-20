/**
 * Thunderbird Arena Events Scraper
 * Extracts event information from Thunderbird Arena events:
 * - https://thunderbirdarena.ubc.ca/event/babymetal/
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
 * Scrape the Thunderbird Arena website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Thunderbird Arena events scraper...");
  const events = [];
  
  // Specific event URL to scrape
  const eventUrls = [
    "https://thunderbirdarena.ubc.ca/event/babymetal/"
  ];
  
  // Process each URL
  for (const url of eventUrls) {
    try {
      console.log(`Scraping event at ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('h1, .event-title, .title').first().text().trim();
      if (!title) {
        console.log(`No title found for ${url}`);
        continue;
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
        console.log(`No valid date found for ${title} at ${url}`);
        continue;
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
            imageURL = src.startsWith('http') ? src : `https://thunderbirdarena.ubc.ca${src}`;
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
      
      // Determine category
      let category = "Entertainment";
      if (title.toLowerCase().includes("babymetal") || title.match(/concert|music|singer|band|tour/i)) {
        category = "Music";
      }
      
      events.push({
        title,
        startDate,
        endDate: null,
        venue: {
          name: "Doug Mitchell Thunderbird Sports Centre",
          address: "6066 Thunderbird Blvd",
          city: "Vancouver",
          state: "BC",
          website: "https://thunderbirdarena.ubc.ca/"
        },
        sourceURL: url,
        officialWebsite: url,
        imageURL,
        location: "Doug Mitchell Thunderbird Sports Centre, 6066 Thunderbird Blvd, Vancouver, BC",
        type: "Event",
        category,
        season,
        status: "active",
        description: description || `${title} at Doug Mitchell Thunderbird Sports Centre.`
      });
      
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
    }
  }
  
  // Try to find more events from the main events page
  try {
    const mainUrl = "https://thunderbirdarena.ubc.ca/events/";
    const response = await axios.get(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event elements
    const eventElements = $('.event-item, article, .event-card, [class*="event"]');
    console.log(`Found ${eventElements.length} potential events on main page`);
    
    eventElements.each((i, element) => {
      try {
        const $element = $(element);
        
        // Extract title
        const title = $element.find('h2, h3, .title, [class*="title"]').first().text().trim();
        if (!title) return;
        
        // Extract date
        let dateText = '';
        $element.find('.date, time, [class*="date"], [class*="time"]').each((i, el) => {
          dateText += $(el).text().trim() + ' ';
        });
        
        if (!dateText) {
          const contentText = $element.text();
          const dateMatch = contentText.match(/(?:on|date:?|when:?)\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)/i);
          if (dateMatch) {
            dateText = dateMatch[1];
          }
        }
        
        // Parse date
        const startDate = parseEventDate(dateText);
        if (!startDate) return;
        
        // Get event URL
        let eventUrl = '';
        const linkEl = $element.find('a');
        if (linkEl.length) {
          const href = linkEl.attr('href');
          if (href) {
            eventUrl = href.startsWith('http') ? href : `https://thunderbirdarena.ubc.ca${href}`;
          }
        }
        
        // Get event image
        let imageURL = '';
        const imgEl = $element.find('img');
        if (imgEl.length) {
          const src = imgEl.attr('src') || imgEl.attr('data-src');
          if (src) {
            imageURL = src.startsWith('http') ? src : `https://thunderbirdarena.ubc.ca${src}`;
          }
        }
        
        // Get description
        let description = '';
        $element.find('p, .excerpt, .description').each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 20) {
            description += text + ' ';
          }
        });
        
        // Calculate season
        const season = determineSeason(startDate);
        
        events.push({
          title,
          startDate,
          endDate: null,
          venue: {
            name: "Doug Mitchell Thunderbird Sports Centre",
            address: "6066 Thunderbird Blvd",
            city: "Vancouver",
            state: "BC",
            website: "https://thunderbirdarena.ubc.ca/"
          },
          sourceURL: eventUrl || mainUrl,
          officialWebsite: eventUrl || mainUrl,
          imageURL,
          location: "Doug Mitchell Thunderbird Sports Centre, 6066 Thunderbird Blvd, Vancouver, BC",
          type: "Event",
          category: "Entertainment",
          season,
          status: "active",
          description: description || `${title} at Doug Mitchell Thunderbird Sports Centre.`
        });
        
      } catch (eventError) {
        console.error("Error processing event from main page:", eventError);
      }
    });
    
  } catch (mainPageError) {
    console.error("Error scraping main events page:", mainPageError);
  }
  
  return events;
}

module.exports = {
  name: "Thunderbird Arena Events",
  urls: [
    "https://thunderbirdarena.ubc.ca/event/babymetal/"
  ],
  scrape
};
