/**
 * Scraper for Rogers Arena venue events
 * Extracts event information from Ticketmaster since Rogers Arena's website uses Cloudflare protection
 * Last updated: June 17, 2025 - Updated to use Ticketmaster as primary source with no fallbacks
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString) {
  try {
    if (!dateString) return null;
    
    const dateStr = dateString.trim();
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try formats like "DD MMM YYYY"
    const dateMatch = dateStr.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
      const year = parseInt(dateMatch[3]);
      return new Date(year, month, day);
    }
    
    console.warn(`Could not parse Rogers Arena date: ${dateStr}`);
    return null;
  } catch (error) {
    console.error(`Error parsing Rogers Arena date: ${dateString}`, error);
    return null;
  }
}

/**
 * Determine season based on date
 * @param {Date} date - Event date
 * @returns {string} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return "all";
  
  const month = date.getMonth();
  
  // Define seasons by month
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter"; // November, December, January
}

/**
 * Make absolute URL from relative URL
 * @param {string} relativeUrl - Relative URL
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const relative = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  
  return `${base}${relative}`;
}

/**
 * Scrape Rogers Arena events from Ticketmaster
 * Rogers Arena website uses Cloudflare protection which blocks scraping
 * This function uses Ticketmaster as the primary source of event data
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Rogers Arena' });
  logger.info("Starting Rogers Arena scraper using Ticketmaster as source...");
  const events = [];
  const venueUrl = "https://www.rogersarena.com/";
  
  try {
    // Rogers Arena's website uses Cloudflare protection which blocks scraping
    // Going directly to Ticketmaster which lists all Rogers Arena events
    logger.info("Bypassing Cloudflare protection by using Ticketmaster as data source");
    // Primary approach: Use Ticketmaster venue page for Rogers Arena
    const tmUrl = "https://www.ticketmaster.ca/rogers-arena-tickets-vancouver/venue/139277";
    logger.info(`Fetching events from Ticketmaster venue page: ${tmUrl}`);
    
    try {
      const tmResponse = await axios.get(tmUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });
      
      const $tm = cheerio.load(tmResponse.data);
      const tmEvents = $tm('.event-listing, .event-item, [data-bdd="event-card"], [data-tid="event-card"], .attraction-card, [data-testid="listing-card"]');
      
      logger.info(`Found ${tmEvents.length} Rogers Arena events on Ticketmaster`);
      
      // Process events from Ticketmaster
      tmEvents.each((i, element) => {
        try {
          const $element = $tm(element);
          
          // Get title
          const title = $element.find('h3, .event-name, [data-bdd="event-name"], .attraction_link, .event-name-text').text().trim();
          if (!title) {
            logger.warn('Event missing title, skipping');
            return;
          }
          
          // Get date
          const dateText = $element.find('.date, .event-date, [data-bdd="event-date"], .dates-text, .date-display').text().trim();
          if (!dateText) {
            logger.warn(`Event "${title}" missing date, skipping`);
            return;
          }
          
          // Parse date
          const startDate = parseEventDate(dateText);
          if (!startDate) {
            logger.warn(`Failed to parse date for event "${title}" with date text "${dateText}", skipping`);
            return;
          }
          
          const season = determineSeason(startDate);
          
          // Get image
          let imageURL = '';
          const img = $element.find('img');
          if (img.length) {
            imageURL = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || '';
          }
          
          // Get event URL if available
          let eventUrl = '';
          const linkEl = $element.find('a[href*="event"], a.event-link, a[href*="tickets"]');
          if (linkEl.length) {
            const href = linkEl.attr('href');
            if (href) {
              eventUrl = href.startsWith('http') ? href : `https://www.ticketmaster.ca${href}`;
            }
          }
          
          // Try to get a description if available
          let description = $element.find('.description, .event-description, .synopsis').text().trim();
          if (!description) {
            description = `${title} at Rogers Arena in Vancouver on ${dateText}.`;
          }
          
          events.push({
            title,
            startDate,
            endDate: null,
            venue: {
              name: "Rogers Arena",
              address: "800 Griffiths Way",
              city: "Vancouver",
              state: "BC",
              website: venueUrl
            },
            sourceURL: tmUrl,
            officialWebsite: eventUrl || venueUrl,
            imageURL,
            location: "800 Griffiths Way, Vancouver, BC",
            type: "Event",
            category: "Entertainment",
            season,
            status: "active",
            description
          });
          
          logger.info(`Added event: ${title} on ${startDate.toISOString()}`);
        } catch (error) {
          logger.error({ error }, `Error processing Ticketmaster event for Rogers Arena: ${error.message}`);
        }
      });
    } catch (tmError) {
      logger.error({ error: tmError }, `Error fetching Ticketmaster data for Rogers Arena: ${tmError.message}`);
    }
    // Secondary approach: Try to get events from NHL.com for Canucks games at Rogers Arena
    // This is a complementary source for any hockey games
    if (events.length < 5) { // Only try this if we don't have many events already
      try {
        logger.info("Trying secondary approach: NHL.com for Canucks home games at Rogers Arena");
        const nhlUrl = "https://www.nhl.com/canucks/schedule/";
        const nhlResponse = await axios.get(nhlUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 20000
        });
        
        const $nhl = cheerio.load(nhlResponse.data);
        const homeGames = $nhl('.schedule-table__row--home, tr[data-home="true"], .home-game');
        
        logger.info(`Found ${homeGames.length} potential Canucks home games on NHL.com`);
        
        homeGames.each((i, element) => {
          try {
            const $element = $nhl(element);
            
            // Get opponent and create title
            const opponent = $element.find('.schedule-table__opponent-name, .team-name').text().trim();
            if (!opponent) return;
            
            const title = `Vancouver Canucks vs ${opponent}`;
            
            // Get date
            const dateText = $element.find('.schedule-table__date, .date-col').text().trim();
            if (!dateText) return;
            
            const startDate = parseEventDate(dateText);
            if (!startDate) return;
            
            const season = determineSeason(startDate);
            
            // Create event object for NHL game
            events.push({
              title,
              startDate,
              endDate: null,
              venue: {
                name: "Rogers Arena",
                address: "800 Griffiths Way",
                city: "Vancouver",
                state: "BC",
                website: venueUrl
              },
              sourceURL: nhlUrl,
              officialWebsite: "https://www.nhl.com/canucks",
              imageURL: "https://www.rogersarena.com/wp-content/uploads/2018/11/home_slider.jpg",
              location: "800 Griffiths Way, Vancouver, BC",
              type: "Sports",
              category: "Hockey",
              season,
              status: "active",
              description: `NHL Game: ${title} at Rogers Arena in Vancouver on ${dateText}.`
            });
            
            logger.info(`Added NHL game: ${title} on ${startDate.toISOString()}`);
          } catch (error) {
            logger.error({ error }, `Error processing NHL game for Rogers Arena: ${error.message}`);
          }
        });
      } catch (nhlError) {
        logger.error({ error: nhlError }, `Error fetching NHL data for Rogers Arena: ${nhlError.message}`);
      }
    }
    
    logger.info(`Successfully scraped ${events.length} events for Rogers Arena`);
    return events;
  } catch (error) {
    logger.error({ error }, `Error scraping Rogers Arena events: ${error.message}`);
    // No fallback events, return empty array on error
    return [];
  }
}

module.exports = {
  name: "Rogers Arena",
  url: "https://www.rogersarena.com/",
  urls: ["https://www.rogersarena.com/"],
  scrape
};
