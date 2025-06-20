/**
 * Vancouver Convention Centre Scraper
 * URL: https://www.vancouverconventioncentre.com/events
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Vancouver Convention Centre';
const url = 'https://www.vancouverconventioncentre.com/';
const eventsUrl = 'https://www.vancouverconventioncentre.com/events';
const venueAddress = '1055 Canada Place';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6C 0C3';
const venueCountry = 'Canada';

/**
 * Scrape events from Vancouver Convention Centre
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Vancouver Convention Centre scraper');

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

    // Fetch the events page
    logger.info('Fetching events page');
    const response = await axios.get(eventsUrl, axiosConfig);
    const $ = cheerio.load(response.data);
    const events = [];

    // Process event listings
    logger.info('Processing event listings');
    const eventElements = $('.event-card, .event-item, .event, article');
    
    if (eventElements.length > 0) {
      eventElements.each((i, element) => {
        try {
          // Extract title
          const title = $(element).find('.event-card__title, .event-title, h2, h3').first().text().trim();
          if (!title) return; // Skip if no title
          
          // Extract URL
          let detailUrl = $(element).find('a').attr('href');
          if (detailUrl) {
            // Make relative URLs absolute
            if (!detailUrl.startsWith('http')) {
              if (detailUrl.startsWith('/')) {
                detailUrl = `${url.replace(/\/$/, '')}${detailUrl}`;
              } else {
                detailUrl = `${url.replace(/\/$/, '')}/${detailUrl}`;
              }
            }
          } else {
            detailUrl = eventsUrl;
          }
          
          // Extract date
          let dateText = $(element).find('.event-card__date, .event-date, .date, time').text().trim();
          
          // Try to parse various date formats
          let eventDate = '';
          
          if (dateText) {
            // Extract dates with multiple patterns
            const dateMatch = dateText.match(/([A-Z][a-z]+\s+\d{1,2}(?:\s*-\s*\d{1,2})?,?\s*\d{4})|([A-Z][a-z]+\s+\d{1,2}(?:\s*-\s*[A-Z][a-z]+\s+\d{1,2})?,?\s*\d{4})/i);
            
            if (dateMatch) {
              eventDate = dateMatch[0];
            } else {
              // Check for date range with shared month or year
              const rangeMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),?\s*(\d{4})/i);
              if (rangeMatch) {
                const month = rangeMatch[1];
                const startDay = rangeMatch[2];
                const endDay = rangeMatch[3];
                const year = rangeMatch[4];
                eventDate = `${month} ${startDay} - ${month} ${endDay}, ${year}`;
              }
            }
          }
          
          // If no valid date found, use a default
          if (!eventDate) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            const currentDay = new Date().getDate();
            eventDate = `${currentMonth} ${currentDay}, ${currentYear}`;
          }
          
          // Extract description
          let description = $(element).find('.event-card__description, .event-description, .description, p').text().trim();
          if (!description) {
            description = `${title} at the Vancouver Convention Centre. Check the event website for more details.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
          
          // Handle various image URL formats
          if (imageUrl) {
            if (imageUrl.startsWith('//')) {
              imageUrl = `https:${imageUrl}`;
            } else if (!imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, url).href;
            }
          }
          
          const event = {
            title,
            date: eventDate,
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
          
          logger.info({ event: { title, date: eventDate } }, 'Found event');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event');
        }
      });
    }

    // Look for upcoming events or more event information in other page sections
    if (events.length === 0) {
      logger.info('No events found in primary event list, checking alternative sections');
      
      // Look for event information in other sections
      $('.content-section, .section, .main-content').each((i, section) => {
        const sectionText = $(section).text().toLowerCase();
        
        // Check if section contains event information
        if (sectionText.includes('event') || sectionText.includes('exhibition') || sectionText.includes('conference')) {
          $(section).find('h2, h3, h4').each((j, heading) => {
            const headingText = $(heading).text().trim();
            
            // Skip navigation or empty headings
            if (!headingText || headingText.length < 5 || 
                headingText.toLowerCase().includes('menu') || 
                headingText.toLowerCase().includes('navigation')) {
              return;
            }
            
            // Find associated content for this heading
            const contentBlock = $(heading).nextUntil('h2, h3, h4').text().trim();
            if (!contentBlock) return;
            
            // Try to extract date information
            let dateText = '';
            
            // Look for date patterns in content
            const dateMatch = contentBlock.match(/([A-Z][a-z]+\s+\d{1,2}(?:\s*-\s*\d{1,2})?,?\s*\d{4})|([A-Z][a-z]+\s+\d{1,2}(?:\s*-\s*[A-Z][a-z]+\s+\d{1,2})?,?\s*\d{4})/i);
            
            if (dateMatch) {
              dateText = dateMatch[0];
            } else {
              // Default to current year
              const currentYear = new Date().getFullYear();
              dateText = `${currentYear}`;
            }
            
            // Extract image if available
            let imageUrl = '';
            const nearestImg = $(heading).nextUntil('h2, h3, h4').find('img').first().attr('src');
            if (nearestImg) {
              imageUrl = nearestImg.startsWith('http') ? nearestImg : new URL(nearestImg, url).href;
            }
            
            const event = {
              title: headingText,
              date: dateText,
              url: eventsUrl,
              venue: name,
              address: venueAddress,
              city: venueCity,
              region: venueRegion,
              postalCode: venuePostalCode,
              country: venueCountry,
              description: contentBlock.substring(0, 300) + (contentBlock.length > 300 ? '...' : ''),
              image: imageUrl
            };
            
            logger.info({ event: { title: headingText, date: dateText } }, 'Found event from content section');
            events.push(event);
          });
        }
      });
    }

    // Try to fetch more detailed event listings if still no events
    if (events.length === 0) {
      logger.info('Checking additional event sources');
      
      // Try the calendar page if it exists
      try {
        const calendarUrl = `${url}calendar`;
        const calendarResponse = await axios.get(calendarUrl, axiosConfig).catch(() => ({ data: '' }));
        
        if (calendarResponse.data) {
          const calendar$ = cheerio.load(calendarResponse.data);
          const calendarEvents = calendar$('.calendar-event, .event-item, .event');
          
          calendarEvents.each((i, element) => {
            try {
              const title = calendar$(element).find('.event-title, h2, h3').text().trim();
              if (!title) return;
              
              let eventDate = calendar$(element).find('.event-date, .date, time').text().trim();
              if (!eventDate) {
                const currentYear = new Date().getFullYear();
                eventDate = `${currentYear}`;
              }
              
              let detailUrl = calendar$(element).find('a').attr('href');
              if (detailUrl && !detailUrl.startsWith('http')) {
                detailUrl = new URL(detailUrl, url).href;
              }
              
              let description = calendar$(element).find('.event-description, .description, p').text().trim();
              if (!description) {
                description = `${title} at the Vancouver Convention Centre.`;
              }
              
              let imageUrl = calendar$(element).find('img').attr('src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, url).href;
              }
              
              const event = {
                title,
                date: eventDate,
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
              
              logger.info({ event: { title, date: eventDate } }, 'Found event from calendar');
              events.push(event);
            } catch (calendarEventError) {
              logger.error({ error: calendarEventError.message }, 'Error processing calendar event');
            }
          });
        }
      } catch (calendarError) {
        logger.error({ error: calendarError.message }, 'Error fetching calendar page');
      }
    }
    
    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Vancouver Convention Centre, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Vancouver Convention Centre');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
