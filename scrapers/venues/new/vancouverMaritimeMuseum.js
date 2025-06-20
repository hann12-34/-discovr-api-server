/**
 * Vancouver Maritime Museum Scraper
 * URL: https://vanmaritime.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Vancouver Maritime Museum';
const url = 'https://vanmaritime.com/';
const eventsUrl = 'https://vanmaritime.com/events/';
const exhibitsUrl = 'https://vanmaritime.com/exhibits/';
const venueAddress = '1905 Ogden Avenue';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6J 1A3';
const venueCountry = 'Canada';

/**
 * Parse date strings from the museum website
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
 * Scrape events from Vancouver Maritime Museum
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Vancouver Maritime Museum scraper');

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
    
    // Scrape events page
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (eventsResponse.data) {
      const events$ = cheerio.load(eventsResponse.data);
      logger.info('Processing events');
      
      // Look for event cards or items
      const eventItems = events$('.event, .event-card, .event-list article, .event-item');
      
      if (eventItems.length > 0) {
        eventItems.each((i, element) => {
          try {
            // Extract event title
            const title = events$(element).find('h2, h3, h4, .event-title, .title').first().text().trim();
            if (!title) return; // Skip if no title
            
            // Extract URL
            let detailUrl = events$(element).find('a').attr('href');
            
            // Make URL absolute if needed
            const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
              detailUrl : 
              detailUrl ? 
                `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                eventsUrl;
            
            // Extract date information
            let dateText = events$(element).find('.date, .event-date, time').text().trim();
            
            // If no date found in dedicated elements, try to extract from text
            if (!dateText) {
              const elementText = events$(element).text();
              const dateMatch = elementText.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
              if (dateMatch) {
                dateText = dateMatch[0];
              }
            }
            
            // Parse the date
            const formattedDate = parseDate(dateText);
            
            // Extract description
            let description = events$(element).find('.description, .excerpt, .event-description, p').text().trim();
            
            // Ensure description has reasonable content
            if (!description || description.length < 10) {
              description = `${title} event at Vancouver Maritime Museum. Visit ${fullUrl} for more information.`;
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
      
      // If no events found using primary selectors, try alternative approach
      if (eventItems.length === 0) {
        logger.info('No events found using primary selectors, trying alternative approach');
        
        // Look for events in main content sections
        events$('section, .section, .content-block').each((i, section) => {
          try {
            const sectionTitle = events$(section).find('h2, h3').first().text().toLowerCase();
            
            if (sectionTitle.includes('event') || sectionTitle.includes('program') || 
                sectionTitle.includes('workshop') || sectionTitle.includes('upcoming')) {
              
              events$(section).find('article, .item, .card, .post').each((j, item) => {
                try {
                  // Extract title
                  const title = events$(item).find('h2, h3, h4, .title').first().text().trim();
                  if (!title) return;
                  
                  // Extract URL
                  let detailUrl = events$(item).find('a').attr('href');
                  const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                    detailUrl : 
                    detailUrl ? 
                      `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                      eventsUrl;
                  
                  // Extract date
                  let dateText = events$(item).find('.date, time').text().trim();
                  const formattedDate = parseDate(dateText);
                  
                  // Extract description
                  let description = events$(item).find('.description, p').text().trim();
                  if (!description) {
                    description = `${title} at Vancouver Maritime Museum. Visit website for more details.`;
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
                  logger.error({ error: itemError.message }, 'Error processing section item');
                }
              });
            }
          } catch (sectionError) {
            logger.error({ error: sectionError.message }, 'Error processing section');
          }
        });
      }
    }
    
    // Scrape exhibits page
    logger.info('Fetching exhibits page');
    const exhibitsResponse = await axios.get(exhibitsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (exhibitsResponse.data) {
      const exhibits$ = cheerio.load(exhibitsResponse.data);
      logger.info('Processing exhibits');
      
      // Look for exhibit items
      const exhibitItems = exhibits$('.exhibit, .exhibition, .exhibit-item, article');
      
      if (exhibitItems.length > 0) {
        exhibitItems.each((i, element) => {
          try {
            // Extract exhibit title
            const title = exhibits$(element).find('h2, h3, h4, .title').first().text().trim();
            if (!title) return; // Skip if no title
            
            // Check for duplicates
            const isDuplicate = events.some(existingEvent => existingEvent.title === title);
            if (isDuplicate) return;
            
            // Extract URL
            let detailUrl = exhibits$(element).find('a').attr('href');
            
            // Make URL absolute if needed
            const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
              detailUrl : 
              detailUrl ? 
                `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                exhibitsUrl;
            
            // Extract date information - exhibitions often have longer time periods
            let dateText = exhibits$(element).find('.date, .dates, time').text().trim();
            
            // For permanent exhibits, set a generic timeframe
            if (!dateText || dateText.toLowerCase().includes('permanent')) {
              const currentYear = new Date().getFullYear();
              dateText = `Permanent Exhibition ${currentYear}`;
            }
            
            // Parse the date
            const formattedDate = dateText;
            
            // Extract description
            let description = exhibits$(element).find('.description, .excerpt, p').text().trim();
            
            // Ensure description has reasonable content
            if (!description || description.length < 10) {
              description = `${title} exhibit at Vancouver Maritime Museum. Visit ${fullUrl} for more information.`;
            }
            
            // Extract image
            let imageUrl = exhibits$(element).find('img').attr('src') || 
                          exhibits$(element).find('img').attr('data-src') || 
                          exhibits$(element).find('.image').attr('style');
            
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
            
            const exhibit = {
              title,
              date: formattedDate || 'Permanent Exhibition',
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
            
            logger.info({ event: { title, date: formattedDate } }, 'Found exhibit');
            events.push(exhibit);
          } catch (exhibitError) {
            logger.error({ error: exhibitError.message }, 'Error processing exhibit');
          }
        });
      }
      
      // If no exhibits found using primary selectors, try alternative approach
      if (exhibitItems.length === 0) {
        logger.info('No exhibits found using primary selectors, trying alternative approach');
        
        // Look for exhibits in main content sections
        exhibits$('section, .section, .content-block').each((i, section) => {
          try {
            const sectionTitle = exhibits$(section).find('h2, h3').first().text().toLowerCase();
            
            if (sectionTitle.includes('exhibit') || sectionTitle.includes('display') || 
                sectionTitle.includes('collection') || sectionTitle.includes('gallery')) {
              
              exhibits$(section).find('article, .item, .card').each((j, item) => {
                try {
                  // Extract title
                  const title = exhibits$(item).find('h2, h3, h4, .title').first().text().trim();
                  if (!title) return;
                  
                  // Check for duplicates
                  const isDuplicate = events.some(existingEvent => existingEvent.title === title);
                  if (isDuplicate) return;
                  
                  // Extract URL
                  let detailUrl = exhibits$(item).find('a').attr('href');
                  const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                    detailUrl : 
                    detailUrl ? 
                      `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                      exhibitsUrl;
                  
                  // Extract date
                  let dateText = exhibits$(item).find('.date, time').text().trim();
                  const formattedDate = dateText || 'Permanent Exhibition';
                  
                  // Extract description
                  let description = exhibits$(item).find('.description, p').text().trim();
                  if (!description) {
                    description = `${title} exhibit at Vancouver Maritime Museum. Visit website for more details.`;
                  }
                  
                  // Extract image
                  let imageUrl = exhibits$(item).find('img').attr('src') || '';
                  if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
                  }
                  
                  const exhibit = {
                    title,
                    date: formattedDate,
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
                  
                  logger.info({ event: { title, date: formattedDate } }, 'Found exhibit from content section');
                  events.push(exhibit);
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
              const betterDescription = detail$('.content, .event-content, .exhibit-content, .description, article p').text().trim();
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
      logger.info('No events were found for Vancouver Maritime Museum, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Vancouver Maritime Museum');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
