/**
 * Gulf of Georgia Cannery Scraper
 * URL: https://gulfofgeorgiacannery.org/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Gulf of Georgia Cannery';
const url = 'https://gulfofgeorgiacannery.org/';
const eventsUrl = 'https://gulfofgeorgiacannery.org/events/';
const exhibitsUrl = 'https://gulfofgeorgiacannery.org/exhibits/';
const venueAddress = '12138 Fourth Avenue';
const venueCity = 'Richmond';
const venueRegion = 'BC';
const venuePostalCode = 'V7E 3J1';
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
 * Scrape events from Gulf of Georgia Cannery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Gulf of Georgia Cannery scraper');

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
      
      // Process event listings
      $('.event, .event-item, article, .post, .card, .event-listing, .event-summary').each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, h4, .title, .event-title').first().text().trim();
          if (!title) return;
          
          // Extract URL
          let eventUrl = $(element).find('a').attr('href');
          const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
            eventUrl : 
            eventUrl ? 
              `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
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
          let description = $(element).find('.description, .excerpt, .summary, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} at Gulf of Georgia Cannery. Visit ${fullUrl} for more information.`;
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
      
      // If no events found using primary selectors, try alternative approach
      if (events.length === 0) {
        logger.info('No events found using primary selectors, trying alternative approach');
        
        // Look for events in content sections
        $('section, .section, .content, .entry-content, .page-content').each((i, section) => {
          const heading = $(section).find('h2, h3').first().text().toLowerCase();
          
          if (heading.includes('event') || heading.includes('program') || 
              heading.includes('workshop') || heading.includes('upcoming')) {
            
            $(section).find('li, .item, .event-item').each((j, item) => {
              try {
                const title = $(item).find('h3, h4, strong, .title').first().text().trim();
                if (!title) return;
                
                let eventUrl = $(item).find('a').attr('href');
                const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
                  eventUrl : 
                  eventUrl ? 
                    `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
                    eventsUrl;
                
                let dateText = $(item).find('.date, time').text().trim();
                if (!dateText) {
                  const itemText = $(item).text();
                  const dateMatch = itemText.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i);
                  if (dateMatch) dateText = dateMatch[0];
                }
                
                const formattedDate = parseDate(dateText);
                
                let description = $(item).find('p').text().trim();
                if (!description) {
                  description = $(item).text().replace(title, '').replace(dateText, '').trim();
                }
                
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
    
    // Scrape exhibits page
    logger.info('Fetching exhibits page');
    const exhibitsResponse = await axios.get(exhibitsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (exhibitsResponse.data) {
      const exhib$ = cheerio.load(exhibitsResponse.data);
      logger.info('Processing exhibits');
      
      // Process exhibit listings
      exhib$('.exhibit, .exhibition, article, .post, .card, .feature-item').each((i, element) => {
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
          
          // For exhibits, they're often permanent or may have specific dates
          let dateText = exhib$(element).find('.date, time').text().trim();
          if (!dateText || dateText.toLowerCase().includes('permanent')) {
            dateText = 'Permanent Exhibition';
          }
          
          // Extract description
          let description = exhib$(element).find('.description, .excerpt, p, .content').text().trim();
          if (!description || description.length < 10) {
            description = `${title} exhibit at Gulf of Georgia Cannery. Visit ${fullUrl} for more information.`;
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
            date: dateText !== 'Permanent Exhibition' ? parseDate(dateText) : dateText,
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
          
          logger.info({ event: { title, date: exhibit.date } }, 'Found exhibit');
          events.push(exhibit);
        } catch (exhibitError) {
          logger.error({ error: exhibitError.message }, 'Error processing exhibit');
        }
      });
    }
    
    // Check main page for special/featured events
    logger.info('Checking main page for featured events');
    const mainResponse = await axios.get(url, axiosConfig).catch(() => ({ data: '' }));
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured events or highlights
      main$('.featured, .highlight, .banner, .hero, .slider, .carousel, .home-feature').each((i, element) => {
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
              `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
              url;
          
          let dateText = main$(element).find('.date, time').text().trim();
          if (!dateText) {
            const text = main$(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          let description = main$(element).find('p, .description, .content').text().trim();
          if (!description) {
            description = `${title} at Gulf of Georgia Cannery. Visit website for details.`;
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
          
          logger.info({ event: { title } }, 'Found featured event from main page');
        } catch (featureError) {
          logger.error({ error: featureError.message }, 'Error processing featured content');
        }
      });
    }
    
    // Get more details for events by visiting individual pages (for up to 5 events)
    if (events.length > 0) {
      logger.info('Fetching additional details for events');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) {
        try {
          if (!events[i].url || events[i].url === eventsUrl || events[i].url === exhibitsUrl || events[i].url === url) {
            continue;
          }
          
          const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
          
          if (detailResponse.data) {
            const detail$ = cheerio.load(detailResponse.data);
            
            // Get better description
            const betterDescription = detail$('.content, .entry-content, article p, .description').text().trim();
            if (betterDescription && betterDescription.length > events[i].description.length) {
              events[i].description = betterDescription.substring(0, 300) + (betterDescription.length > 300 ? '...' : '');
            }
            
            // Get better date information if this is not a permanent exhibit
            if (events[i].date !== 'Permanent Exhibition' && events[i].date !== 'Check website for dates') {
              const betterDate = detail$('.date, time, .event-date').first().text().trim();
              if (betterDate && betterDate.length > 5) {
                events[i].date = parseDate(betterDate);
              }
            }
            
            // Get better image
            const betterImage = detail$('.featured-image img, .main-image img, .hero img, .image img').attr('src');
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
      logger.info('No events were found for Gulf of Georgia Cannery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events and exhibits`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Gulf of Georgia Cannery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
