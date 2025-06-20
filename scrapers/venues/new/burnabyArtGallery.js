/**
 * Burnaby Art Gallery Scraper
 * URL: https://www.burnaby.ca/recreation-and-arts/arts-and-culture/burnaby-art-gallery
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Burnaby Art Gallery';
const url = 'https://www.burnaby.ca/recreation-and-arts/arts-and-culture/burnaby-art-gallery';
const eventsUrl = 'https://www.burnaby.ca/whatson';
const exhibitionsUrl = 'https://www.burnaby.ca/recreation-and-arts/arts-and-culture/burnaby-art-gallery/exhibitions';
const venueAddress = '6344 Deer Lake Avenue';
const venueCity = 'Burnaby';
const venueRegion = 'BC';
const venuePostalCode = 'V5G 2J3';
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
 * Scrape events from Burnaby Art Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Burnaby Art Gallery scraper');

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
      $('.exhibition, .exhibit, article, .card, .tile, .media-object, .listing-item').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let exhibitUrl = $(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              `https://www.burnaby.ca${exhibitUrl.startsWith('/') ? '' : '/'}${exhibitUrl}` : 
              exhibitionsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .event-date, .meta').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText) || 'Permanent exhibit';
          
          // Extract description
          let description = $(element).find('.description, .excerpt, .summary, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibition at Burnaby Art Gallery. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                        $(element).find('img').attr('data-src') ||
                        $(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.burnaby.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          const exhibition = {
            title,
            date: formattedDate,
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
        } catch (exhibitError) {
          logger.error({ error: exhibitError.message }, 'Error processing exhibition');
        }
      });
      
      // If no exhibitions found with primary selectors, try alternative approaches
      if (events.length === 0) {
        logger.info('Checking for exhibitions using alternative approaches');
        
        // Look for content blocks that might contain exhibition information
        $('.content-block, section, .block, .wysiwyg-content').each((i, element) => {
          if ($(element).text().toLowerCase().includes('exhibit') || 
              $(element).text().toLowerCase().includes('gallery') || 
              $(element).text().toLowerCase().includes('collection')) {
            
            try {
              const title = $(element).find('h1, h2, h3, h4, h5').first().text().trim();
              if (!title || title.length < 3 || title.toLowerCase() === 'exhibitions') return;
              
              let contentUrl = $(element).find('a').attr('href');
              const fullUrl = contentUrl && contentUrl.startsWith('http') ? 
                contentUrl : 
                contentUrl ? 
                  `https://www.burnaby.ca${contentUrl.startsWith('/') ? '' : '/'}${contentUrl}` : 
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
                description = `${title} exhibition at Burnaby Art Gallery. Visit website for details.`;
              }
              
              let imageUrl = $(element).find('img').attr('src');
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `https://www.burnaby.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              }
              
              // Check for duplicates
              const isDuplicate = events.some(event => event.title === title);
              if (!isDuplicate) {
                events.push({
                  title,
                  date: parseDate(dateText) || 'Permanent exhibit',
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
            } catch (altExhibitError) {
              logger.error({ error: altExhibitError.message }, 'Error processing alternative exhibition');
            }
          }
        });
      }
    }
    
    // Scrape events page (What's On)
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching events page');
      return { data: '' };
    });
    
    if (eventsResponse.data) {
      const events$ = cheerio.load(eventsResponse.data);
      logger.info('Processing events');
      
      // Process event listings - filter for Burnaby Art Gallery events only
      events$('.event-item, .event, article, .card, .whats-on-item').each((i, element) => {
        try {
          // Check if this event is for Burnaby Art Gallery
          const eventText = events$(element).text().toLowerCase();
          const isRelevantEvent = eventText.includes('art gallery') || 
                                 eventText.includes('burnaby art') ||
                                 eventText.includes('deer lake') ||
                                 eventText.includes('gallery');
          
          if (!isRelevantEvent) return;
          
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
              `https://www.burnaby.ca${eventUrl.startsWith('/') ? '' : '/'}${eventUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = events$(element).find('.date, time, .event-date, .meta').text().trim();
          if (!dateText) {
            const text = events$(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = events$(element).find('.description, .excerpt, .summary, p:not(.date), .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} event at Burnaby Art Gallery. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = events$(element).find('img').attr('src') || 
                        events$(element).find('img').attr('data-src') ||
                        events$(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.burnaby.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
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
    }
    
    // Check main page for featured content
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
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          let contentUrl = main$(element).find('a').attr('href');
          const fullUrl = contentUrl && contentUrl.startsWith('http') ? 
            contentUrl : 
            contentUrl ? 
              `https://www.burnaby.ca${contentUrl.startsWith('/') ? '' : '/'}${contentUrl}` : 
              url;
          
          let description = main$(element).find('p, .description, .content').text().trim();
          if (!description) {
            description = `${title} at Burnaby Art Gallery. Visit website for details.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || 
                         main$(element).find('.image').attr('style');
          
          // Extract image from style if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const match = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match) imageUrl = match[1];
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.burnaby.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
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
                `https://www.burnaby.ca${betterImage.startsWith('/') ? '' : '/'}${betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Burnaby Art Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and exhibitions`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Burnaby Art Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
