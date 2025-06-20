/**
 * Surrey Art Gallery Scraper
 * URL: https://www.surrey.ca/arts-culture/surrey-art-gallery/exhibitions
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Surrey Art Gallery';
const url = 'https://www.surrey.ca/arts-culture/surrey-art-gallery';
const exhibitionsUrl = 'https://www.surrey.ca/arts-culture/surrey-art-gallery/exhibitions';
const eventsUrl = 'https://www.surrey.ca/arts-culture/surrey-art-gallery/events';
const venueAddress = '13750 88 Avenue';
const venueCity = 'Surrey';
const venueRegion = 'BC';
const venuePostalCode = 'V3W 3L1';
const venueCountry = 'Canada';

/**
 * Scrape events from Surrey Art Gallery
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Surrey Art Gallery scraper');

  try {
    // Configure axios with headers to mimic a browser
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    };

    const events = [];

    // Fetch and process exhibitions
    logger.info('Fetching exhibitions page');
    const exhibitionsResponse = await axios.get(exhibitionsUrl, axiosConfig);
    const exhibitions$ = cheerio.load(exhibitionsResponse.data);
    
    // Process current exhibitions
    logger.info('Processing current exhibitions');
    const exhibitionItems = exhibitions$('.views-row, .card-item, article');
    
    exhibitionItems.each((i, element) => {
      try {
        const title = exhibitions$(element).find('h2, h3, .card__title, .views-field-title a').first().text().trim();
        if (!title) return; // Skip if no title
        
        let detailUrl = exhibitions$(element).find('a').attr('href');
        if (detailUrl && !detailUrl.startsWith('http')) {
          if (detailUrl.startsWith('/')) {
            detailUrl = `https://www.surrey.ca${detailUrl}`;
          } else {
            detailUrl = `https://www.surrey.ca/${detailUrl}`;
          }
        }
        
        // Extract exhibition dates
        let dateText = exhibitions$(element).find('.date, .field-date, .views-field-field-dates, .daterange').text().trim();
        if (!dateText) {
          // Look for date patterns in any text
          exhibitions$(element).find('p, div').each((j, textElement) => {
            const text = exhibitions$(textElement).text();
            if (text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}\b/i)) {
              dateText = text;
            }
          });
        }
        
        let startDate, endDate;
        const currentYear = new Date().getFullYear();
        
        if (dateText) {
          // Extract date range using regex
          const dateRange = dateText.match(/([a-z]+ \d{1,2},? \d{4})\s*[-–—]?\s*([a-z]+ \d{1,2},? \d{4})/i);
          if (dateRange) {
            startDate = dateRange[1];
            endDate = dateRange[2];
          } else {
            // Check for dates with shared year
            const sharedYearRange = dateText.match(/([a-z]+ \d{1,2})\s*[-–—]\s*([a-z]+ \d{1,2},? \d{4})/i);
            if (sharedYearRange) {
              // Extract the year from the second date
              const yearMatch = sharedYearRange[2].match(/\d{4}/);
              if (yearMatch) {
                const year = yearMatch[0];
                startDate = `${sharedYearRange[1]}, ${year}`;
                endDate = sharedYearRange[2];
              }
            }
          }
        }
        
        if (!startDate || !endDate) {
          // Default to current year exhibition if dates not found
          startDate = `January 1, ${currentYear}`;
          endDate = `December 31, ${currentYear}`;
        }
        
        // Extract description
        let description = exhibitions$(element).find('.field-body, .views-field-body, p').first().text().trim();
        if (!description) {
          description = `Exhibition at the ${name}.`;
        }
        
        // Extract image
        let imageUrl = exhibitions$(element).find('img').attr('src') || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('/')) {
            imageUrl = `https://www.surrey.ca${imageUrl}`;
          } else {
            imageUrl = `https://www.surrey.ca/${imageUrl}`;
          }
        }
        
        const exhibition = {
          title,
          date: `${startDate} - ${endDate}`,
          url: detailUrl || exhibitionsUrl,
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
    
    // Fetch and process events (workshops, talks, etc.)
    logger.info('Fetching events page');
    try {
      const eventsResponse = await axios.get(eventsUrl, axiosConfig);
      const events$ = cheerio.load(eventsResponse.data);
      
      logger.info('Processing events');
      const eventItems = events$('.views-row, .event-item, article');
      
      eventItems.each((i, element) => {
        try {
          const title = events$(element).find('h2, h3, .event-title, .views-field-title a').first().text().trim();
          if (!title) return; // Skip if no title
          
          let detailUrl = events$(element).find('a').attr('href');
          if (detailUrl && !detailUrl.startsWith('http')) {
            if (detailUrl.startsWith('/')) {
              detailUrl = `https://www.surrey.ca${detailUrl}`;
            } else {
              detailUrl = `https://www.surrey.ca/${detailUrl}`;
            }
          }
          
          // Extract event date and time
          let dateText = events$(element).find('.date, .field-date, .views-field-field-date, time').text().trim();
          if (!dateText) {
            events$(element).find('p, div').each((j, textElement) => {
              const text = events$(textElement).text();
              if (text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}\b/i)) {
                dateText = text;
              }
            });
          }
          
          // Try to parse the date and time
          let eventDate = '';
          let startTime = '';
          let endTime = '';
          
          if (dateText) {
            // Extract date
            const dateMatch = dateText.match(/([a-z]+ \d{1,2},? \d{4})/i);
            if (dateMatch) {
              eventDate = dateMatch[1];
            }
            
            // Extract time
            const timeMatch = dateText.match(/(\d{1,2}(?::\d{2})? (?:am|pm))\s*[-–—]?\s*(\d{1,2}(?::\d{2})? (?:am|pm))?/i);
            if (timeMatch) {
              startTime = timeMatch[1];
              endTime = timeMatch[2] || '';
            }
          }
          
          // Format the date string
          let dateString = eventDate || '';
          if (startTime) {
            dateString += `, ${startTime}`;
            if (endTime) {
              dateString += ` - ${endTime}`;
            }
          }
          
          // Default date if still not found
          if (!dateString) {
            const currentYear = new Date().getFullYear();
            dateString = `January 1, ${currentYear}`;
          }
          
          // Extract description
          let description = events$(element).find('.field-body, .views-field-body, .summary, p').first().text().trim();
          if (!description) {
            description = `Event at the ${name}.`;
          }
          
          // Extract image
          let imageUrl = events$(element).find('img').attr('src') || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('/')) {
              imageUrl = `https://www.surrey.ca${imageUrl}`;
            } else {
              imageUrl = `https://www.surrey.ca/${imageUrl}`;
            }
          }
          
          const event = {
            title,
            date: dateString,
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
          
          logger.info({ event: { title, date: dateString } }, 'Found event');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event');
        }
      });
    } catch (eventsPageError) {
      logger.error({ error: eventsPageError.message }, 'Error fetching events page');
    }

    // Attempt to get upcoming programs and events if still no events found
    if (events.length === 0) {
      logger.info('Attempting to find events from programs page');
      try {
        const programsUrl = 'https://www.surrey.ca/arts-culture/surrey-art-gallery/programs-and-events';
        const programsResponse = await axios.get(programsUrl, axiosConfig);
        const programs$ = cheerio.load(programsResponse.data);
        
        const programItems = programs$('.views-row, .event-item, article, .program-item');
        
        programItems.each((i, element) => {
          try {
            const title = programs$(element).find('h2, h3, .title a').first().text().trim();
            if (!title) return;
            
            let detailUrl = programs$(element).find('a').attr('href');
            if (detailUrl && !detailUrl.startsWith('http')) {
              if (detailUrl.startsWith('/')) {
                detailUrl = `https://www.surrey.ca${detailUrl}`;
              } else {
                detailUrl = `https://www.surrey.ca/${detailUrl}`;
              }
            }
            
            // Try to find date information
            let dateText = programs$(element).find('.date, time, .field-date').text().trim();
            
            // Default to current year if no date found
            if (!dateText) {
              const currentYear = new Date().getFullYear();
              dateText = `${currentYear}`;
            }
            
            // Extract description
            let description = programs$(element).find('.field-body, .description, .summary, p').text().trim();
            if (!description) {
              description = `Program at the ${name}.`;
            }
            
            // Extract image
            let imageUrl = programs$(element).find('img').attr('src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/')) {
                imageUrl = `https://www.surrey.ca${imageUrl}`;
              } else {
                imageUrl = `https://www.surrey.ca/${imageUrl}`;
              }
            }
            
            const program = {
              title,
              date: dateText,
              url: detailUrl || programsUrl,
              venue: name,
              address: venueAddress,
              city: venueCity,
              region: venueRegion,
              postalCode: venuePostalCode,
              country: venueCountry,
              description,
              image: imageUrl
            };
            
            logger.info({ program: { title, date: dateText } }, 'Found program');
            events.push(program);
          } catch (programError) {
            logger.error({ error: programError.message }, 'Error processing program');
          }
        });
      } catch (programsPageError) {
        logger.error({ error: programsPageError.message }, 'Error fetching programs page');
      }
    }

    // No fallback events - if no individual events were found, return an empty array
    if (events.length === 0) {
      logger.info('No events were found for Surrey Art Gallery, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Surrey Art Gallery');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
