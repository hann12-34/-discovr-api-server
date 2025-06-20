/**
 * Scraper for Vancouver Events
 * Extracts event information from various Vancouver venue websites
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Convert relative URL to absolute URL
 * @param {string} relativeUrl - The relative URL to convert
 * @param {string} baseUrl - The base URL to use for conversion
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  // Remove trailing slash from baseUrl if present
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Add leading slash to relativeUrl if not present
  const relative = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  
  return `${base}${relative}`;
}

/**
 * Parse date string in standard formats
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString) {
  if (!dateString) return null;
  
  // Clean up the input string
  dateString = dateString.trim();
  
  // Try standard date formats
  const date = new Date(dateString);
  if (!isNaN(date) && date > new Date('2000-01-01')) {
    return date;
  }
  
  // Try DD MMM YYYY format (e.g., "15 Jun 2023")
  const dateMatch = dateString.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
    const year = parseInt(dateMatch[3]);
    return new Date(year, month, day);
  }
  
  return null;
}

/**
 * Determine season based on date
 * @param {Date} date - Event date
 * @returns {string} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return null;
  
  const month = date.getMonth();
  
  // Define seasons by month
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter"; // November, December, January
}

/**
 * Scrape Vancouver venues for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Events scraper...");
  // Add debug flag to see more details
  const DEBUG = true;
  const debug = (msg) => {
    if (DEBUG) console.log(`[DEBUG] ${msg}`);
  };
  
  // Define venue URLs with their specific CSS selectors for event extraction
  const venueUrls = [
    { 
      name: "Fox Cabaret", 
      url: "https://www.foxcabaret.com/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-list .event",
        title: ".event-title",
        date: ".event-date",
        image: ".event-image img",
        price: ".price, .ticket-price"
      }
    },
    { 
      name: "Fortune Sound Club", 
      url: "https://www.fortunesoundclub.com/events", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-listings .event",
        title: ".event-name, .title",
        date: ".event-date",
        image: ".event-image img"
      }
    },
    { 
      name: "Orpheum Theatre", 
      url: "https://vancouvercivictheatres.com/venues/orpheum", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event, .event-listing, article",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img"
      }
    },
    { 
      name: "The Rickshaw Theatre", 
      url: "https://www.rickshawtheatre.com/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event, .show, .show-card",
        title: ".show-title, .event-title, h1, h2, h3",
        date: ".show-date, .event-date, .date",
        image: ".show-image img, .event-image img"
      }
    },
    { 
      name: "Rogers Arena", 
      url: "https://www.rogersarena.com/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event-card, article",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img"
      }
    },
    { 
      name: "The Vogue Theatre", 
      url: "https://voguetheatre.com/events", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event-card, article",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img"
      }
    },
    { 
      name: "Queen Elizabeth Theatre", 
      url: "https://vancouvercivictheatres.com/venues/queen-elizabeth-theatre/events", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event-card, .event-listing, article",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img"
      }
    },
    { 
      name: "The Living Room", 
      url: "https://www.the-livingroom.ca/whats-on", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event, .show",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img, img"
      }
    },
    { 
      name: "The Pearl", 
      url: "https://thepearlvancouver.com/all-shows/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".show-item, .event, .show",
        title: ".show-title, .title, h1, h2, h3",
        date: ".show-date, .date",
        image: ".show-image img, img"
      }
    },
    { 
      name: "Penthouse Nightclub", 
      url: "http://www.penthousenightclub.com/events/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img, img"
      }
    },
    { 
      name: "The Cultch", 
      url: "https://thecultch.com/whats-on/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event, .show-card",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img, img"
      }
    },
    { 
      name: "Aura Nightclub", 
      url: "https://auravancouver.ca/events/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img, img"
      }
    },
    { 
      name: "Twelve West", 
      url: "https://twelvewest.ca/collections/upcoming-events", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .collection-item, .event",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img, img"
      }
    },
    { 
      name: "Celebrities Nightclub", 
      url: "https://www.celebritiesnightclub.com/", 
      city: "Vancouver", 
      state: "BC",
      selectors: {
        eventList: ".event-item, .event",
        title: ".event-title, .title, h1, h2, h3",
        date: ".event-date, .date",
        image: ".event-image img, img"
      }
    }
    // We'll skip Instagram links for now as they require authentication
  ];
  
  try {
    const events = [];
    debug("Starting to scrape Vancouver venue websites...");
    
    // Limit number of concurrent requests
    const MAX_CONCURRENT = 5;
    const chunks = [];
    
    // Split venues into chunks to process in batches
    for (let i = 0; i < venueUrls.length; i += MAX_CONCURRENT) {
      chunks.push(venueUrls.slice(i, i + MAX_CONCURRENT));
    }
    
    // Process each chunk of venues
    for (const chunk of chunks) {
      debug(`Processing chunk of ${chunk.length} venues`);
      
      // Process all venues in this chunk concurrently
      await Promise.all(chunk.map(async (venue) => {
        try {
          debug(`Scraping venue: ${venue.name} (${venue.url})`);
          
          // Get the venue's HTML content
          const response = await axios.get(venue.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000 // 30 seconds timeout
          });
          
          // Parse the HTML with cheerio
          const $ = cheerio.load(response.data);
          
          // Find all events using the venue's selectors
          const eventElements = $(venue.selectors.eventList);
          debug(`Found ${eventElements.length} potential events at ${venue.name}`);
          
          // If no events found, create a generic venue visit event
          if (eventElements.length === 0) {
            debug(`No events found at ${venue.name}, creating generic venue event`);
            
            events.push({
              title: `Visit ${venue.name}`,
              startDate: null,
              endDate: null,
              venue: {
                name: venue.name,
                address: venue.address || '',
                city: venue.city || 'Vancouver',
                state: venue.state || 'BC',
                website: venue.url
              },
              sourceURL: venue.url,
              officialWebsite: venue.url,
              imageURL: '',  // No image available
              location: venue.address || "Vancouver, BC",
              type: "Venue",
              category: "Entertainment",
              season: "all", // Venues are typically year-round
              status: "active",
              description: `Visit ${venue.name}, a popular venue in Vancouver. Check their website for upcoming events!`
            });
            
            debug(`Created generic venue event for ${venue.name}`);
            return;
          }
          
          // Process each event found
          eventElements.each((i, element) => {
            try {
              // Extract event details using venue-specific selectors
              const $element = $(element);
              const titleElement = $element.find(venue.selectors.title).first();
              const dateElement = $element.find(venue.selectors.date).first();
              const imageElement = $element.find(venue.selectors.image).first();
              const priceElement = venue.selectors.price ? $element.find(venue.selectors.price).first() : null;
              
              // Get event title
              const title = titleElement.text().trim() || `Event at ${venue.name}`;
              
              // Get event date
              const dateText = dateElement.text().trim();
              const startDate = parseEventDate(dateText);
              const season = startDate ? determineSeason(startDate) : 'all';
              
              // Get event image
              let imageURL = '';
              if (imageElement && imageElement.attr('src')) {
                imageURL = makeAbsoluteUrl(imageElement.attr('src'), venue.url);
              }
              
              // Get event price if available
              let price = '';
              if (priceElement) {
                price = priceElement.text().trim();
              }
              
              // Create event object
              const event = {
                title,
                startDate,
                endDate: null, // Many events don't have end dates
                venue: {
                  name: venue.name,
                  address: venue.address || '',
                  city: venue.city || 'Vancouver',
                  state: venue.state || 'BC',
                  website: venue.url
                },
                sourceURL: venue.url,
                officialWebsite: venue.url,
                imageURL,
                location: venue.address || "Vancouver, BC",
                type: "Event",
                category: "Entertainment",
                season,
                status: "active",
                description: `${title} at ${venue.name}. ${price ? `Price: ${price}` : ''}`,
                price
              };
              
              events.push(event);
              debug(`Extracted event: ${title} at ${venue.name}`);
            } catch (error) {
              console.error(`Error processing event at ${venue.name}:`, error.message);
            }
          });
          
          debug(`Finished processing ${eventElements.length} events from ${venue.name}`);
        } catch (error) {
          console.error(`Error scraping venue ${venue.name}:`, error.message);
          
          // Create a fallback generic event for this venue if we couldn't scrape it
          events.push({
            title: `Visit ${venue.name}`,
            startDate: null,
            endDate: null,
            venue: {
              name: venue.name,
              address: '',
              city: 'Vancouver',
              state: 'BC',
              website: venue.url
            },
            sourceURL: venue.url,
            officialWebsite: venue.url,
            imageURL: '',
            location: "Vancouver, BC",
            type: "Venue",
            category: "Entertainment",
            season: "all",
            status: "active",
            description: `Visit ${venue.name}, a popular venue in Vancouver. There was an error scraping events, but you can check their website for upcoming events!`
          });
          
          debug(`Created fallback venue event for ${venue.name} due to error`);
        }
      }));
    }
    
    debug(`Completed scraper run, found ${events.length} total events`);
    return events;
  } catch (error) {
    console.error("Error in Vancouver Events scraper:", error);
    
    // Return an array with a generic Vancouver event if all else fails
    return [{
      title: "Visit Vancouver",
      startDate: null,
      endDate: null,
      venue: {
        name: "Vancouver",
        address: "",
        city: "Vancouver",
        state: "BC",
        website: "https://www.destinationvancouver.com/"
      },
      sourceURL: "https://www.destinationvancouver.com/",
      officialWebsite: "https://www.destinationvancouver.com/",
      imageURL: "",
      location: "Vancouver, BC",
      type: "City",
      category: "Entertainment",
      season: "all",
      status: "active",
      description: "Vancouver is a vibrant coastal city known for its natural beauty, diverse culture, and exciting entertainment options."
    }];
  }
}

module.exports = {
  name: "Destination Vancouver",
  url: "https://www.destinationvancouver.com/explore-vancouver/events",
  scrape
};
