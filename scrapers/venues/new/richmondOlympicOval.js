/**
 * Richmond Olympic Oval Scraper
 * URL: https://richmondoval.ca/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Richmond Olympic Oval';
const url = 'https://richmondoval.ca/';
const eventsUrl = 'https://richmondoval.ca/events/';
const venueAddress = '6111 River Road';
const venueCity = 'Richmond';
const venueRegion = 'BC';
const venuePostalCode = 'V7C 0A2';
const venueCountry = 'Canada';

/**
 * Scrape events from Richmond Olympic Oval
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Richmond Olympic Oval scraper');

  try {
    const events = [];
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 30000
    };

    // Fetch events page
    logger.info('Fetching events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig).catch(() => ({ data: '' }));
    
    if (eventsResponse.data) {
      const $ = cheerio.load(eventsResponse.data);
      
      // Process event listings
      $('.event, .event-item, article, .post, .card').each((i, element) => {
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
          let dateText = $(element).find('.date, .event-date, time').text().trim();
          if (!dateText) {
            const text = $(element).text();
            const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s*[-–—]\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})?)/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Extract description
          let description = $(element).find('.description, .excerpt, p').text().trim();
          if (!description) {
            description = `${title} at Richmond Olympic Oval. Visit website for details.`;
          }
          
          // Extract image
          let imageUrl = $(element).find('img').attr('src') || 
                         $(element).find('img').attr('data-src');
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? 
              `https:${imageUrl}` : 
              `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
          }
          
          // Create event object
          events.push({
            title,
            date: dateText || 'Check website for dates',
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
          
          logger.info({ event: { title } }, 'Found event');
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event');
        }
      });
      
      // Look for events in structured listings
      $('.events-list, #events, .events-container').each((i, container) => {
        $(container).find('.item, .event-item, li').each((j, item) => {
          try {
            const title = $(item).find('h3, h4, .title').first().text().trim();
            if (!title) return;
            
            // Check for duplicates
            const isDuplicate = events.some(event => event.title === title);
            if (isDuplicate) return;
            
            let eventUrl = $(item).find('a').attr('href');
            const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
              eventUrl : 
              eventUrl ? 
                `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
                eventsUrl;
            
            let dateText = $(item).find('.date, time').text().trim();
            let description = $(item).find('p, .description').text().trim();
            
            events.push({
              title,
              date: dateText || 'Check website for dates',
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
            
            logger.info({ event: { title } }, 'Found event from structured listing');
          } catch (listError) {
            logger.error({ error: listError.message }, 'Error processing list item');
          }
        });
      });
    }
    
    // Check main page for featured events
    logger.info('Checking main page for featured events');
    const mainResponse = await axios.get(url, axiosConfig).catch(() => ({ data: '' }));
    
    if (mainResponse.data) {
      const main$ = cheerio.load(mainResponse.data);
      
      // Look for featured events
      main$('.featured, .highlight, .special-event, .hero, .cta').each((i, element) => {
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
          
          let description = main$(element).find('p, .description, .content').text().trim();
          if (!description) {
            description = `${title} at Richmond Olympic Oval. Visit website for details.`;
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
      
      // Check for news/events sections
      main$('section, .section, div').each((i, section) => {
        const heading = main$(section).find('h2, h3').first().text().toLowerCase();
        
        if (heading.includes('event') || heading.includes('program') || 
            heading.includes('tournament') || heading.includes('competition')) {
          
          main$(section).find('article, .item, .card').each((j, item) => {
            try {
              const title = main$(item).find('h3, h4, .title').first().text().trim();
              if (!title) return;
              
              // Check for duplicates
              const isDuplicate = events.some(event => event.title === title);
              if (isDuplicate) return;
              
              let eventUrl = main$(item).find('a').attr('href');
              const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
                eventUrl : 
                eventUrl ? 
                  `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
                  url;
              
              let description = main$(item).find('p, .description').text().trim();
              
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
              
              logger.info({ event: { title } }, 'Found event from content section on main page');
            } catch (itemError) {
              logger.error({ error: itemError.message }, 'Error processing section item');
            }
          });
        }
      });
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Richmond Olympic Oval, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Richmond Olympic Oval');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
