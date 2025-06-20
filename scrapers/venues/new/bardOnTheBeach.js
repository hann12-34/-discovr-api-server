/**
 * Bard on the Beach Shakespeare Festival Scraper
 * URL: https://bardonthebeach.org/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Bard on the Beach Shakespeare Festival';
const url = 'https://bardonthebeach.org/';
const venueAddress = 'Vanier Park, 1695 Whyte Avenue';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6J 3P9';
const venueCountry = 'Canada';

/**
 * Scrape events from Bard on the Beach Shakespeare Festival
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Bard on the Beach scraper');

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

    // Fetch the whats-on page for performances
    logger.info('Fetching the whats-on page');
    const whatsOnUrl = `${url}whats-on/`;
    const response = await axios.get(whatsOnUrl, axiosConfig);
    const $ = cheerio.load(response.data);
    const events = [];
    
    // Look for individual productions/plays
    logger.info('Processing productions');
    const productionElements = $('.production-item, .season-item, article, .show-item');
    
    if (productionElements.length > 0) {
      productionElements.each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('h2, h3, .title').first().text().trim();
          if (!title) return; // Skip if no title found
          
          // Extract URL for details
          let detailUrl = $(element).find('a').attr('href');
          if (detailUrl && !detailUrl.startsWith('http')) {
            detailUrl = new URL(detailUrl, url).href;
          }
          
          // Extract performance dates - typically for season (June-September)
          let dateText = $(element).find('.dates, .season-dates, .schedule, .performance-dates').text().trim();
          
          // Parse date ranges
          let startDate, endDate;
          let dateRange = dateText.match(/([A-Za-z]+\s+\d{1,2})\s*[-–—]\s*([A-Za-z]+\s+\d{1,2}),\s*(\d{4})/i);
          
          if (dateRange) {
            // Format: "June 8 - September 23, 2025"
            const year = dateRange[3];
            startDate = `${dateRange[1]}, ${year}`;
            endDate = `${dateRange[2]}, ${year}`;
          } else {
            // Try alternate format
            dateRange = dateText.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})\s*[-–—]\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
            if (dateRange) {
              startDate = dateRange[1];
              endDate = dateRange[2];
            } else {
              // Default to summer season
              const currentYear = new Date().getFullYear();
              startDate = `June 1, ${currentYear}`;
              endDate = `September 30, ${currentYear}`;
            }
          }
          
          // Extract description
          let description = $(element).find('.description, .summary, p').text().trim();
          if (!description) {
            description = `${title} at Bard on the Beach Shakespeare Festival. Experience world-class Shakespeare in Vancouver's Vanier Park.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = new URL(imageUrl, url).href;
          }
          
          // Create production event
          const production = {
            title,
            date: `${startDate} - ${endDate}`,
            url: detailUrl || whatsOnUrl,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description,
            image: imageUrl
          };
          
          logger.info({ production: { title, date: production.date } }, 'Found production');
          events.push(production);
        } catch (productionError) {
          logger.error({ error: productionError.message }, 'Error processing production');
        }
      });
    }
    
    // If no productions found, check the calendar for specific performances
    if (events.length === 0) {
      logger.info('No productions found on main page, checking calendar');
      try {
        // Fetch calendar page
        const calendarUrl = `${url}calendar/`;
        const calendarResponse = await axios.get(calendarUrl, axiosConfig).catch(() => ({ data: '' }));
        
        if (calendarResponse.data) {
          const calendar$ = cheerio.load(calendarResponse.data);
          const performanceItems = calendar$('.event-item, .calendar-event, .performance');
          
          performanceItems.each((i, element) => {
            try {
              // Extract performance info
              const title = calendar$(element).find('h2, h3, .event-title, .title').first().text().trim();
              if (!title) return;
              
              // Extract date and time
              let dateText = calendar$(element).find('.date, .event-date, .datetime').text().trim();
              let dateMatch = dateText.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i);
              let timeMatch = dateText.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
              
              let performanceDate = '';
              if (dateMatch) {
                performanceDate = dateMatch[0];
              } else {
                // Default to current year
                const currentYear = new Date().getFullYear();
                performanceDate = `June 15, ${currentYear}`;
              }
              
              let performanceTime = '';
              if (timeMatch) {
                performanceTime = timeMatch[0];
                performanceDate += `, ${performanceTime}`;
              }
              
              // Extract URL
              let detailUrl = calendar$(element).find('a').attr('href');
              if (detailUrl && !detailUrl.startsWith('http')) {
                detailUrl = new URL(detailUrl, url).href;
              }
              
              // Extract description
              let description = calendar$(element).find('.description, .summary, p').text().trim();
              if (!description) {
                description = `${title} performance at Bard on the Beach Shakespeare Festival. Experience world-class Shakespeare in Vancouver's Vanier Park.`;
              }
              
              // Extract image
              let imageUrl = calendar$(element).find('img').attr('src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, url).href;
              }
              
              const performance = {
                title,
                date: performanceDate,
                url: detailUrl || calendarUrl,
                venue: name,
                address: venueAddress,
                city: venueCity,
                region: venueRegion,
                postalCode: venuePostalCode,
                country: venueCountry,
                description,
                image: imageUrl
              };
              
              logger.info({ performance: { title, date: performanceDate } }, 'Found performance from calendar');
              events.push(performance);
            } catch (performanceError) {
              logger.error({ error: performanceError.message }, 'Error processing calendar performance');
            }
          });
        }
      } catch (calendarError) {
        logger.error({ error: calendarError.message }, 'Error checking calendar page');
      }
    }
    
    // Check for special events
    logger.info('Checking for special events');
    try {
      const specialEventsUrl = `${url}special-events/`;
      const specialEventsResponse = await axios.get(specialEventsUrl, axiosConfig).catch(() => ({ data: '' }));
      
      if (specialEventsResponse.data) {
        const specialEvents$ = cheerio.load(specialEventsResponse.data);
        const specialEventItems = specialEvents$('.event-item, .special-event, article');
        
        specialEventItems.each((i, element) => {
          try {
            // Extract special event info
            const title = specialEvents$(element).find('h2, h3, .title').first().text().trim();
            if (!title) return;
            
            // Extract date
            let dateText = specialEvents$(element).find('.date, .event-date, .datetime').text().trim();
            if (!dateText) {
              const currentYear = new Date().getFullYear();
              dateText = `Summer ${currentYear}`;
            }
            
            // Extract URL
            let detailUrl = specialEvents$(element).find('a').attr('href');
            if (detailUrl && !detailUrl.startsWith('http')) {
              detailUrl = new URL(detailUrl, url).href;
            }
            
            // Extract description
            let description = specialEvents$(element).find('.description, .summary, p').text().trim();
            if (!description) {
              description = `Special event: ${title} at Bard on the Beach Shakespeare Festival.`;
            }
            
            // Extract image
            let imageUrl = specialEvents$(element).find('img').attr('src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, url).href;
            }
            
            const specialEvent = {
              title,
              date: dateText,
              url: detailUrl || specialEventsUrl,
              venue: name,
              address: venueAddress,
              city: venueCity,
              region: venueRegion,
              postalCode: venuePostalCode,
              country: venueCountry,
              description,
              image: imageUrl
            };
            
            logger.info({ specialEvent: { title, date: dateText } }, 'Found special event');
            events.push(specialEvent);
          } catch (specialEventError) {
            logger.error({ error: specialEventError.message }, 'Error processing special event');
          }
        });
      }
    } catch (specialEventsError) {
      logger.error({ error: specialEventsError.message }, 'Error checking special events page');
    }
    
    // Try to fetch specific event URLs from main shows
    if (events.length > 0) {
      logger.info('Fetching more details from event pages');
      
      for (let i = 0; i < events.length; i++) {
        if (events[i].url && events[i].url !== whatsOnUrl && events[i].url !== url) {
          try {
            const detailResponse = await axios.get(events[i].url, axiosConfig)
              .catch(() => ({ data: '' }));
            
            if (detailResponse.data) {
              const detail$ = cheerio.load(detailResponse.data);
              
              // Get better dates if available
              const betterDates = detail$('.dates, .schedule, .calendar, .performance-dates').first().text().trim();
              if (betterDates) {
                events[i].date = betterDates;
              }
              
              // Get better description if available
              const betterDescription = detail$('.description, .summary, .content p').text().trim();
              if (betterDescription && betterDescription.length > events[i].description.length) {
                events[i].description = betterDescription;
              }
              
              // Get better image if available
              const betterImage = detail$('.hero img, .featured-image img, .banner img').attr('src');
              if (betterImage && betterImage.includes('full')) {
                if (betterImage.startsWith('http')) {
                  events[i].image = betterImage;
                } else {
                  events[i].image = new URL(betterImage, url).href;
                }
              }
            }
          } catch (detailError) {
            logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
          }
        }
      }
    }

    // No fallback events - if no individual events were found, return an empty array
    if (events.length === 0) {
      logger.info('No events were found for Bard on the Beach, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Bard on the Beach Shakespeare Festival');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
