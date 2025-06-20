/**
 * Teck Gallery at SFU Vancouver Scraper
 * URL: https://www.sfu.ca/galleries/teck-gallery.html
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Teck Gallery';
const url = 'https://www.sfu.ca/galleries/teck-gallery.html';
const venueAddress = '515 West Hastings Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6B 5K3';
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
 * Scrape events from Teck Gallery at SFU Vancouver
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Teck Gallery scraper');

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
    
    // Scrape main gallery page
    logger.info('Fetching gallery page');
    const galleryResponse = await axios.get(url, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching gallery page');
      return { data: '' };
    });
    
    if (galleryResponse.data) {
      const $ = cheerio.load(galleryResponse.data);
      logger.info('Processing exhibitions');
      
      // Process current exhibition
      $('.exhibition, .component-content, .current-exhibition, .container article, .sfu-content').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h1, h2, h3, h4, .title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Extract URL - if there's a details page link
          let exhibitUrl = $(element).find('a').attr('href');
          const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
            exhibitUrl : 
            exhibitUrl ? 
              (exhibitUrl.startsWith('/') ? 
                `https://www.sfu.ca${exhibitUrl}` : 
                `https://www.sfu.ca/${exhibitUrl}`) : 
              url;
          
          // Extract date
          let dateText = $(element).find('.date, time, .event-date, .meta, .exhibition-date, .dates').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Parse the date
          const formattedDate = parseDate(dateText) || 'Current exhibition';
          
          // Extract description
          let description = $(element).find('p, .description, .content, .exhibition-info').text().trim();
          if (!description || description.length < 10) {
            description = `${title} at Teck Gallery, SFU Vancouver. Visit website for more information.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
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
              `https://www.sfu.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
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
      
      // Check for past exhibitions section if available
      $('.past-exhibitions, .past-events, .exhibition-archive').each((i, element) => {
        try {
          // Process each past exhibition item
          $(element).find('article, .exhibition-item, li, .past-item').each((j, pastItem) => {
            try {
              const title = $(pastItem).find('h1, h2, h3, h4, .title').first().text().trim();
              if (!title || title.length < 3) return;
              
              // Extract URL - if there's a details page link
              let exhibitUrl = $(pastItem).find('a').attr('href');
              const fullUrl = exhibitUrl && exhibitUrl.startsWith('http') ? 
                exhibitUrl : 
                exhibitUrl ? 
                  (exhibitUrl.startsWith('/') ? 
                    `https://www.sfu.ca${exhibitUrl}` : 
                    `https://www.sfu.ca/${exhibitUrl}`) : 
                  url;
              
              // Extract date
              let dateText = $(pastItem).find('.date, time, .event-date, .meta').text().trim();
              if (!dateText) {
                const text = $(pastItem).text();
                const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
                if (dateMatch) dateText = dateMatch[0];
              }
              
              // Parse the date
              const formattedDate = parseDate(dateText) || 'Past exhibition';
              
              // Check for duplicates
              const isDuplicate = events.some(event => event.title === title);
              if (isDuplicate) return;
              
              // Extract description (might not be available for past exhibitions)
              let description = $(pastItem).find('p, .description').text().trim();
              if (!description || description.length < 10) {
                description = `${title} was exhibited at Teck Gallery, SFU Vancouver.`;
              }
              
              // Extract image if available
              let imageUrl = $(pastItem).find('img').attr('src');
              
              // Make image URL absolute if needed
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('//') ? 
                  `https:${imageUrl}` : 
                  `https://www.sfu.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
              }
              
              events.push({
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
              });
              
              logger.info({ event: { title, date: formattedDate } }, 'Found past exhibition');
              
            } catch (pastItemError) {
              logger.error({ error: pastItemError.message }, 'Error processing past exhibition item');
            }
          });
        } catch (pastSectionError) {
          logger.error({ error: pastSectionError.message }, 'Error processing past exhibitions section');
        }
      });
    }
    
    // Try to find any events related to Teck Gallery from SFU's events page
    const eventsUrl = 'https://www.sfu.ca/galleries/events.html';
    logger.info('Checking SFU Galleries events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(error => {
      logger.error({ error: error.message }, 'Error fetching events page');
      return { data: '' };
    });
    
    if (eventsResponse.data) {
      const events$ = cheerio.load(eventsResponse.data);
      
      // Look for gallery events
      events$('.event, article, .event-item, .event-list-item').each((i, element) => {
        try {
          const eventText = events$(element).text().toLowerCase();
          // Only include events related to Teck Gallery
          if (!eventText.includes('teck') && !eventText.includes('harbour centre')) return;
          
          const title = events$(element).find('h1, h2, h3, h4, .title').first().text().trim();
          if (!title || title.length < 3) return;
          
          // Check for duplicates
          const isDuplicate = events.some(event => event.title === title);
          if (isDuplicate) return;
          
          let eventUrl = events$(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              (eventUrl.startsWith('/') ? 
                `https://www.sfu.ca${eventUrl}` : 
                `https://www.sfu.ca/${eventUrl}`) : 
              eventsUrl;
          
          let dateText = events$(element).find('.date, time, .event-date, .meta, .dates').text().trim();
          
          let description = events$(element).find('p, .description, .content, .event-description').text().trim();
          if (!description || description.length < 10) {
            description = `${title} event at Teck Gallery, SFU Vancouver. Visit website for details.`;
          }
          
          let imageUrl = events$(element).find('img').attr('src') || 
                         events$(element).find('.image').attr('style');
          
          // Extract image from style if needed
          if (imageUrl && imageUrl.includes('background-image')) {
            const match = imageUrl.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match) imageUrl = match[1];
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.sfu.ca${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
          }
          
          events.push({
            title,
            date: parseDate(dateText) || 'Gallery event',
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
          
          logger.info({ event: { title } }, 'Found gallery event');
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing gallery event');
        }
      });
    }
    
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events and exhibitions');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === url || events[i].url === eventsUrl) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.content, article p, .description, .main-content, .sfu-content').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information
            const betterDate = detail$('.date, time, .event-date, .meta, .dates').first().text().trim();
            if (betterDate && betterDate.length > 5) {
              events[i].date = parseDate(betterDate) || events[i].date;
            }
            
            // Get better image
            const betterImage = detail$('.featured-image img, .main-image img, .content img').first().attr('src');
            if (betterImage) {
              events[i].image = betterImage.startsWith('http') ? 
                betterImage : 
                `https://www.sfu.ca${betterImage.startsWith('/') ? betterImage : '/' + betterImage}`;
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Teck Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} exhibitions and events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Teck Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
