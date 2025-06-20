/**
 * Audain Art Museum Scraper
 * URL: https://audainartmuseum.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Audain Art Museum';
const url = 'https://audainartmuseum.com/';
const exhibitionsUrl = 'https://audainartmuseum.com/exhibitions/';
const eventsUrl = 'https://audainartmuseum.com/events/';
const venueAddress = '4350 Blackcomb Way';
const venueCity = 'Whistler';
const venueRegion = 'BC';
const venuePostalCode = 'V8E 1N3';
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
 * Scrape events from Audain Art Museum
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Audain Art Museum scraper');
  
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
    
    // Scrape exhibitions page
    logger.info('Fetching exhibitions page');
    const exhibitionsResponse = await axios.get(exhibitionsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching exhibitions page');
      return { data: '' };
    });
    
    if (exhibitionsResponse.data) {
      const $ = cheerio.load(exhibitionsResponse.data);
      logger.info('Processing exhibitions');
      
      // Process exhibition listings
      $('.exhibition, .exhibition-item, .post, article, .card, .exhibit').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title, .exhibition-title').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let exhibitUrl = $(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              `${url}${exhibitUrl.startsWith('/') ? exhibitUrl.substring(1) : exhibitUrl}` : 
              exhibitionsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .exhibition-date, .meta, .dates').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, .excerpt, .summary, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibition at Audain Art Museum in Whistler. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                        $(element).find('img').attr('data-src') ||
                        $(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"']?([^'"']+)['"']?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
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
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            image: imageUrl
          };
          
          logger.info({ event: { title, date: formattedDate } }, 'Found exhibition');
          events.push(exhibition);
        } catch (exhibitionError) {
          logger.error({ error: exhibitionError.message }, 'Error processing exhibition');
        }
      });
      
      // If no exhibitions found using primary selectors, try alternative approaches
      if (events.length === 0) {
        // Look for any blocks that might contain exhibition information
        logger.info('No exhibitions found with primary selectors, trying alternative approaches');
        
        $('section, .content-block, .block').each((i, element) => {
          if ($(element).text().toLowerCase().includes('exhibition') || 
              $(element).text().toLowerCase().includes('display') || 
              $(element).text().toLowerCase().includes('gallery')) {
            
            try {
              const title = $(element).find('h1, h2, h3, h4, h5').first().text().trim();
              if (!title || title.length < 3) return;
              
              let contentUrl = $(element).find('a').attr('href');
              const fullUrl = contentUrl && contentUrl.startsWith('http') ? 
                contentUrl : 
                contentUrl ? 
                  `${url}${contentUrl.startsWith('/') ? contentUrl.substring(1) : contentUrl}` : 
                  exhibitionsUrl;
              
              // Look for dates
              let dateText = '';
              const dateElements = $(element).find('p, div, span').filter((i, el) => {
                const text = $(el).text().trim();
                return /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b/i.test(text);
              });
              
              if (dateElements.length > 0) {
                dateText = dateElements.first().text().trim();
              }
              
              let description = $(element).find('p').text().trim();
              if (!description || description.length < 10) {
                description = `${title} at Audain Art Museum in Whistler. Visit website for more details.`;
              }
              
              let imageUrl = $(element).find('img').attr('src');
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
              }
              
              // Check for duplicates
              const isDuplicate = events.some(event => event.title === title);
              if (!isDuplicate) {
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
                
                logger.info({ event: { title } }, 'Found exhibition using alternative approach');
              }
            } catch (altExhibitionError) {
              logger.error({ error: altExhibitionError.message }, 'Error processing alternative exhibition');
            }
          }
        });
      }
    }

    // Scrape events page
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching events page');
      return { data: '' };
    });
    
    if (eventsResponse.data) {
      const events$ = cheerio.load(eventsResponse.data);
      logger.info('Processing events');
      
      // Process event listings
      events$('.event, .event-item, .post, article, .card, .events-list .item').each((i, element) => {
        try {
          // Extract title
          const title = events$(element).find('h2, h3, h4, .title, .event-title').first().text().trim();
          if (!title) return;
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          // Extract URL
          let eventUrl = events$(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = events$(element).find('.date, time, .event-date, .meta, .calendar-date').text().trim();
          if (!dateText) {
            const text = events$(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = events$(element).find('.description, .excerpt, .summary, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} event at Audain Art Museum in Whistler. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = events$(element).find('img').attr('src') || 
                         events$(element).find('img').attr('data-src') ||
                         events$(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"']?([^'"']+)['"']?\)/);
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
        // Look for any sections that might contain event information
        logger.info('Checking for events using alternative approaches');
        
        events$('section, .content-block, .block').each((i, element) => {
          if (events$(element).text().toLowerCase().includes('event') || 
              events$(element).text().toLowerCase().includes('program') || 
              events$(element).text().toLowerCase().includes('workshop')) {
            
            try {
              const title = events$(element).find('h1, h2, h3, h4, h5').first().text().trim();
              if (!title || title.length < 3) return;
              
              // Check for duplicates
              const isDuplicate = events.some(event => event.title === title);
              if (isDuplicate) return;
              
              let contentUrl = events$(element).find('a').attr('href');
              const fullUrl = contentUrl && contentUrl.startsWith('http') ? 
                contentUrl : 
                contentUrl ? 
                  `${url}${contentUrl.startsWith('/') ? contentUrl.substring(1) : contentUrl}` : 
                  eventsUrl;
              
              // Look for dates
              let dateText = '';
              const dateElements = events$(element).find('p, div, span').filter((i, el) => {
                const text = events$(el).text().trim();
                return /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b/i.test(text);
              });
              
              if (dateElements.length > 0) {
                dateText = dateElements.first().text().trim();
              }
              
              let description = events$(element).find('p').text().trim();
              if (!description || description.length < 10) {
                description = `${title} at Audain Art Museum in Whistler. Visit website for details.`;
              }
              
              let imageUrl = events$(element).find('img').attr('src');
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
          }
        });
      }
    }
    
    // Check main page for featured events or exhibitions
    logger.info('Checking main page for featured content');
    const mainResponse = await axios.get(url, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching main page');
      return { data: '' };
    });
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured content sections
      main$('.featured, .highlight, .banner, .hero, .slider, .carousel').each((i, element) => {
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
            description = `${title} at Audain Art Museum in Whistler. Visit website for details.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || 
                         main$(element).find('.image').attr('style');
          
          // Extract image from style if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const match = imageUrl.match(/url\(['"']?([^'"']+)['"']?\)/);
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
      logger.info('Fetching additional details for events and exhibitions');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === eventsUrl || events[i].url === exhibitionsUrl || events[i].url === url) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.entry-content, .content, article p, .description, .event-details').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information for events (not exhibitions)
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
      logger.info('No events were found for Audain Art Museum, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and exhibitions`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Audain Art Museum');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
