/**
 * PNE Playland Scraper
 * URL: https://www.pne.ca/playland/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'PNE Playland';
const url = 'https://www.pne.ca/playland/';
const venueAddress = '2901 E Hastings St';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V5K 5J1';
const venueCountry = 'Canada';

/**
 * Scrape events from PNE Playland website
 * @returns {Array} Array of event objects
 */
async function scrape() {
  // Current date for finding events in current year
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting PNE Playland scraper');

  try {
    // Fetch the main page
    logger.info('Fetching main page');
    const response = await axios.get(url, { timeout: 10000 }).catch(err => {
      logger.error({ error: err.message }, 'Error fetching main page');
      return { data: '' };
    });
    
    if (!response.data) {
      logger.info('Failed to fetch page');
      return [];
    }
    const $ = cheerio.load(response.data);
    
    const events = [];
    
    // Advanced selectors to find events
    const eventSelectors = [
      '.event', '.calendar-event', '.event-item',
      '[class*="event"]', '.announcement', '.tribe-events-list-event',
      '.mc-events', '.card', '.programs-item'
    ];
    
    // Look for the playland season opening and special events
    
    // Try to find opening dates
    let seasonDates = '';
    const currentYear = new Date().getFullYear();
    const dateElements = $(`*:contains("${currentYear}")`).filter(function() {
      return $(this).text().match(/open[s]?\s+(?:from|on)?\s+(?:april|may|june|july|august|september|october|november|december)/i) ||
             $(this).text().match(/(202\d|\d{4})\s+season/i);
    });
    
    if (dateElements.length) {
      seasonDates = dateElements.first().text().trim();
      if (seasonDates.length > 200) {
        seasonDates = seasonDates.substring(0, 200) + '...';
      }
    }
    
    if (!seasonDates) {
      // Default information if nothing found
      const currentYear = new Date().getFullYear();
      seasonDates = `May to September ${currentYear}`;
    }
    
    // Try to find pricing information
    let pricingInfo = '';
    const priceElements = $('*:contains("tickets")').filter(function() {
      return $(this).text().match(/pricing|ticket[s]?\s+(?:price|cost|from|are|start)/i);
    });
    
    if (priceElements.length) {
      pricingInfo = priceElements.first().text().trim();
      if (pricingInfo.length > 200) {
        pricingInfo = pricingInfo.substring(0, 200) + '...';
      }
    }
    
    // Get images
    let imageUrl = '';
    const potentialImages = $('img[src*="playland"], img[src*="pne"], img[src*="rides"]').first();
    
    if (potentialImages.length) {
      imageUrl = potentialImages.attr('src') || potentialImages.attr('data-src') || '';
      
      // Make relative URLs absolute
      if (imageUrl && !imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('/')) {
          imageUrl = new URL(imageUrl, url).href;
        } else {
          imageUrl = new URL('/' + imageUrl, url).href;
        }
      }
    }
    
    // Create main season event
    const seasonEvent = {
      title: `Playland ${new Date().getFullYear()} Season`,
      date: seasonDates,
      url: url,
      venue: name,
      address: venueAddress,
      city: venueCity,
      region: venueRegion,
      postalCode: venuePostalCode,
      country: venueCountry,
      description: `Playland is Vancouver's iconic amusement park featuring exhilarating rides and attractions for all ages. ${seasonDates} ${pricingInfo}`,
      image: imageUrl,
      cost: pricingInfo || 'Check website for ticket pricing'
    };
    
    logger.info({ event: seasonEvent }, 'Found main season event');
    events.push(seasonEvent);
    
    // Look for special events at Playland
    // First check if there's an events page or section
    const eventsLinks = $('a[href*="events"], a:contains("Events"), a:contains("Calendar"), a:contains("What\'s On")');
    
    if (eventsLinks.length) {
      try {
        // Also check for additional event URLs
        const additionalEventUrls = ['https://www.pne.ca/events/', 'https://www.pne.ca/fair/', 'https://www.pne.ca/playland/events/'];
        
        const eventsLink = eventsLinks.first().attr('href');
        let eventsUrl = eventsLink;
        
        // Make relative URLs absolute
        if (!eventsUrl.startsWith('http')) {
          if (eventsUrl.startsWith('/')) {
            eventsUrl = new URL(eventsUrl, url).href;
          } else {
            eventsUrl = new URL('/' + eventsUrl, url).href;
          }
        }
        
        logger.info(`Fetching events page: ${eventsUrl}`);
        const eventsResponse = await axios.get(eventsUrl, { timeout: 10000 }).catch(err => {
          logger.error({ error: err.message }, 'Error fetching events page');
          return { data: '' };
        });
        
        if (!eventsResponse.data) {
          logger.warn('Events page fetch failed, skipping events extraction');
          return;
        }
        const events$ = cheerio.load(eventsResponse.data);
        
        const eventElements = events$('.event, article, .event-item, div[class*="event"], .card, .item').filter(function() {
          // Filter out elements that don't look like event cards
          return events$(this).find('h2, h3, h4, .title, .date').length > 0;
        });
        
        if (eventElements.length) {
          eventElements.each((i, element) => {
            try {
              const el = events$(element);
              
              // Extract event details
              let title = el.find('h2, h3, h4, .title, .event-title').first().text().trim();
              let date = el.find('.date, time, [class*="date"]').first().text().trim();
              let description = el.find('p, .description, .excerpt, .content').text().trim();
              
              // Limit description length
              if (description.length > 300) {
                description = description.substring(0, 300) + '...';
              }
              
              let eventUrl = el.find('a').attr('href') || url;
              
              // Make relative URLs absolute
              if (!eventUrl.startsWith('http')) {
                if (eventUrl.startsWith('/')) {
                  eventUrl = new URL(eventUrl, url).href;
                } else {
                  eventUrl = new URL('/' + eventUrl, url).href;
                }
              }
              
              // Find image
              let eventImage = el.find('img').attr('src') || '';
              
              // Make relative URLs absolute
              if (eventImage && !eventImage.startsWith('http')) {
                if (eventImage.startsWith('/')) {
                  eventImage = new URL(eventImage, url).href;
                } else {
                  eventImage = new URL('/' + eventImage, url).href;
                }
              }
              
              // If we have title and date, create an event
              if (title && date) {
                const specialEvent = {
                  title: title,
                  date: date,
                  url: eventUrl,
                  venue: name,
                  address: venueAddress,
                  city: venueCity,
                  region: venueRegion,
                  postalCode: venuePostalCode,
                  country: venueCountry,
                  description: description,
                  image: eventImage
                };
                
                logger.info({ event: specialEvent }, 'Found special event');
                events.push(specialEvent);
              }
            } catch (err) {
              logger.error({ error: err.message }, 'Error processing event element');
            }
          });
        }
      } catch (err) {
        logger.error({ error: err.message }, 'Error fetching events page');
      }
    }
    
    // Look for Fright Nights (or Halloween event) specifically if it's a popular event
    const frightNightElements = $('*:contains("Fright Nights"), *:contains("Halloween")');
    
    if (frightNightElements.length) {
      try {
        const frightElement = frightNightElements.first();
        let frightTitle = frightElement.find('h2, h3, h4, .title').text().trim();
        if (!frightTitle) {
          frightTitle = 'Fright Nights at PNE';
        }
        
        let frightDate = 'October 2025';
        const dateMatch = frightElement.text().match(/([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s*[-–—]\s*[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*202[5-6])/);
        if (dateMatch) {
          frightDate = dateMatch[1];
        }
        
        let frightDescription = frightElement.find('p, .description').text().trim();
        if (!frightDescription) {
          frightDescription = 'Fright Nights transforms Playland into a terrifying Halloween experience with haunted houses and frightening rides.';
        }
        
        let frightImage = frightElement.find('img').attr('src') || $('img[src*="fright"], img[src*="halloween"]').first().attr('src') || '';
        
        // Make relative URLs absolute
        if (frightImage && !frightImage.startsWith('http')) {
          if (frightImage.startsWith('/')) {
            frightImage = new URL(frightImage, url).href;
          } else {
            frightImage = new URL('/' + frightImage, url).href;
          }
        }
        
        const frightEvent = {
          title: frightTitle,
          date: frightDate,
          url: url + '#fright-nights',
          venue: name,
          address: venueAddress,
          city: venueCity,
          region: venueRegion,
          postalCode: venuePostalCode,
          country: venueCountry,
          description: frightDescription,
          image: frightImage
        };
        
        logger.info({ event: frightEvent }, 'Found Fright Nights event');
        events.push(frightEvent);
      } catch (err) {
        logger.error({ error: err.message }, 'Error processing Fright Nights event');
      }
    }
    
    logger.info(`Found ${events.length} events`);
    return events;
    // Try to get events calendar from the PNE site (might be separate from Playland)
    try {
      const calendarUrl = 'https://www.pne.ca/events/';
      logger.info(`Checking PNE calendar page: ${calendarUrl}`);
      
      const calendarResponse = await axios.get(calendarUrl, { timeout: 10000 }).catch(err => {
        logger.warn(`Calendar fetch failed: ${err.message}`);
        return { data: '' };
      });
      
      if (calendarResponse.data) {
        const calendar$ = cheerio.load(calendarResponse.data);
        const calendarEvents = calendar$('.event-item, article, .calendar-event, .event');
        
        if (calendarEvents.length > 0) {
          logger.info(`Found ${calendarEvents.length} calendar events`);
          
          calendarEvents.each((i, element) => {
            try {
              const el = calendar$(element);
              
              let title = el.find('h2, h3, .title, .event-title').first().text().trim();
              let date = el.find('.date, time, .event-date').first().text().trim();
              let description = el.find('p, .description, .excerpt').text().trim();
              let eventUrl = el.find('a').attr('href') || calendarUrl;
              
              // Make relative URLs absolute
              if (!eventUrl.startsWith('http')) {
                if (eventUrl.startsWith('/')) {
                  eventUrl = new URL(eventUrl, 'https://www.pne.ca').href;
                } else {
                  eventUrl = new URL('/' + eventUrl, 'https://www.pne.ca').href;
                }
              }
              
              // Find image
              let eventImage = el.find('img').attr('src') || '';
              
              // Make relative URLs absolute
              if (eventImage && !eventImage.startsWith('http')) {
                if (eventImage.startsWith('/')) {
                  eventImage = new URL(eventImage, 'https://www.pne.ca').href;
                } else {
                  eventImage = new URL('/' + eventImage, 'https://www.pne.ca').href;
                }
              }
              
              // If we have title and date, create an event
              if (title && date) {
                const calEvent = {
                  title: title,
                  date: date,
                  url: eventUrl,
                  venue: name,
                  address: venueAddress,
                  city: venueCity,
                  region: venueRegion,
                  postalCode: venuePostalCode,
                  country: venueCountry,
                  description: description || `${title} at PNE/Playland.`,
                  image: eventImage
                };
                
                logger.info({ event: calEvent }, 'Found calendar event');
                events.push(calEvent);
              }
            } catch (err) {
              logger.error({ error: err.message }, 'Error processing calendar event');
            }
          });
        }
      }
    } catch (calendarError) {
      logger.error({ error: calendarError.message }, 'Error fetching calendar page');
    }
    
    // Log if no events were found
    if (events.length === 0) {
      logger.info('No events found');
    }
    
    logger.info(`Found ${events.length} events`);
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping PNE Playland');
    return [];
  }
}



module.exports = {
  name,
  url,
  scrape
};
