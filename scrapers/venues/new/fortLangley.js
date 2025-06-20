/**
 * Fort Langley National Historic Site Scraper
 * URL: https://www.pc.gc.ca/en/lhn-nhs/bc/langley
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Fort Langley National Historic Site';
const url = 'https://www.pc.gc.ca/en/lhn-nhs/bc/langley';
const eventsUrl = 'https://www.pc.gc.ca/en/lhn-nhs/bc/langley/activ';
const venueAddress = '23433 Mavis Avenue';
const venueCity = 'Fort Langley';
const venueRegion = 'BC';
const venuePostalCode = 'V1M 2R5';
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
 * Scrape events from Fort Langley National Historic Site
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Fort Langley National Historic Site scraper');

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
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (eventsResponse.data) {
      const $ = cheerio.load(eventsResponse.data);
      logger.info('Processing events');
      
      // Process event listings - Parks Canada sites often use different layout/classes
      $('.event, .event-item, .activities-item, article, .card, .component-section').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title, .card-title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Extract URL
          let eventUrl = $(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              eventUrl.startsWith('/') ? 
                `https://www.pc.gc.ca${eventUrl}` : 
                `${url}/${eventUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .event-date, .meta').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, .excerpt, .summary, p, .card-text').text().trim();
          if (!description || description.length < 10) {
            description = `${title} at Fort Langley National Historic Site. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                         $(element).find('img').attr('data-src') ||
                         $(element).find('.image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.pc.gc.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
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
      
      // Parks Canada websites often have a different structure for seasonal events
      $('.feature, .feature-item, .seasonal-item, .seasonal').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title, .seasonal-title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          // Extract URL
          let eventUrl = $(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              eventUrl.startsWith('/') ? 
                `https://www.pc.gc.ca${eventUrl}` : 
                `${url}/${eventUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText);
          
          // Extract description
          let description = $(element).find('.description, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} at Fort Langley National Historic Site. Visit website for details.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                         $(element).find('.bg-img img').attr('src');
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.pc.gc.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
          }
          
          events.push({
            title,
            date: formattedDate || 'Seasonal Event - Check website for dates',
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
          
          logger.info({ event: { title } }, 'Found seasonal event');
        } catch (featureError) {
          logger.error({ error: featureError.message }, 'Error processing seasonal event');
        }
      });
    }
    
    // Check main page for special announcements or featured events
    logger.info('Checking main page for featured events');
    const mainResponse = await axios.get(url, axiosConfig).catch(() => ({ data: '' }));
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured events or highlights on main page
      main$('.feature, .card, .hero-banner, .highlighted, .spotlight').each((i, element) => {
        try {
          const title = main$(element).find('h2, h3, h4, .title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check if this is already in our events list
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          let eventUrl = main$(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              eventUrl.startsWith('/') ? 
                `https://www.pc.gc.ca${eventUrl}` : 
                `${url}/${eventUrl}` : 
              url;
          
          let dateText = main$(element).find('.date, time').text().trim();
          if (!dateText) {
            const text = main$(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          let description = main$(element).find('p, .description, .content, .card-text').text().trim();
          if (!description || description.length < 10) {
            description = `${title} at Fort Langley National Historic Site. Visit website for details.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || 
                         main$(element).find('.bg-img img').attr('src');
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.pc.gc.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
          }
          
          events.push({
            title,
            date: parseDate(dateText) || 'Featured Event - Check website for dates',
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
      
      // Parks Canada sites often have special programs section
      main$('.programs, .program-list, .explore-section').find('.program, .card, .list-item').each((i, element) => {
        try {
          const title = main$(element).find('h3, h4, .title, .card-title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check if this is already in our events list
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          let programUrl = main$(element).find('a').attr('href');
          const fullUrl = programUrl && programUrl.startsWith('http') ? 
            programUrl : 
            programUrl ? 
              programUrl.startsWith('/') ? 
                `https://www.pc.gc.ca${programUrl}` : 
                `${url}/${programUrl}` : 
              url;
          
          let description = main$(element).find('p, .description, .content, .card-text').text().trim();
          if (!description || description.length < 10) {
            description = `${title} program at Fort Langley National Historic Site. Visit website for details and schedule.`;
          }
          
          let imageUrl = main$(element).find('img').attr('src') || '';
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.pc.gc.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
          }
          
          events.push({
            title,
            date: 'Regular Program - Check website for schedule',
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
          
          logger.info({ event: { title } }, 'Found program from main page');
        } catch (programError) {
          logger.error({ error: programError.message }, 'Error processing program');
        }
      });
    }
    
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === url || events[i].url === eventsUrl) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.description, .content-section p, .card-text, .main-content p').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information
            if (!events[i].date.includes('Program') && !events[i].date.includes('Check website')) {
              const betterDate = detail$('.date, time, .event-date, .meta').first().text().trim();
              if (betterDate && betterDate.length > 5) {
                events[i].date = parseDate(betterDate);
              }
            }
            
            // Get better image
            const betterImage = detail$('.featured-image img, .main-image img, .hero-image img').attr('src');
            if (betterImage) {
              events[i].image = betterImage.startsWith('http') ? 
                betterImage : 
                `https://www.pc.gc.ca${betterImage.startsWith('/') ? betterImage : '/' + betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Fort Langley National Historic Site, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and programs`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Fort Langley National Historic Site');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
