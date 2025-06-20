/**
 * Britannia Mine Museum Scraper
 * URL: https://www.britanniaminemuseum.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Britannia Mine Museum';
const url = 'https://www.britanniaminemuseum.ca/';
const eventsUrl = 'https://www.britanniaminemuseum.ca/events/';
const exhibitsUrl = 'https://www.britanniaminemuseum.ca/exhibits/';
const venueAddress = '150 Copper Drive';
const venueCity = 'Britannia Beach';
const venueRegion = 'BC';
const venuePostalCode = 'V0N 1J0';
const venueCountry = 'Canada';

/**
 * Parse date strings from various formats
 * @param {string} dateStr - Date string to parse
 * @returns {string} - Formatted date string
 */
function parseDate(dateStr) {
  if (!dateStr) return '';
  
  try {
    // Handle various date formats
    const dateRangeRegex = /([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s*[-–—]\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const dateRangeMatch = dateStr.match(dateRangeRegex);
    if (dateRangeMatch) {
      return `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
    }
    
    // Handle single dates with year
    const standardDateRegex = /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const standardDateMatch = dateStr.match(standardDateRegex);
    if (standardDateMatch) {
      return standardDateMatch[0];
    }
    
    // Handle month and day only
    const monthDayRegex = /([A-Za-z]+\s+\d{1,2})/i;
    const monthDayMatch = dateStr.match(monthDayRegex);
    if (monthDayMatch) {
      // Add current year if only month and day
      const currentYear = new Date().getFullYear();
      return `${monthDayMatch[0]}, ${currentYear}`;
    }
    
    return dateStr;
  } catch (error) {
    scrapeLogger.error({ error: error.message }, 'Error parsing date');
    return dateStr;
  }
}

/**
 * Scrape events from Britannia Mine Museum
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Britannia Mine Museum scraper');

  try {
    // Configure axios with headers to mimic a browser
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 30000
    };

    const events = [];
    
    // Scrape events page
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching events page');
      return { data: '' };
    });
    
    if (eventsResponse.data) {
      const $ = cheerio.load(eventsResponse.data);
      logger.info('Processing events');
      
      // Process event listings
      $('.event-item, article, .post, .card, .event, .event-listing, .tribe-events-list-event-wrap').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title, .event-title, .tribe-events-list-event-title').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let eventUrl = $(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .event-date, .meta, .tribe-event-date-start, .tribe-event-date').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, .excerpt, .summary, p, .content, .tribe-events-list-event-description').text().trim();
          if (!description || description.length < 10) {
            description = `${title} event at Britannia Mine Museum. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                        $(element).find('img').attr('data-src') ||
                        $(element).find('.image').attr('style') ||
                        $(element).find('.tribe-events-event-image img').attr('src');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
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
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title, date: formattedDate } }, 'Found event');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event');
        }
      });
      
      // If no events found using primary selectors, try alternative approaches
      if (events.length === 0) {
        // Look for seasonal or featured events that might be displayed differently
        logger.info('No events found with primary selectors, trying alternative approaches');
        
        $('.featured-event, .program, .seasonal-event, .special-event').each((i, element) => {
          try {
            const title = $(element).find('h2, h3, h4').first().text().trim();
            if (!title || title.length < 3) return;
            
            let eventUrl = $(element).find('a').attr('href');
            const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
              eventUrl : 
              eventUrl ? 
                `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
                eventsUrl;
            
            let dateText = '';
            const dateElements = $(element).find('span, div, p').filter((i, el) => {
              const text = $(el).text().trim();
              return /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b/i.test(text);
            });
            
            if (dateElements.length > 0) {
              dateText = dateElements.first().text().trim();
            }
            
            let description = $(element).find('p').text().trim();
            if (!description || description.length < 10) {
              description = `${title} at Britannia Mine Museum. Visit website for more details.`;
            }
            
            let imageUrl = $(element).find('img').attr('src');
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
            }
            
            events.push({
              title,
              date: parseDate(dateText) || 'Check website for dates',
              url: fullUrl,
              venue: name,
              address: venueAddress,
              city: venueCity,
              region: venueRegion,
              postalCode: venuePostalCode,
              country: venueCountry,
              description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
              image: imageUrl
            });
            
            logger.info({ event: { title } }, 'Found event using alternative approach');
          } catch (altEventError) {
            logger.error({ error: altEventError.message }, 'Error processing alternative event');
          }
        });
      }
    }
    
    // Scrape exhibits page
    logger.info('Fetching exhibits page');
    const exhibitsResponse = await axios.get(exhibitsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching exhibits page');
      return { data: '' };
    });
    
    if (exhibitsResponse.data) {
      const exhib$ = cheerio.load(exhibitsResponse.data);
      logger.info('Processing exhibits');
      
      // Process exhibit listings
      exhib$('.exhibit, article, .post, .card, .attraction, .panel').each((i, element) => {
        try {
          // Extract title
          const title = exhib$(element).find('h2, h3, h4, .title').first().text().trim();
          if (!title) return;
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          // Extract URL
          let exhibitUrl = exhib$(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              `${url}${exhibitUrl.startsWith('/') ? exhibitUrl.substring(1) : exhibitUrl}` : 
              exhibitsUrl;
          
          // Extract description
          let description = exhib$(element).find('.description, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibit at Britannia Mine Museum. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = exhib$(element).find('img').attr('src') || 
                        exhib$(element).find('img').attr('data-src') ||
                        exhib$(element).find('.image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          const exhibit = {
            title,
            date: 'Permanent exhibit', // Most museum exhibits are permanent or long-term
            url: fullUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title } }, 'Found exhibit');
          events.push(exhibit);
        } catch (exhibitError) {
          logger.error({ error: exhibitError.message }, 'Error processing exhibit');
        }
      });
    }
    
    // Check main page for featured events or exhibits
    logger.info('Checking main page for featured content');
    const mainResponse = await axios.get(url, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching main page');
      return { data: '' };
    });
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured content sections
      main$('.featured, .highlight, .banner, .hero, .slider').each((i, element) => {
        try {
          const title = main$(element).find('h1, h2, h3, h4, .title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check if this is already in our events list
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          let contentUrl = main$(element).find('a').attr('href');
          const fullUrl = contentUrl && contentUrl.startsWith('http') ? 
            contentUrl : 
            contentUrl ? 
              `${url}${contentUrl.startsWith('/') ? contentUrl.substring(1) : contentUrl}` : 
              url;
          
          let description = main$(element).find('p, .description, .content').text().trim();
          if (!description) {
            description = `${title} at Britannia Mine Museum. Visit website for details.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || 
                         main$(element).find('.image').attr('style');
          
          // Extract image from style if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const match = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match) imageUrl = match[1];
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          events.push({
            title,
            date: 'Featured', // Featured items often don't have explicit dates
            url: fullUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            image: imageUrl
          });
          
          logger.info({ event: { title } }, 'Found featured content from main page');
        } catch (featureError) {
          logger.error({ error: featureError.message }, 'Error processing featured content');
        }
      });
    }
    
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events and exhibits');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === eventsUrl || events[i].url === exhibitsUrl || events[i].url === url) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.entry-content, .content, article p, .description').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information for events (not exhibits)
            if (events[i].date !== 'Permanent exhibit' && events[i].date !== 'Featured') {
              const betterDate = detail$('.date, time, .event-date, .meta').first().text().trim();
              if (betterDate && betterDate.length > 5) {
                events[i].date = parseDate(betterDate);
              }
            }
            
            // Get better image
            const betterImage = detail$('.featured-image img, .wp-post-image, .main-image img').attr('src');
            if (betterImage) {
              events[i].image = betterImage.startsWith('http') ? 
                betterImage : 
                `${url}${betterImage.startsWith('/') ? betterImage.substring(1) : betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Britannia Mine Museum, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and exhibits`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Britannia Mine Museum');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
