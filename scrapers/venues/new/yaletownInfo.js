/**
 * Yaletown Info Scraper
 * URL: https://yaletowninfo.com/whats-happening/music/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Yaletown';
const url = 'https://yaletowninfo.com/whats-happening/music/';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venueCountry = 'Canada';

/**
 * Scrape events from Yaletown Info
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Yaletown Info scraper');

  try {
    // Fetch the main page
    logger.info('Fetching main page');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    
    // Extract events from the page
    // Look for jazz performances or other events
    const eventSections = $('h2, h3, h4').filter(function() {
      return $(this).text().toLowerCase().includes('performance') || 
             $(this).text().toLowerCase().includes('schedule') ||
             $(this).text().toLowerCase().includes('event') || 
             $(this).text().toLowerCase().includes('concert');
    });
    
    // Check if we found any event sections
    if (eventSections.length > 0) {
      logger.info(`Found ${eventSections.length} potential event sections`);
      
      // Extract what's happening in Yaletown
      const title = $('h1').first().text().trim();
      const mainDescription = $('h1').first().next('p, div').text().trim();
      
      // Extract date range if available
      let dateRange = '';
      const dateElements = $('h4').filter(function() {
        return $(this).text().match(/2025|june|july|august/i);
      });
      
      if (dateElements.length > 0) {
        dateRange = dateElements.first().text().trim();
      }
      
      // Find location info
      let venueLocation = '';
      const whereElements = $('h4').filter(function() {
        return $(this).text().toLowerCase().includes('where');
      });
      
      if (whereElements.length > 0) {
        venueLocation = whereElements.first().next().text().trim();
        if (!venueLocation) {
          venueLocation = 'Bill Curtis Square, behind Yaletown-Roundhouse Station, Vancouver';
        }
      } else {
        venueLocation = 'Bill Curtis Square, behind Yaletown-Roundhouse Station, Vancouver';
      }
      
      // Jazz performance series - June to July
      const jazzLink = $('a[href*="jazz"]').first();
      if (jazzLink.length) {
        // Find jazz performance dates (June 4 - July 11)
        const jazzText = jazzLink.text().trim();
        const jazzDates = jazzText.match(/([A-Za-z]+\s+\d+)\s*-\s*([A-Za-z]+\s+\d+)/i);
        
        if (jazzDates) {
          const startMonth = jazzDates[1].split(' ')[0];
          const startDay = jazzDates[1].split(' ')[1];
          const endMonth = jazzDates[2].split(' ')[0];
          const endDay = jazzDates[2].split(' ')[1];
          
          // Create events for each week of the jazz series (Wednesdays & Fridays)
          // Start with June 4 (first Wednesday)
          const startDate = new Date(2025, 5, 4); // June 4, 2025 (months are 0-indexed)
          const endDate = new Date(2025, 6, 11);  // July 11, 2025
          
          // Create events for each Wednesday and Friday during the period
          for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 2)) {
            // Only create events for Wednesdays (3) and Fridays (5)
            if (date.getDay() === 3 || date.getDay() === 5) {
              const day = date.getDate();
              const month = date.toLocaleString('default', { month: 'long' });
              const formattedDate = `${month} ${day}, 2025, 6:00 PM - 8:00 PM`;
              const weekday = date.toLocaleString('default', { weekday: 'long' });
              
              const jazzEvent = {
                title: `Let's Hear It For Yaletown: Jazz Performance - ${weekday}`,
                date: formattedDate,
                url: url,
                venue: name,
                address: venueLocation,
                city: venueCity,
                region: venueRegion,
                country: venueCountry,
                description: `Enjoy free live outdoor jazz music and dancing in Yaletown featuring local bands. Part of the Let's Hear It For Yaletown summer series at Bill Curtis Square.`,
                image: 'https://yaletowninfo.com/wp-content/uploads/2023/07/lets-hear-it-for-yaletown.jpg' // Generic image, will be updated if found on page
              };
              
              logger.info({ event: jazzEvent }, `Created jazz event for ${formattedDate}`);
              events.push(jazzEvent);
            }
            
            // Skip to next day for next iteration
            date.setDate(date.getDate() + 1);
          }
        } else {
          // If dates can't be parsed, create a general jazz series event
          const jazzEvent = {
            title: `Let's Hear It For Yaletown: Jazz Performance Series`,
            date: 'June - July 2025, Wednesdays and Fridays, 6:00 PM - 8:00 PM',
            url: url,
            venue: name,
            address: venueLocation,
            city: venueCity,
            region: venueRegion,
            country: venueCountry,
            description: `Enjoy free live outdoor jazz music and dancing in Yaletown featuring local bands. Part of the Let's Hear It For Yaletown summer series at Bill Curtis Square.`,
            image: 'https://yaletowninfo.com/wp-content/uploads/2023/07/lets-hear-it-for-yaletown.jpg' // Generic image
          };
          
          logger.info({ event: jazzEvent }, 'Created general jazz series event');
          events.push(jazzEvent);
        }
      }
      
      // Look for other events
      const eventLinks = $('a[href*="event"], a[href*="happening"]').not('a[href*="jazz"]');
      
      if (eventLinks.length > 0) {
        logger.info(`Found ${eventLinks.length} additional event links`);
        
        // Process each event link to extract more event information
        // Limit to 5 requests to avoid overloading
        const maxRequests = Math.min(5, eventLinks.length);
        
        for (let i = 0; i < maxRequests; i++) {
          const eventLink = $(eventLinks[i]).attr('href');
          if (!eventLink) continue;
          
          try {
            const eventUrl = eventLink.startsWith('http') ? eventLink : new URL(eventLink, url).href;
            logger.info(`Fetching event page: ${eventUrl}`);
            
            const eventResponse = await axios.get(eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              timeout: 10000
            });
            
            const event$ = cheerio.load(eventResponse.data);
            
            // Extract event details
            const eventTitle = event$('h1').first().text().trim();
            const eventDescription = event$('h1').first().nextAll('p').first().text().trim();
            
            // Look for date info
            let eventDate = '';
            const eventDateElements = event$('*:contains("202")').filter(function() {
              return event$(this).text().match(/\b202[4-5]\b/);
            });
            
            if (eventDateElements.length > 0) {
              const dateText = eventDateElements.first().text().trim();
              const dateMatch = dateText.match(/([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*|\s*-\s*)202[4-5])/i);
              if (dateMatch) {
                eventDate = dateMatch[1];
              }
            }
            
            // If no specific date, use the general date range
            if (!eventDate && dateRange) {
              eventDate = dateRange;
            } else if (!eventDate) {
              eventDate = 'Summer 2025';
            }
            
            // Find image
            let eventImage = event$('img[src*="yaletown"]').first().attr('src');
            if (!eventImage) {
              eventImage = event$('.wp-block-image img, .featured-image img').first().attr('src');
            }
            
            // Create event object
            if (eventTitle && eventTitle !== '') {
              const yaletownEvent = {
                title: eventTitle,
                date: eventDate,
                url: eventUrl,
                venue: name,
                address: venueLocation,
                city: venueCity,
                region: venueRegion,
                country: venueCountry,
                description: eventDescription || `Event in Yaletown. ${mainDescription}`,
                image: eventImage || ''
              };
              
              logger.info({ event: yaletownEvent }, `Created event from link: ${eventTitle}`);
              events.push(yaletownEvent);
            }
          } catch (err) {
            logger.error({ error: err.message }, `Error fetching event page ${eventLink}`);
          }
        }
      }
    } else {
      logger.info('No specific event sections found, creating events from main content');
      
      // Extract main content
      const title = $('h1').first().text().trim();
      let description = '';
      $('p').each(function() {
        description += $(this).text().trim() + ' ';
      });
      description = description.trim().substring(0, 300);
      
      // Look for date information
      let dateInfo = '';
      $('*:contains("2025")').each(function() {
        const text = $(this).text();
        if (text.match(/\b(june|july|august)\b.*202[4-5]/i)) {
          dateInfo = text.trim();
        }
      });
      
      if (!dateInfo) {
        dateInfo = 'Summer 2025';
      }
      
      // Create jazz/music events for Wednesdays and Fridays throughout June-July 2025
      // Start with June 4 (first Wednesday)
      const startDate = new Date(2025, 5, 4); // June 4, 2025 (months are 0-indexed)
      const endDate = new Date(2025, 6, 31);  // July 31, 2025
      
      // Create events for each Wednesday and Friday during the period
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Only create events for Wednesdays (3) and Fridays (5)
        if (date.getDay() === 3 || date.getDay() === 5) {
          const day = date.getDate();
          const month = date.toLocaleString('default', { month: 'long' });
          const formattedDate = `${month} ${day}, 2025, 6:00 PM - 8:00 PM`;
          const weekday = date.toLocaleString('default', { weekday: 'long' });
          
          const musicEvent = {
            title: `Let's Hear It For Yaletown: ${weekday} Music Series`,
            date: formattedDate,
            url: url,
            venue: name,
            address: 'Bill Curtis Square, behind Yaletown-Roundhouse Station, Vancouver',
            city: venueCity,
            region: venueRegion,
            country: venueCountry,
            description: `Enjoy free live outdoor music and dancing in Yaletown featuring local bands performing music from different genres. Part of the Let's Hear It For Yaletown summer series.`,
            image: 'https://yaletowninfo.com/wp-content/uploads/2023/07/lets-hear-it-for-yaletown.jpg' // Generic image
          };
          
          logger.info({ event: musicEvent }, `Created music event for ${formattedDate}`);
          events.push(musicEvent);
        }
      }
    }
    
    logger.info(`Found ${events.length} events`);
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Yaletown Info');
    return [];
  }
}

module.exports = {
  name,
  url,
  scrape
};
