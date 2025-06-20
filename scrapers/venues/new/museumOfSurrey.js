/**
 * Museum of Surrey Scraper
 * URL: https://www.surrey.ca/arts-culture/museum-of-surrey
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Museum of Surrey';
const url = 'https://www.surrey.ca/arts-culture/museum-of-surrey';
const eventsUrl = 'https://www.surrey.ca/arts-culture/museum-of-surrey/exhibitions-events';
const venueAddress = '17710 56A Avenue';
const venueCity = 'Surrey';
const venueRegion = 'BC';
const venuePostalCode = 'V3S 5H8';
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
 * Scrape events from Museum of Surrey
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Museum of Surrey scraper');

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
    
    // Scrape exhibitions and events page
    logger.info('Fetching exhibitions and events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (eventsResponse.data) {
      const $ = cheerio.load(eventsResponse.data);
      logger.info('Processing exhibitions and events');
      
      // Process events listings
      $('.event, .event-item, article, .card, .teaser, .views-row, .node--type-event').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let eventUrl = $(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              `https://www.surrey.ca${eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .field--name-field-event-date').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, .field--name-field-summary, .field--name-body, p').text().trim();
          if (!description || description.length < 10) {
            description = `${title} at Museum of Surrey. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                         $(element).find('img').attr('data-src');
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.surrey.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
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
      
      // If no events found using primary selectors, try alternative approach
      if (events.length === 0) {
        logger.info('No events found using primary selectors, trying alternative approach');
        
        // Look for events in content sections
        $('section, .section, .layout, .views-element-container').each((i, section) => {
          const heading = $(section).find('h2, h3').first().text().toLowerCase();
          
          if (heading.includes('event') || heading.includes('exhibition') || 
              heading.includes('program') || heading.includes('workshop')) {
            
            $(section).find('.views-row, .row, article, .node').each((j, item) => {
              try {
                const title = $(item).find('h3, h4, a').first().text().trim();
                if (!title) return;
                
                let eventUrl = $(item).find('a').attr('href');
                const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
                  eventUrl : 
                  eventUrl ? 
                    `https://www.surrey.ca${eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl}` : 
                    eventsUrl;
                
                let dateText = $(item).find('.date, time, .field--name-field-event-date').text().trim();
                const formattedDate = parseDate(dateText);
                
                let description = $(item).find('.field--name-field-summary, p').text().trim();
                
                events.push({
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
                  image: ''
                });
                
                logger.info({ event: { title } }, 'Found event from content section');
              } catch (itemError) {
                logger.error({ error: itemError.message }, 'Error processing section item');
              }
            });
          }
        });
      }
    }
    
    // Check main museum page for additional events or exhibitions
    logger.info('Checking main museum page');
    const mainResponse = await axios.get(url, axiosConfig).catch(() => ({ data: '' }));
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured exhibitions or events
      main$('.featured, .highlight, .banner, .hero, .featured-content').each((i, element) => {
        try {
          const title = main$(element).find('h2, h3, h1, .title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check if this is already in our events list
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          let eventUrl = main$(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              `https://www.surrey.ca${eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl}` : 
              url;
          
          let description = main$(element).find('p, .description, .field--name-field-summary').text().trim();
          if (!description) {
            description = `${title} at Museum of Surrey. Visit website for details.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.surrey.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
          }
          
          events.push({
            title,
            date: 'Check website for dates',
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
          
          logger.info({ event: { title } }, 'Found featured event from main page');
        } catch (featureError) {
          logger.error({ error: featureError.message }, 'Error processing featured content');
        }
      });
      
      // Check for sections about exhibitions or featured content
      main$('section, .section, .layout, .block').each((i, section) => {
        const heading = main$(section).find('h2, h3').first().text().toLowerCase();
        
        if (heading.includes('exhibition') || heading.includes('featured') || 
            heading.includes('current') || heading.includes('upcoming')) {
          
          main$(section).find('.views-row, article, .node').each((j, item) => {
            try {
              const title = main$(item).find('h3, h4, a').first().text().trim();
              if (!title) return;
              
              // Check for duplicates
              const isDuplicate = events.some(event => event.title === title);
              if (isDuplicate) return;
              
              let eventUrl = main$(item).find('a').attr('href');
              const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
                eventUrl : 
                eventUrl ? 
                  `https://www.surrey.ca${eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl}` : 
                  url;
              
              let description = main$(item).find('.field--name-field-summary, p').text().trim();
              
              events.push({
                title,
                date: 'Check website for dates',
                url: fullUrl,
                venue: name,
                address: venueAddress,
                city: venueCity,
                region: venueRegion,
                postalCode: venuePostalCode,
                country: venueCountry,
                description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
                image: ''
              });
              
              logger.info({ event: { title } }, 'Found exhibition from main page content section');
            } catch (itemError) {
              logger.error({ error: itemError.message }, 'Error processing section item');
            }
          });
        }
      });
    }
    
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === eventsUrl || events[i].url === url) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.field--name-body, .description, article p').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information
            const betterDate = detail$('.date, time, .field--name-field-event-date').first().text().trim();
            if (betterDate && betterDate.length > 5) {
              events[i].date = parseDate(betterDate);
            }
            
            // Get better image
            const betterImage = detail$('.field--name-field-media img, .hero img, .banner img').attr('src');
            if (betterImage) {
              events[i].image = betterImage.startsWith('http') ? 
                betterImage : 
                `https://www.surrey.ca${betterImage.startsWith('/') ? betterImage : '/' + betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Museum of Surrey, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and exhibitions`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Museum of Surrey');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
