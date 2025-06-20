/**
 * Vancouver Lookout Scraper
 * URL: https://vancouverlookout.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Vancouver Lookout';
const url = 'https://vancouverlookout.com/';
const eventsUrl = 'https://vancouverlookout.com/events/';
const venueAddress = '555 W Hastings St';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V6B 4N6';
const venueCountry = 'Canada';

/**
 * Scrape events from Vancouver Lookout
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Vancouver Lookout scraper');

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

    // Fetch the main page first (they may not have a dedicated events page)
    logger.info('Fetching main page');
    const mainResponse = await axios.get(url, axiosConfig);
    const main$ = cheerio.load(mainResponse.data);
    
    const events = [];
    
    // Look for events on main page first
    logger.info('Looking for events on main page');
    const mainPageEvents = main$('.events, .event-section, .promotions, .special-events').find('.event, .card, article');
    
    if (mainPageEvents.length > 0) {
      mainPageEvents.each((i, element) => {
        try {
          // Extract title
          const title = main$(element).find('h2, h3, h4, .title').first().text().trim();
          if (!title) return; // Skip if no title
          
          // Extract URL
          let detailUrl = main$(element).find('a').attr('href');
          
          // Make URL absolute if needed
          const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
            detailUrl : 
            detailUrl ? 
              `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
              url;
          
          // Extract date
          let dateText = main$(element).find('.date, time').text().trim();
          if (!dateText) {
            // Look for date patterns in the text
            const elementText = main$(element).text();
            const dateMatch = elementText.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Extract description
          let description = main$(element).find('.description, p').text().trim();
          
          // Ensure description has reasonable content
          if (!description || description.length < 10) {
            description = `${title} at Vancouver Lookout. Visit ${fullUrl} for more details.`;
          }
          
          // Extract image
          let imageUrl = main$(element).find('img').attr('src') || '';
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
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
            image: imageUrl
          };
          
          logger.info({ event: { title, date: dateText } }, 'Found event on main page');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event from main page');
        }
      });
    }

    // Try to fetch a dedicated events page if it exists
    let events$ = null;
    try {
      logger.info('Attempting to fetch dedicated events page');
      const eventsResponse = await axios.get(eventsUrl, axiosConfig);
      events$ = cheerio.load(eventsResponse.data);
    } catch (eventsPageError) {
      logger.info('No dedicated events page found or error accessing it');
    }
    
    // Process events from dedicated events page if it exists
    if (events$) {
      logger.info('Processing events from dedicated events page');
      const dedicatedPageEvents = events$('.event, .card, article, .event-listing');
      
      dedicatedPageEvents.each((i, element) => {
        try {
          // Extract title
          const title = events$(element).find('h2, h3, h4, .title').first().text().trim();
          if (!title) return; // Skip if no title
          
          // Check for duplicates
          const isDuplicate = events.some(existingEvent => existingEvent.title === title);
          if (isDuplicate) return;
          
          // Extract URL
          let detailUrl = events$(element).find('a').attr('href');
          
          // Make URL absolute if needed
          const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
            detailUrl : 
            detailUrl ? 
              `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
              eventsUrl;
          
          // Extract date
          let dateText = events$(element).find('.date, time').text().trim();
          if (!dateText) {
            // Look for date patterns in the text
            const elementText = events$(element).text();
            const dateMatch = elementText.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})|(\d{1,2}\s+[A-Za-z]+,?\s*\d{4})/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Extract description
          let description = events$(element).find('.description, p').text().trim();
          
          // Ensure description has reasonable content
          if (!description || description.length < 10) {
            description = `${title} at Vancouver Lookout. Visit ${fullUrl} for more details.`;
          }
          
          // Extract image
          let imageUrl = events$(element).find('img').attr('src') || '';
          
          // Make image URL absolute if needed
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
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
            image: imageUrl
          };
          
          logger.info({ event: { title, date: dateText } }, 'Found event on dedicated events page');
          events.push(event);
        } catch (eventError) {
          logger.error({ error: eventError.message }, 'Error processing event from dedicated events page');
        }
      });
    }
    
    // Look for special sections or announcements on the main page
    const specialSections = main$('section, .section, .featured, .special');
    
    specialSections.each((i, section) => {
      try {
        const sectionHeading = main$(section).find('h2, h3').first().text().trim().toLowerCase();
        
        // Only process sections that might contain events or special information
        if (sectionHeading.includes('event') || sectionHeading.includes('special') || 
            sectionHeading.includes('featured') || sectionHeading.includes('promotion')) {
          
          // Process items within this section
          main$(section).find('article, .item, .card').each((j, item) => {
            try {
              // Extract title
              const title = main$(item).find('h2, h3, h4, .title').first().text().trim() || sectionHeading;
              
              // Check for duplicates
              const isDuplicate = events.some(existingEvent => existingEvent.title === title);
              if (isDuplicate) return;
              
              // Extract URL
              let detailUrl = main$(item).find('a').attr('href');
              
              // Make URL absolute if needed
              const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                detailUrl : 
                detailUrl ? 
                  `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                  url;
              
              // Extract description
              let description = main$(item).find('p, .description').text().trim();
              if (!description || description.length < 10) {
                description = `${title} at Vancouver Lookout. Visit ${fullUrl} for more details.`;
              }
              
              // Extract image
              let imageUrl = main$(item).find('img').attr('src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
              }
              
              const event = {
                title,
                date: 'Check website for dates', // Since special sections often don't have clear dates
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
              
              logger.info({ event: { title } }, 'Found special feature or promotion');
              events.push(event);
            } catch (itemError) {
              logger.error({ error: itemError.message }, 'Error processing special section item');
            }
          });
        }
      } catch (sectionError) {
        logger.error({ error: sectionError.message }, 'Error processing special section');
      }
    });
    
    // Also scan blog or news sections which might contain event information
    const newsLink = main$('a[href*="news"], a[href*="blog"]').first().attr('href');
    
    if (newsLink) {
      try {
        logger.info('Checking news/blog section for events');
        const newsUrl = newsLink.startsWith('http') ? newsLink : `${url}${newsLink.startsWith('/') ? newsLink.substring(1) : newsLink}`;
        
        const newsResponse = await axios.get(newsUrl, axiosConfig);
        const news$ = cheerio.load(newsResponse.data);
        
        const newsItems = news$('article, .post, .news-item');
        
        newsItems.each((i, item) => {
          try {
            // Only process recent items (first 3)
            if (i >= 3) return;
            
            const title = news$(item).find('h2, h3, h4, .title').first().text().trim();
            if (!title) return;
            
            // Check if title suggests event content
            if (title.toLowerCase().includes('event') || title.toLowerCase().includes('special') || 
                title.toLowerCase().includes('celebration') || title.toLowerCase().includes('promotion')) {
              
              // Check for duplicates
              const isDuplicate = events.some(existingEvent => existingEvent.title === title);
              if (isDuplicate) return;
              
              let detailUrl = news$(item).find('a').attr('href');
              const fullUrl = detailUrl && detailUrl.startsWith('http') ? 
                detailUrl : 
                detailUrl ? 
                  `${url}${detailUrl.startsWith('/') ? detailUrl.substring(1) : detailUrl}` : 
                  newsUrl;
              
              let description = news$(item).find('p, .excerpt, .description').text().trim();
              if (!description || description.length < 10) {
                description = `${title} at Vancouver Lookout. Visit ${fullUrl} for more details.`;
              }
              
              let imageUrl = news$(item).find('img').attr('src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${url}${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
              }
              
              const event = {
                title,
                date: 'See website for details',
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
              
              logger.info({ event: { title } }, 'Found potential event in news/blog');
              events.push(event);
            }
          } catch (newsItemError) {
            logger.error({ error: newsItemError.message }, 'Error processing news item');
          }
        });
      } catch (newsError) {
        logger.error({ error: newsError.message }, 'Error processing news/blog');
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Vancouver Lookout, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Vancouver Lookout');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
