/**
 * Pendulum Gallery Scraper
 * URL: https://www.pendulumgallery.bc.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Pendulum Gallery';
const url = 'https://www.pendulumgallery.bc.ca/';
const exhibitionsUrl = 'https://www.pendulumgallery.bc.ca/exhibitions-future';
const pastExhibitionsUrl = 'https://www.pendulumgallery.bc.ca/exhibitions-past';
const venueAddress = '885 W Georgia St';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6C 3E8';
const venueCountry = 'Canada';

module.exports = {
  name,
  url,
  scrape
};
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
 * Scrape events from Pendulum Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Pendulum Gallery scraper');

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
    
    // Scrape current and upcoming exhibitions
    logger.info('Fetching current and upcoming exhibitions');
    const exhibitionsResponse = await axios.get(exhibitionsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching exhibitions page');
      return { data: '' };
    });
    
    if (exhibitionsResponse.data) {
      const $ = cheerio.load(exhibitionsResponse.data);
      logger.info('Processing current and upcoming exhibitions');
      
      // Process exhibition listings
      $('.gallery-item, .exhibition, article, .item, [data-testid="gallery-item"]').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h1, h2, h3, h4, .title, [data-testid="title"]').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let exhibitUrl = $(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              `https://www.pendulumgallery.bc.ca${exhibitUrl.startsWith('/') ? '' : '/'}${exhibitUrl}` : 
              exhibitionsUrl;
          
          // Extract date
          let dateText = $(element).find('.date, time, .event-date, .meta, [data-testid="subtitle"]').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText) || 'Current exhibition';
          // Extract description
          let description = $(element).find('.description, .excerpt, .summary, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibition at Pendulum Gallery. Visit ${fullUrl} for more information.`;
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
              `https://www.pendulumgallery.bc.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
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
          
          logger.info({ event: { title, date: formattedDate } }, 'Found current/upcoming exhibition');
          events.push(exhibition);
        } catch (exhibitError) {
          logger.error({ error: exhibitError.message }, 'Error processing exhibition');
        }
      });
    }
    // Scrape past exhibitions
    logger.info('Fetching past exhibitions');
    const pastExhibitionsResponse = await axios.get(pastExhibitionsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching past exhibitions page');
      return { data: '' };
    });
    
    if (pastExhibitionsResponse.data) {
      const past$ = cheerio.load(pastExhibitionsResponse.data);
      logger.info('Processing past exhibitions');
      
      // Process past exhibition listings - limit to the most recent few
      past$('.gallery-item, .exhibition, article, .item, [data-testid="gallery-item"]').slice(0, 10).each((i, element) => {
        try {
          // Extract title
          const title = past$(element).find('h1, h2, h3, h4, .title, [data-testid="title"]').first().text().trim();
          if (!title) return;
          
          // Check for duplicates - don't add if we already have this exhibition
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          // Extract URL
          let exhibitUrl = past$(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              `https://www.pendulumgallery.bc.ca${exhibitUrl.startsWith('/') ? '' : '/'}${exhibitUrl}` : 
              pastExhibitionsUrl;
          
          // Extract date
          let dateText = past$(element).find('.date, time, .event-date, .meta, [data-testid="subtitle"]').text().trim();
          if (!dateText) {
            const text = past$(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText) || 'Past exhibition';
          
          // Extract description
          let description = past$(element).find('.description, .excerpt, .summary, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} past exhibition at Pendulum Gallery. Visit ${fullUrl} for more information.`;
          }
          
          // Extract image
          let imageUrl = past$(element).find('img').attr('src') || 
                        past$(element).find('img').attr('data-src') ||
                        past$(element).find('.image, .featured-image').attr('style');
          
          // Extract image URL from style attribute if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const imgMatch = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `https://www.pendulumgallery.bc.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
          
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
          
          logger.info({ event: { title, date: formattedDate } }, 'Found past exhibition');
          events.push(exhibition);
        } catch (pastExhibitError) {
          logger.error({ error: pastExhibitError.message }, 'Error processing past exhibition');
        }
      });
    }
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for exhibitions');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === exhibitionsUrl || events[i].url === pastExhibitionsUrl) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.entry-content, .content, article p, .description, main p').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information
            const betterDate = detail$('.date, time, .event-date, .meta, [data-testid="subtitle"]').first().text().trim();
            if (betterDate && betterDate.length > 5) {
              events[i].date = parseDate(betterDate) || events[i].date;
            }
            
            // Get better image
            const betterImage = detail$('.featured-image img, .main-image img, .gallery-item img').attr('src');
            if (betterImage) {
              events[i].image = betterImage.startsWith('http') ? 
                betterImage : 
                `https://www.pendulumgallery.bc.ca${betterImage.startsWith('/') ? '' : '/'}${betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Pendulum Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} exhibitions`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Pendulum Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}
