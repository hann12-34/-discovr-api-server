/**
 * Science World Scraper
 * URL: https://www.scienceworld.ca/events/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Science World';
const url = 'https://www.scienceworld.ca/';
const eventsUrl = 'https://www.scienceworld.ca/events/';
const todayUrl = 'https://www.scienceworld.ca/today/events/';
const venueAddress = '1455 Quebec Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6A 3Z7';
const venueCountry = 'Canada';

/**
 * Scrape events from Science World
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Science World scraper');

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

    // Try to fetch events from both the main events page and today's events page
    const events = [];
    
    // First, fetch the main events page
    logger.info('Fetching main events page');
    const eventsResponse = await axios.get(eventsUrl, axiosConfig);
    const events$ = cheerio.load(eventsResponse.data);
    
    logger.info('Processing events from main page');
    const eventItems = events$('.event-item, .events-list article, .event-teaser, .event-card');
    
    eventItems.each((i, element) => {
      try {
        // Extract event title
        const title = events$(element).find('h2, h3, h4, .event-title, .title').first().text().trim();
        if (!title) return; // Skip if no title
        
        // Extract event URL
        let eventUrl = events$(element).find('a').attr('href');
        if (!eventUrl) return; // Skip if no URL
        
        // Make relative URLs absolute
        const fullUrl = eventUrl.startsWith('http') ? eventUrl : `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}`;
        
        // Extract date information
        let dateText = events$(element).find('.date, .event-date, time').text().trim();
        if (!dateText) {
          dateText = events$(element).text().match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
          if (dateText) dateText = dateText[0];
        }
        
        // Extract description
        let description = events$(element).find('.description, .event-description, p').first().text().trim();
        if (!description || description.length < 10) {
          description = `Event at Science World. Visit ${fullUrl} for more information.`;
        }
        
        // Extract image
        let imageURL = events$(element).find('img').attr('src') || events$(element).find('img').attr('data-src') || '';
        
        // Make image URL absolute if needed
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `${url}${imageURL.startsWith('/') ? imageURL.substring(1) : imageURL}`;
        }
        
        const event = {
          title,
          date: dateText || 'Check website for dates',
          url: fullUrl,
          venue: name,
          address: venueAddress,
          city: venueCity,
          region: venueRegion,
          postalCode: venuePostalCode,
          country: venueCountry,
          description,
          image: imageURL
        };
        
        logger.info({ event: { title, date: dateText } }, 'Found event from main events page');
        events.push(event);
      } catch (eventError) {
        logger.error({ error: eventError.message }, 'Error processing event from main page');
      }
    });
    
    // Next, fetch today's events page for additional events
    logger.info('Fetching today\'s events page');
    const todayResponse = await axios.get(todayUrl, axiosConfig);
    const today$ = cheerio.load(todayResponse.data);
    
    logger.info('Processing events from today\'s page');
    const todayEventItems = today$('.event-item, .today-event-listing, article');
    
    todayEventItems.each((i, element) => {
      try {
        // Extract event title
        const title = today$(element).find('h2, h3, h4, .event-title, .title').first().text().trim();
        if (!title) return; // Skip if no title
        
        // Check if this is a duplicate of an event we already found
        const isDuplicate = events.some(existingEvent => existingEvent.title === title);
        if (isDuplicate) return; // Skip duplicates
        
        // Extract event URL
        let eventUrl = today$(element).find('a').attr('href');
        
        // Make relative URLs absolute
        const fullUrl = eventUrl && eventUrl.startsWith('http') ? 
          eventUrl : 
          eventUrl ? 
            `${url}${eventUrl.startsWith('/') ? eventUrl.substring(1) : eventUrl}` : 
            todayUrl;
        
        // Extract date and time information
        let dateText = today$(element).find('.date, .event-date, time').text().trim();
        if (!dateText) {
          dateText = today$(element).text().match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
          if (dateText) dateText = dateText[0];
        }
        
        // Extract time information
        let timeText = today$(element).find('.time, .event-time').text().trim();
        if (timeText) {
          dateText = dateText ? `${dateText}, ${timeText}` : timeText;
        }
        
        // If still no date, use today's date
        if (!dateText) {
          const today = new Date();
          const options = { year: 'numeric', month: 'long', day: 'numeric' };
          dateText = today.toLocaleDateString('en-US', options);
        }
        
        // Extract description
        let description = today$(element).find('.description, .event-description, p').first().text().trim();
        if (!description || description.length < 10) {
          description = `Event at Science World. Visit ${fullUrl} for more information.`;
        }
        
        // Extract image
        let imageURL = today$(element).find('img').attr('src') || today$(element).find('img').attr('data-src') || '';
        
        // Make image URL absolute if needed
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `${url}${imageURL.startsWith('/') ? imageURL.substring(1) : imageURL}`;
        }
        
        const event = {
          title,
          date: dateText,
          url: fullUrl,
          venue: name,
          address: venueAddress,
          city: venueCity,
          region: venueRegion,
          postalCode: venuePostalCode,
          country: venueCountry,
          description,
          image: imageURL
        };
        
        logger.info({ event: { title, date: dateText } }, 'Found event from today\'s events page');
        events.push(event);
      } catch (todayEventError) {
        logger.error({ error: todayEventError.message }, 'Error processing event from today\'s page');
      }
    });
    
    // Check for featured events or exhibitions that might not be in the regular listings
    logger.info('Checking for featured events or exhibitions');
    const featuredSections = events$('section, .featured, .featured-content, .exhibitions')
      .add(today$('section, .featured, .featured-content, .exhibitions'));
    
    featuredSections.each((i, section) => {
      try {
        const sectionHeading = events$(section).find('h2, h3').first().text().trim().toLowerCase();
        
        // Check if this section has exhibition or featured event content
        if (sectionHeading.includes('exhibit') || sectionHeading.includes('feature') || sectionHeading.includes('special')) {
          events$(section).find('article, .item, .exhibition-item').each((j, item) => {
            try {
              // Extract title
              const title = events$(item).find('h2, h3, h4, .title').first().text().trim();
              if (!title) return;
              
              // Check for duplicates
              const isDuplicate = events.some(existingEvent => existingEvent.title === title);
              if (isDuplicate) return;
              
              // Extract URL
              let itemUrl = events$(item).find('a').attr('href');
              const fullUrl = itemUrl && itemUrl.startsWith('http') ? 
                itemUrl : 
                itemUrl ? 
                  `${url}${itemUrl.startsWith('/') ? itemUrl.substring(1) : itemUrl}` : 
                  eventsUrl;
              
              // Extract date
              let dateText = events$(item).find('.date, time').text().trim();
              if (!dateText) {
                // Extract date from surrounding text
                const contentText = events$(item).text();
                const dateMatch = contentText.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
                if (dateMatch) dateText = dateMatch[0];
              }
              
              // For exhibitions without specific dates, use a range
              if (!dateText && sectionHeading.includes('exhibit')) {
                const currentYear = new Date().getFullYear();
                dateText = `January 1, ${currentYear} - December 31, ${currentYear}`;
              }
              
              // Extract description
              let description = events$(item).find('.description, p').text().trim();
              if (!description || description.length < 10) {
                description = `${title} at Science World. Visit ${fullUrl} for more details.`;
              }
              
              // Extract image
              let imageUrl = events$(item).find('img').attr('src') || events$(item).find('img').attr('data-src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
              }
              
              const featuredEvent = {
                title,
                date: dateText || 'Ongoing exhibition',
                url: fullUrl,
                venue: name,
                address: venueAddress,
                city: venueCity,
                region: venueRegion,
                postalCode: venuePostalCode,
                country: venueCountry,
                description,
                image: imageUrl
              };
              
              logger.info({ event: { title, date: dateText } }, 'Found featured event or exhibition');
              events.push(featuredEvent);
            } catch (featuredItemError) {
              logger.error({ error: featuredItemError.message }, 'Error processing featured item');
            }
          });
        }
      } catch (sectionError) {
        logger.error({ error: sectionError.message }, 'Error processing featured section');
      }
    });

    // Get more details for each event by visiting their individual pages
    if (events.length > 0) {
      logger.info('Fetching additional details for events');
      
      for (let i = 0; i < Math.min(events.length, 5); i++) { // Limit to 5 to avoid too many requests
        try {
          if (events[i].url && events[i].url !== eventsUrl && events[i].url !== todayUrl) {
            const detailResponse = await axios.get(events[i].url, axiosConfig).catch(() => ({ data: '' }));
            
            if (detailResponse.data) {
              const detail$ = cheerio.load(detailResponse.data);
              
              // Get better description
              const betterDescription = detail$('.event-content, .event-body, .content, article p').text().trim();
              if (betterDescription && betterDescription.length > events[i].description.length) {
                events[i].description = betterDescription.substring(0, 500) + (betterDescription.length > 500 ? '...' : '');
              }
              
              // Get better date information
              const betterDate = detail$('.event-date, .date, time').first().text().trim();
              if (betterDate && betterDate.length > 5) {
                events[i].date = betterDate;
              }
              
              // Get better image
              const betterImage = detail$('.hero img, .featured-image img, .banner img').first().attr('src');
              if (betterImage) {
                events[i].image = betterImage.startsWith('http') ? betterImage : `${url}${betterImage.startsWith('/') ? betterImage.substring(1) : betterImage}`;
              }
            }
          }
        } catch (detailError) {
          logger.error({ error: detailError.message }, `Error fetching details for ${events[i].title}`);
        }
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Science World, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Science World');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
