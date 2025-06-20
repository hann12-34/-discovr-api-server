/**
 * Vancouver Art Gallery Scraper
 * URL: https://www.vanartgallery.bc.ca/exhibitions-events
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Vancouver Art Gallery';
const url = 'https://www.vanartgallery.bc.ca/';
const eventsUrl = 'https://www.vanartgallery.bc.ca/exhibitions-events';
const exhibitionsUrl = 'https://www.vanartgallery.bc.ca/exhibitions';
const programsUrl = 'https://www.vanartgallery.bc.ca/programs-and-events';
const venueAddress = '750 Hornby Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6Z 2H7';
const venueCountry = 'Canada';

/**
 * Parse date strings from Vancouver Art Gallery website
 * @param {string} dateStr - Date string to parse
 * @returns {string} - Formatted date string or original if parsing fails
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  
  try {
    // Handle various date formats
    const standardDateRegex = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const dateRangeRegex = /([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s*[-–—]\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const dateRangeShortRegex = /([A-Za-z]+\s+\d{1,2})\s*[-–—]\s*(\d{1,2},?\s*\d{4})/i;
    
    const dateRangeMatch = dateStr.match(dateRangeRegex);
    const dateRangeShortMatch = dateStr.match(dateRangeShortRegex);
    const standardDateMatch = dateStr.match(standardDateRegex);
    
    if (dateRangeMatch) {
      return `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
    } else if (dateRangeShortMatch) {
      return `${dateRangeShortMatch[1]} - ${dateRangeShortMatch[2]}`;
    } else if (standardDateMatch) {
      return standardDateMatch[0];
    }
    
    // If no match found, return original
    return dateStr;
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error parsing date');
    return dateStr; // Return original on error
  }
}

/**
 * Scrape events from Vancouver Art Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Vancouver Art Gallery scraper');

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
    
    // Scrape exhibitions
    logger.info('Fetching exhibitions');
    const exhibitionsResponse = await axios.get(exhibitionsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (exhibitionsResponse.data) {
      const exhibitions$ = cheerio.load(exhibitionsResponse.data);
      logger.info('Processing exhibitions');
      
      const exhibitionItems = exhibitions$('.exhibition, .exhibitions-list .item, article.exhibition, .exhibition-item');
      
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
                exhibitionsUrl;
            
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
            let description = exhibitions$(element).find('.description, p, .content').text().trim();
            if (!description || description.length < 10) {
              description = `${title} exhibition at Vancouver Art Gallery. Visit ${fullUrl} for more information.`;
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
            
            logger.info({ event: { title, date: formattedDate } }, 'Found exhibition');
            events.push(event);
          } catch (exhibitionError) {
            logger.error({ error: exhibitionError.message }, 'Error processing exhibition');
          }
        });
      } else {
        logger.info('No exhibition items found using primary selectors, trying alternative selectors');
        
        // Try alternative ways to find exhibitions
        const exhibitionContainers = exhibitions$('.content-block, main section');
        
        exhibitionContainers.each((i, container) => {
          const heading = exhibitions$(container).find('h2, h3').first().text().toLowerCase();
          
          if (heading.includes('exhibition') || heading.includes('current') || heading.includes('upcoming')) {
            exhibitions$(container).find('article, .item, .card').each((j, item) => {
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
                    exhibitionsUrl;
                
                // Extract date
                let dateText = exhibitions$(item).find('.date, .dates, time').text().trim();
                const formattedDate = parseDate(dateText);
                
                // Extract description
                let description = exhibitions$(item).find('.description, p').text().trim();
                if (!description) {
                  description = `${title} exhibition at Vancouver Art Gallery. Visit ${fullUrl} for more information.`;
                }
                
                // Extract image
                let imageUrl = exhibitions$(item).find('img').attr('src') || '';
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
                
                logger.info({ event: { title, date: formattedDate } }, 'Found exhibition from content section');
                events.push(event);
              } catch (itemError) {
                logger.error({ error: itemError.message }, 'Error processing exhibition item');
              }
            });
          }
        });
      }
    }
    
    // Scrape programs and events
    logger.info('Fetching programs and events');
    const programsResponse = await axios.get(programsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (programsResponse.data) {
      const programs$ = cheerio.load(programsResponse.data);
      logger.info('Processing programs and events');
      
      const eventItems = programs$('.event, .event-item, article.event, .program-item');
      
      if (eventItems.length > 0) {
        eventItems.each((i, element) => {
          try {
            // Extract event title
            const title = programs$(element).find('h2, h3, h4, .title').first().text().trim();
            if (!title) return; // Skip if no title
            
            // Check for duplicates
            const isDuplicate = events.some(existingEvent => existingEvent.title === title);
            if (isDuplicate) return;
            
            // Extract URL
            let detailUrl = programs$(element).find('a').attr('href');
            
            // Make URL absolute if needed
            const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
              detailUrl : 
              detailUrl ? 
                `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                programsUrl;
            
            // Extract date information
            let dateText = programs$(element).find('.date, .dates, time').text().trim();
            
            // Try to find dates in other elements if not found directly
            if (!dateText) {
              const paragraphs = programs$(element).find('p');
              paragraphs.each((j, paragraph) => {
                const text = programs$(paragraph).text();
                if (text.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i)) {
                  dateText = text;
                  return false; // Break the loop
                }
              });
            }
            
            // Parse the date
            const formattedDate = parseDate(dateText);
            
            // Extract description
            let description = programs$(element).find('.description, p, .content').text().trim();
            if (!description || description.length < 10) {
              description = `${title} event at Vancouver Art Gallery. Visit ${fullUrl} for more information.`;
            }
            
            // Extract image
            let imageUrl = programs$(element).find('img').attr('src') || 
                          programs$(element).find('img').attr('data-src') || 
                          programs$(element).find('.image').attr('style');
            
            // Handle image URLs in style attributes
            if (imageUrl && imageUrl.includes('background-image')) {
              const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (imgMatch) {
                imageUrl = imgMatch[1];
              }
            }
            
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
            
            logger.info({ event: { title, date: formattedDate } }, 'Found event or program');
            events.push(event);
          } catch (eventError) {
            logger.error({ error: eventError.message }, 'Error processing event or program');
          }
        });
      } else {
        logger.info('No event items found using primary selectors, trying alternative selectors');
        
        // Try alternative ways to find events
        const eventContainers = programs$('.content-block, main section, .programs-list');
        
        eventContainers.each((i, container) => {
          const heading = programs$(container).find('h2, h3').first().text().toLowerCase();
          
          if (heading.includes('event') || heading.includes('program') || 
              heading.includes('workshop') || heading.includes('talk')) {
            programs$(container).find('article, .item, .card').each((j, item) => {
              try {
                // Extract title
                const title = programs$(item).find('h2, h3, h4, .title').first().text().trim();
                if (!title) return;
                
                // Check for duplicates
                const isDuplicate = events.some(existingEvent => existingEvent.title === title);
                if (isDuplicate) return;
                
                // Extract URL
                let detailUrl = programs$(item).find('a').attr('href');
                const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                  detailUrl : 
                  detailUrl ? 
                    `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                    programsUrl;
                
                // Extract date
                let dateText = programs$(item).find('.date, .dates, time').text().trim();
                const formattedDate = parseDate(dateText);
                
                // Extract description
                let description = programs$(item).find('.description, p').text().trim();
                if (!description) {
                  description = `${title} event at Vancouver Art Gallery. Visit ${fullUrl} for more information.`;
                }
                
                // Extract image
                let imageUrl = programs$(item).find('img').attr('src') || '';
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
          if (events[i].url && events[i].url !== exhibitionsUrl && events[i].url !== programsUrl) {
            const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
            
            if (detailResponse.data) {
              const detail$ = cheerio.load(detailResponse.data);
              
              // Get better description
              const betterDescription = detail$('.event-content, .exhibition-content, .content, .description, article p').text().trim();
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
      logger.info('No events were found for Vancouver Art Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Vancouver Art Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
