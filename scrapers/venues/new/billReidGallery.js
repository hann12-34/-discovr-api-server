/**
 * Bill Reid Gallery Scraper
 * URL: https://www.billreidgallery.ca/pages/exhibitions-events
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Bill Reid Gallery of Northwest Coast Art';
const url = 'https://www.billreidgallery.ca/';
const eventsUrl = 'https://www.billreidgallery.ca/pages/exhibitions-events';
const venueAddress = '639 Hornby Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6C 2G3';
const venueCountry = 'Canada';

/**
 * Scrape events from Bill Reid Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Bill Reid Gallery scraper');

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

    // Fetch the exhibitions & events page
    logger.info('Fetching exhibitions & events page');
    const response = await axios.get(eventsUrl, axiosConfig);
    const $ = cheerio.load(response.data);
    const events = [];

    // Process exhibitions
    logger.info('Processing exhibitions');
    const exhibitionSections = $('.shopify-section').filter(function() {
      return $(this).find('h2, h3').text().toLowerCase().includes('exhibition') || 
             $(this).find('.section-header h1').text().toLowerCase().includes('exhibition');
    });

    exhibitionSections.each((i, section) => {
      const exhibitionElements = $(section).find('.grid-item, .collection-grid-item, .featured-collections__item, article');
      
      exhibitionElements.each((j, element) => {
        try {
          const title = $(element).find('h2, h3, .grid-product__title, .article__title').first().text().trim();
          
          if (!title) return; // Skip if no title found
          
          let detailUrl = $(element).find('a').attr('href');
          
          if (detailUrl) {
            // Make relative URLs absolute
            if (!detailUrl.startsWith('http')) {
              detailUrl = new URL(detailUrl, url).href;
            }
          } else {
            detailUrl = eventsUrl;
          }

          // Extract exhibition dates
          let dateText = $(element).find('.date, .event-date, time, .meta, .grid-product__meta').text().trim();
          let dateRange = dateText.match(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})(?:\s*[-–—]\s*|\s+to\s+|\s+until\s+)([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
          
          if (!dateRange) {
            dateRange = dateText.match(/([A-Z][a-z]+\s+\d{1,2})(?:\s*[-–—]\s*|\s+to\s+|\s+until\s+)([A-Z][a-z]+\s+\d{1,2}),?\s+(\d{4})/i);
            if (dateRange) {
              dateRange = [
                dateRange[0],
                `${dateRange[1]}, ${dateRange[3]}`,
                `${dateRange[2]}, ${dateRange[3]}`
              ];
            }
          }
          
          let startDate, endDate;
          const currentYear = new Date().getFullYear();
          
          if (dateRange) {
            try {
              startDate = dateRange[1];
              endDate = dateRange[2];
            } catch (dateError) {
              logger.warn({ dateText }, 'Could not parse exhibition date range');
            }
          } else {
            // Ongoing exhibition - set for current year
            startDate = `January 1, ${currentYear}`;
            endDate = `December 31, ${currentYear}`;
          }

          // Extract description
          let description = $(element).find('.rte, .grid-product__description, .article__excerpt, p').text().trim();
          if (!description) {
            description = `Exhibition at the ${name}.`;
          }

          // Extract image
          let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
          
          if (imageUrl && imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = new URL(imageUrl, url).href;
          }

          const exhibition = {
            title,
            date: `${startDate} - ${endDate}`,
            url: detailUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description,
            image: imageUrl
          };

          logger.info({ exhibition: { title, date: exhibition.date } }, 'Found exhibition');
          events.push(exhibition);
        } catch (exhibitionError) {
          logger.error({ error: exhibitionError.message }, 'Error processing exhibition');
        }
      });
    });

    // Process events (workshops, talks, etc.)
    logger.info('Processing events (workshops, talks, etc.)');
    const eventSections = $('.shopify-section').filter(function() {
      return $(this).find('h2, h3').text().toLowerCase().includes('event') || 
             $(this).find('.section-header h1').text().toLowerCase().includes('event') ||
             $(this).find('h2, h3').text().toLowerCase().includes('workshop') ||
             $(this).find('h2, h3').text().toLowerCase().includes('talk');
    });

    eventSections.each((i, section) => {
      const eventElements = $(section).find('.grid-item, .event-item, .article, article');
      
      eventElements.each((j, element) => {
        try {
          const title = $(element).find('h2, h3, .event-title, .article__title').first().text().trim();
          
          if (!title) return; // Skip if no title found
          
          let detailUrl = $(element).find('a').attr('href');
          
          if (detailUrl) {
            // Make relative URLs absolute
            if (!detailUrl.startsWith('http')) {
              detailUrl = new URL(detailUrl, url).href;
            }
          } else {
            detailUrl = eventsUrl;
          }

          // Extract event date and time
          let dateTimeText = $(element).find('.date, .event-date, time, .meta').text().trim();
          
          // Look for date pattern
          const dateMatch = dateTimeText.match(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})|([A-Z][a-z]+\s+\d{1,2})/i);
          let eventDate = dateMatch ? dateMatch[0] : null;
          
          if (eventDate && !eventDate.includes(',')) {
            // Add the current year if year is not included
            const currentYear = new Date().getFullYear();
            eventDate = `${eventDate}, ${currentYear}`;
          }
          
          // Look for time pattern
          const timeMatch = dateTimeText.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*[-–—to]*\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))?/i);
          let startTime = timeMatch ? timeMatch[1] : null;
          let endTime = timeMatch && timeMatch[2] ? timeMatch[2] : null;
          
          // Format full date string
          let dateString = eventDate || '';
          if (startTime) {
            dateString += dateString ? `, ${startTime}` : startTime;
            if (endTime) {
              dateString += ` - ${endTime}`;
            }
          }
          
          // If no date found, check other elements
          if (!dateString) {
            $(element).find('p, .rte, div').each((k, textEl) => {
              const text = $(textEl).text();
              const dateMatcher = text.match(/(?:on|date:?)\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
              const timeMatcher = text.match(/(?:at|time:?)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/i);
              
              if (dateMatcher && !eventDate) {
                eventDate = dateMatcher[1];
                dateString = eventDate;
              }
              
              if (timeMatcher && !startTime) {
                startTime = timeMatcher[1];
                dateString += dateString ? `, ${startTime}` : startTime;
              }
            });
          }
          
          // Default date if still not found
          if (!dateString) {
            const currentYear = new Date().getFullYear();
            dateString = `January 1, ${currentYear}, 10:00 AM`;
          }

          // Extract description
          let description = $(element).find('.rte, .description, .event-description, .article__excerpt, p').text().trim();
          if (!description) {
            description = `Event at the ${name}.`;
          }

          // Extract image
          let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
          
          if (imageUrl && imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = new URL(imageUrl, url).href;
          }

          const event = {
            title,
            date: dateString,
            url: detailUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description,
            image: imageUrl
          };

          logger.info({ event: { title, date: dateString } }, 'Found event');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event');
        }
      });
    });

    // If no events were found on the main page, check for upcoming events on individual pages
    if (events.length === 0) {
      logger.info('No events found on main page, checking individual pages');
      
      // Check the events page specifically
      try {
        const eventsPageResponse = await axios.get(`${url}collections/events`, axiosConfig)
          .catch(() => ({ data: '' }));
        
        if (eventsPageResponse.data) {
          const events$ = cheerio.load(eventsPageResponse.data);
          const eventItems = events$('.grid-item, .collection-item, article');
          
          eventItems.each((i, element) => {
            try {
              const title = events$(element).find('h2, h3, .title').text().trim();
              if (!title) return;
              
              let detailUrl = events$(element).find('a').attr('href');
              if (detailUrl && !detailUrl.startsWith('http')) {
                detailUrl = new URL(detailUrl, url).href;
              }
              
              // Extract whatever date information is available
              let dateText = events$(element).find('.date, time, .meta').text().trim();
              if (!dateText) {
                const currentYear = new Date().getFullYear();
                dateText = `${currentYear}`;
              }
              
              let description = events$(element).find('.rte, p, .description').text().trim();
              if (!description) {
                description = `Event at the ${name}.`;
              }
              
              let imageUrl = events$(element).find('img').attr('src') || events$(element).find('img').attr('data-src') || '';
              if (imageUrl && imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, url).href;
              }
              
              const event = {
                title,
                date: dateText,
                url: detailUrl || eventsUrl,
                venue: name,
                address: venueAddress,
                city: venueCity,
                region: venueRegion,
                postalCode: venuePostalCode,
                country: venueCountry,
                description,
                image: imageUrl
              };
              
              logger.info({ event: { title, date: dateText } }, 'Found event on events page');
              events.push(event);
            } catch (itemError) {
              logger.error({ error: itemError.message }, 'Error processing event item');
            }
          });
        }
      } catch (eventsPageError) {
        logger.error({ error: eventsPageError.message }, 'Error checking events page');
      }
    }

    // No fallback events - if no individual events were found, we return an empty array
    if (events.length === 0) {
      logger.info('No events were found for Bill Reid Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Bill Reid Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
