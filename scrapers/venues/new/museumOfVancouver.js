/**
 * Museum of Vancouver Scraper
 * URL: https://museumofvancouver.ca/exhibitions-events
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Museum of Vancouver';
const url = 'https://museumofvancouver.ca/';
const eventsUrl = 'https://museumofvancouver.ca/exhibitions-events';
const venueAddress = '1100 Chestnut Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6J 3J9';
const venueCountry = 'Canada';

/**
 * Parse date strings from MOV website
 * @param {string} dateStr - Date string to parse
 * @returns {string} - Formatted date string or original if parsing fails
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  
  try {
    // Handle various date formats
    const dateRangeRegex = /([A-Za-z]+\s+\d{1,2})(?:\s*[-–]\s*)([A-Za-z]+\s+\d{1,2}),?\s*(\d{4})/i;
    const singleDateRegex = /([A-Za-z]+\s+\d{1,2}),?\s*(\d{4})/i;
    const dateMatch = dateStr.match(dateRangeRegex);
    
    if (dateMatch) {
      const [, startDateStr, endDateStr, year] = dateMatch;
      return `${startDateStr} - ${endDateStr}, ${year}`;
    }
    
    const singleMatch = dateStr.match(singleDateRegex);
    if (singleMatch) {
      const [, dateStr, year] = singleMatch;
      return `${dateStr}, ${year}`;
    }
    
    // If no match, return the original string
    return dateStr;
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error parsing date');
    return dateStr; // Return original on error
  }
}

/**
 * Scrape events from Museum of Vancouver
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Museum of Vancouver scraper');

  try {
    // Configure axios with headers to mimic a browser
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': url,
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    };

    // Fetch the events page
    logger.info('Fetching events page');
    const response = await axios.get(eventsUrl, axiosConfig);
    const $ = cheerio.load(response.data);
    const events = [];

    // Look for exhibitions
    logger.info('Processing exhibitions');
    const exhibitions = $('.exhibition, [data-section="exhibitions"] .item, .exhibition-item, article.exhibition');
    
    if (exhibitions.length > 0) {
      exhibitions.each((i, element) => {
        try {
          // Extract exhibition title
          const title = $(element).find('h2, h3, .title').first().text().trim();
          if (!title) return; // Skip if no title
          
          // Extract URL
          let detailUrl = $(element).find('a').attr('href');
          if (!detailUrl) return; // Skip if no URL
          
          // Make relative URLs absolute
          const fullUrl = detailUrl.startsWith('http') ? detailUrl : `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}`;
          
          // Extract date information
          let dateText = $(element).find('.dates, .date, .exhibition-date').text().trim();
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, p, .exhibition-description').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibition at Museum of Vancouver. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          const event = {
            title,
            date: formattedDate || 'Ongoing exhibition',
            url: fullUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title, date: formattedDate } }, 'Found exhibition');
          events.push(event);
        } catch (exhibitionError) {
          logger.error({ error: exhibitionError.message }, 'Error processing exhibition');
        }
      });
    }

    // Look for events
    logger.info('Processing events');
    const eventItems = $('.event, [data-section="events"] .item, .event-item, article.event');
    
    if (eventItems.length > 0) {
      eventItems.each((i, element) => {
        try {
          // Extract event title
          const title = $(element).find('h2, h3, .title').first().text().trim();
          if (!title) return; // Skip if no title
          
          // Extract URL
          let detailUrl = $(element).find('a').attr('href');
          if (!detailUrl) return; // Skip if no URL
          
          // Make relative URLs absolute
          const fullUrl = detailUrl.startsWith('http') ? detailUrl : `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}`;
          
          // Extract date information
          let dateText = $(element).find('.dates, .date, .event-date').text().trim();
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, p, .event-description').text().trim();
          if (!description || description.length < 10) {
            description = `${title} event at Museum of Vancouver. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          const event = {
            title,
            date: formattedDate || 'Check website for dates',
            url: fullUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title, date: formattedDate } }, 'Found event');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event');
        }
      });
    }

    // If we didn't find any exhibitions or events through standard selectors,
    // try looking for content by scanning page sections
    if (events.length === 0) {
      logger.info('No events found in primary listings, scanning page sections');
      
      // Look through main content sections
      $('.content-block, .section, main section').each((i, section) => {
        try {
          // Look for section headings that might indicate event content
          const heading = $(section).find('h2, h3').first().text().trim().toLowerCase();
          
          if (heading.includes('exhibition') || heading.includes('event') || heading.includes('what\'s on')) {
            // Find all article or card elements within this section
            $(section).find('article, .card, .item').each((j, item) => {
              try {
                // Extract title
                const title = $(item).find('h2, h3, h4, .title').first().text().trim();
                if (!title) return; // Skip if no title
                
                // Extract URL
                let detailUrl = $(item).find('a').attr('href');
                
                // Make URL absolute if needed
                const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                  detailUrl : 
                  detailUrl ? 
                    `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                    eventsUrl;
                
                // Extract date
                let dateText = $(item).find('.dates, .date').text().trim();
                const formattedDate = parseDate(dateText);
                
                // Extract description
                let description = $(item).find('p, .description').text().trim();
                if (!description || description.length < 10) {
                  description = `${title} at Museum of Vancouver. Visit website for more details.`;
                }
                
                // Extract image
                let imageUrl = $(item).find('img').attr('src') || $(item).find('img').attr('data-src') || '';
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
                }
                
                const event = {
                  title,
                  date: formattedDate || 'Check website for dates',
                  url: fullUrl,
                  venue: name,
                  address: venueAddress,
                  city: venueCity,
                  region: venueRegion,
                  postalCode: venuePostalCode,
                  country: venueCountry,
                  description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
                  image: imageUrl
                };
                
                logger.info({ event: { title, date: formattedDate } }, 'Found event from content section');
                events.push(event);
              } catch (itemError) {
                logger.error({ error: itemError.message }, 'Error processing section item');
              }
            });
          }
        } catch (sectionError) {
          logger.error({ error: sectionError.message }, 'Error processing section');
        }
      });
    }

    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (events[i].url && events[i].url !== eventsUrl) {
            const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
            
            if (detailResponse.data) {
              const detail$ = cheerio.load(detailResponse.data);
              
              // Get better description
              const betterDescription = detail$('.event-content, .event-body, .content, .description, article p').text().trim();
              if (betterDescription && betterDescription.length > events[i].description.length) {
                events[i].description = betterDescription.substring(0, 500) + (betterDescription.length > 500 ? '...' : '');
              }
              
              // Get better date information
              const betterDate = detail$('.dates, .date, time').first().text().trim();
              if (betterDate && betterDate.length > 5) {
                events[i].date = parseDate(betterDate);
              }
              
              // Get better image
              const betterImage = detail$('.hero img, .featured-image img, .banner img').first().attr('src');
              if (betterImage) {
                events[i].image = betterImage.startsWith('http') ? betterImage : `${url}${betterImage.startsWith('/') ? betterImage.substring(1) : betterImage}`;
              }
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Museum of Vancouver, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Museum of Vancouver');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
