/**
 * The Polygon Gallery Scraper
 * URL: https://thepolygon.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'The Polygon Gallery';
const url = 'https://thepolygon.ca/';
const eventsUrl = 'https://thepolygon.ca/events/';
const exhibitsUrl = 'https://thepolygon.ca/exhibitions/';
const venueAddress = '101 Carrie Cates Court';
const venueCity = 'North Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V7M 3J4';
const venueCountry = 'Canada';

/**
 * Parse date strings from the gallery website
 * @param {string} dateStr - Date string to parse
 * @returns {string} - Formatted date string or original if parsing fails
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  
  try {
    // Handle various date formats
    const dateRangeRegex = /([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s*[-–—]\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const dateRangeShortRegex = /([A-Za-z]+\s+\d{1,2})\s*[-–—]\s*(\d{1,2},?\s*\d{4})/i;
    const standardDateRegex = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const monthDayRegex = /([A-Za-z]+\s+\d{1,2})/i;
    
    const dateRangeMatch = dateStr.match(dateRangeRegex);
    const dateRangeShortMatch = dateStr.match(dateRangeShortRegex);
    const standardDateMatch = dateStr.match(standardDateRegex);
    const monthDayMatch = dateStr.match(monthDayRegex);
    
    if (dateRangeMatch) {
      return `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
    } else if (dateRangeShortMatch) {
      return `${dateRangeShortMatch[1]} - ${dateRangeShortMatch[2]}`;
    } else if (standardDateMatch) {
      return standardDateMatch[0];
    } else if (monthDayMatch) {
      // If only month and day are found, add the current year
      const currentYear = new Date().getFullYear();
      return `${monthDayMatch[0]}, ${currentYear}`;
    }
    
    // If no match found, return original
    return dateStr;
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error parsing date');
    return dateStr; // Return original on error
  }
}

/**
 * Scrape events from The Polygon Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting The Polygon Gallery scraper');

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

    const events = [];
    
    // Scrape exhibitions page
    logger.info('Fetching exhibitions page');
    const exhibitionsResponse = await axios.get(exhibitsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (exhibitionsResponse.data) {
      const exhibitions$ = cheerio.load(exhibitionsResponse.data);
      logger.info('Processing exhibitions');
      
      // Look for exhibition items
      const exhibitionItems = exhibitions$('.exhibition, .exhibition-item, .post, article');
      
      if (exhibitionItems.length > 0) {
        exhibitionItems.each((i, element) => {
          try {
            // Extract exhibition title
            const title = exhibitions$(element).find('h2, h3, h4, .title').first().text().trim();
            if (!title) return; // Skip if no title
            
            // Extract URL
            let detailUrl = exhibitions$(element).find('a').attr('href');
            
            // Make URL absolute if needed
            const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
              detailUrl : 
              detailUrl ? 
                `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                exhibitsUrl;
            
            // Extract date information
            let dateText = exhibitions$(element).find('.date, .dates, time').text().trim();
            
            // Try to find dates in other elements if not found directly
            if (!dateText) {
              const paragraphs = exhibitions$(element).find('p');
              paragraphs.each((j, paragraph) => {
                const text = exhibitions$(paragraph).text();
                if (text.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i)) {
                  dateText = text;
                  return false; // Break the loop
                }
              });
            }
            
            // Parse the date
            const formattedDate = parseDate(dateText);
            
            // Extract description
            let description = exhibitions$(element).find('.description, p, .content, .excerpt').text().trim();
            if (!description || description.length < 10) {
              description = `${title} exhibition at The Polygon Gallery. Visit ${fullUrl} for more information.`;
            }
            
            // Extract image
            let imageUrl = exhibitions$(element).find('img').attr('src') || 
                          exhibitions$(element).find('img').attr('data-src') || 
                          exhibitions$(element).find('.image').attr('style');
            
            // Handle image URLs in style attributes
            if (imageUrl && imageUrl.includes('background-image')) {
              const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (imgMatch) {
                imageUrl = imgMatch[1];
              }
            }
            
            // Make image URL absolute if needed
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('//') ? 
                `https:${imageUrl}` : 
                `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
            }
            
            const exhibition = {
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
            
            logger.info({ event: { title, date: formattedDate } }, 'Found exhibition');
            events.push(exhibition);
          } catch (exhibitionError) {
            logger.error({ error: exhibitionError.message }, 'Error processing exhibition');
          }
        });
      }
      
      // Look for exhibitions in main content sections if no exhibition items found
      if (exhibitionItems.length === 0) {
        logger.info('No exhibition items found using primary selectors, trying alternative selectors');
        
        exhibitions$('section, .section, .content-block').each((i, section) => {
          const heading = exhibitions$(section).find('h2, h3').first().text().toLowerCase();
          
          if (heading.includes('exhibition') || heading.includes('current') || heading.includes('upcoming')) {
            exhibitions$(section).find('article, .item, .card').each((j, item) => {
              try {
                // Extract title
                const title = exhibitions$(item).find('h2, h3, h4, .title').first().text().trim();
                if (!title) return;
                
                // Extract URL
                let detailUrl = exhibitions$(item).find('a').attr('href');
                const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                  detailUrl : 
                  detailUrl ? 
                    `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                    exhibitsUrl;
                
                // Extract date
                let dateText = exhibitions$(item).find('.date, .dates, time').text().trim();
                const formattedDate = parseDate(dateText);
                
                // Extract description
                let description = exhibitions$(item).find('.description, p').text().trim();
                if (!description) {
                  description = `${title} exhibition at The Polygon Gallery. Visit ${fullUrl} for more information.`;
                }
                
                // Extract image
                let imageUrl = exhibitions$(item).find('img').attr('src') || '';
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
                }
                
                const exhibition = {
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
                
                logger.info({ event: { title, date: formattedDate } }, 'Found exhibition from content section');
                events.push(exhibition);
              } catch (itemError) {
                logger.error({ error: itemError.message }, 'Error processing exhibition item');
              }
            });
          }
        });
      }
    }
    
    // Scrape events page
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (eventsResponse.data) {
      const events$ = cheerio.load(eventsResponse.data);
      logger.info('Processing events');
      
      // Look for event items
      const eventItems = events$('.event, .event-item, .post, article');
      
      if (eventItems.length > 0) {
        eventItems.each((i, element) => {
          try {
            // Extract event title
            const title = events$(element).find('h2, h3, h4, .title').first().text().trim();
            if (!title) return; // Skip if no title
            
            // Check for duplicates
            const isDuplicate = events.some(existingEvent => existingEvent.title === title);
            if (isDuplicate) return;
            
            // Extract URL
            let detailUrl = events$(element).find('a').attr('href');
            
            // Make URL absolute if needed
            const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
              detailUrl : 
              detailUrl ? 
                `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                eventsUrl;
            
            // Extract date information
            let dateText = events$(element).find('.date, .dates, time').text().trim();
            
            // Try to find dates in other elements if not found directly
            if (!dateText) {
              const paragraphs = events$(element).find('p');
              paragraphs.each((j, paragraph) => {
                const text = events$(paragraph).text();
                if (text.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i)) {
                  dateText = text;
                  return false; // Break the loop
                }
              });
            }
            
            // Parse the date
            const formattedDate = parseDate(dateText);
            
            // Extract description
            let description = events$(element).find('.description, p, .content, .excerpt').text().trim();
            if (!description || description.length < 10) {
              description = `${title} event at The Polygon Gallery. Visit ${fullUrl} for more information.`;
            }
            
            // Extract image
            let imageUrl = events$(element).find('img').attr('src') || 
                          events$(element).find('img').attr('data-src') || 
                          events$(element).find('.image').attr('style');
            
            // Handle image URLs in style attributes
            if (imageUrl && imageUrl.includes('background-image')) {
              const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (imgMatch) {
                imageUrl = imgMatch[1];
              }
            }
            
            // Make image URL absolute if needed
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('//') ? 
                `https:${imageUrl}` : 
                `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
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
      
      // Look for events in main content sections if no event items found
      if (eventItems.length === 0) {
        logger.info('No event items found using primary selectors, trying alternative selectors');
        
        events$('section, .section, .content-block').each((i, section) => {
          const heading = events$(section).find('h2, h3').first().text().toLowerCase();
          
          if (heading.includes('event') || heading.includes('program') || 
              heading.includes('talk') || heading.includes('workshop')) {
            events$(section).find('article, .item, .card').each((j, item) => {
              try {
                // Extract title
                const title = events$(item).find('h2, h3, h4, .title').first().text().trim();
                if (!title) return;
                
                // Check for duplicates
                const isDuplicate = events.some(existingEvent => existingEvent.title === title);
                if (isDuplicate) return;
                
                // Extract URL
                let detailUrl = events$(item).find('a').attr('href');
                const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                  detailUrl : 
                  detailUrl ? 
                    `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                    eventsUrl;
                
                // Extract date
                let dateText = events$(item).find('.date, .dates, time').text().trim();
                const formattedDate = parseDate(dateText);
                
                // Extract description
                let description = events$(item).find('.description, p').text().trim();
                if (!description) {
                  description = `${title} event at The Polygon Gallery. Visit ${fullUrl} for more information.`;
                }
                
                // Extract image
                let imageUrl = events$(item).find('img').attr('src') || '';
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
                logger.error({ error: itemError.message }, 'Error processing event item');
              }
            });
          }
        });
      }
    }

    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (events[i].url && events[i].url !== eventsUrl && events[i].url !== exhibitsUrl) {
            const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
            
            if (detailResponse.data) {
              const detail$ = cheerio.load(detailResponse.data);
              
              // Get better description
              const betterDescription = detail$('.content, .event-content, .exhibition-content, .description, article p').text().trim();
              if (betterDescription && betterDescription.length > events[i].description.length) {
                events[i].description = betterDescription.substring(0, 500) + (betterDescription.length > 500 ? '...' : '');
              }
              
              // Get better date information
              const betterDate = detail$('.date, .dates, time').first().text().trim();
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
      logger.info('No events were found for The Polygon Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping The Polygon Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
