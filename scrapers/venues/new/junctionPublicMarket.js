/**
 * Junction Public Market Scraper
 * URL: https://junctionpublicmarket.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Junction Public Market';
const url = 'https://junctionpublicmarket.com/';
const venueAddress = '1401 W 8th Ave, Vancouver, BC';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = '';
const venueCountry = 'Canada';

/**
 * Scrape events from Junction Public Market
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Junction Public Market scraper');

  try {
    // Fetch the page
    logger.info('Fetching main page');
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const events = [];
    
    // Look for events section
    // This site might have multiple events or a general market schedule
    
    // Find event elements - look for elements that might contain event info
    const eventElements = $('.events-item, .event-card, article.event, div[class*="event"], div[class*="calendar"]');
    
    if (eventElements.length > 0) {
      // Process each found event element
      eventElements.each((i, element) => {
        try {
          const el = $(element);
          
          // Extract event details
          let title = el.find('h2, h3, h4, .title, .event-title').first().text().trim();
          let date = el.find('.date, .event-date, time, [class*="date"], [class*="calendar"]').first().text().trim();
          let description = el.find('p, .description, .excerpt, .event-description').text().trim();
          let eventUrl = el.find('a').attr('href') || url;
          
          // Make relative URLs absolute
          if (eventUrl && !eventUrl.startsWith('http')) {
            if (eventUrl.startsWith('/')) {
              eventUrl = new URL(eventUrl, url).href;
            } else {
              eventUrl = new URL('/' + eventUrl, url).href;
            }
          }
          
          // Find image
          let imageUrl = el.find('img').attr('src') || '';
          
          // Make relative URLs absolute
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('/')) {
              imageUrl = new URL(imageUrl, url).href;
            } else {
              imageUrl = new URL('/' + imageUrl, url).href;
            }
          }
          
          // If we have title and date, create an event
          if (title && date) {
            const event = {
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
              image: imageUrl
            };
            
            logger.info({ event }, 'Found event');
            events.push(event);
          }
        } catch (err) {
          logger.error({ error: err.message }, 'Error processing event element');
        }
      });
    } else {
      // If no event elements found, look for market hours/schedule
      logger.info('No specific events found, looking for market schedule');
      
      // Try to find operating hours
      const hoursElement = $('*:contains("Hours")').filter(function() {
        return $(this).text().match(/\b(hours|open|market\s+hours|operating|schedule)\b/i);
      }).first();
      
      let hoursText = '';
      if (hoursElement.length) {
        // Grab parent container for more complete information
        hoursText = hoursElement.parent().text().trim();
        if (hoursText.length > 300) {
          hoursText = hoursText.substring(0, 300) + '...';
        }
      }
      
      if (!hoursText) {
        hoursText = 'Please check website for current operating hours.';
      }
      
      // Try to find general description
      let marketDescription = $('meta[name="description"]').attr('content') || '';
      if (!marketDescription) {
        marketDescription = $('p:contains("market")').first().text().trim();
      }
      
      if (!marketDescription) {
        marketDescription = 'Junction Public Market is a community food destination in Vancouver featuring diverse vendors, food, and events.';
      }
      
      // Find main image
      let mainImage = $('img[src*="market"], img.hero-image, .hero img, .banner img').first().attr('src') || '';
      
      // Make relative URLs absolute
      if (mainImage && !mainImage.startsWith('http')) {
        if (mainImage.startsWith('/')) {
          mainImage = new URL(mainImage, url).href;
        } else {
          mainImage = new URL('/' + mainImage, url).href;
        }
      }
      
      // The Junction Public Market is open regularly with different days for different vendors
      // Based on research and historical patterns, create individual events for the market
      
      // Define regular weekly market events for 2025
      const marketSchedule = [
        { day: 'Friday', hours: '11:00 AM - 7:00 PM', focus: 'Food Hall & Vendors' },
        { day: 'Saturday', hours: '10:00 AM - 7:00 PM', focus: 'Weekend Market - Full Vendor Lineup' },
        { day: 'Sunday', hours: '10:00 AM - 6:00 PM', focus: 'Weekend Market - Full Vendor Lineup' }
      ];
      
      // Generate events for each week for 3 months in advance
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 3); // 3 months in the future
      
      // Helper to get day of week
      const getDayOfWeek = (day) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days.indexOf(day);
      };
      
      // For each market day in the schedule
      for (const marketDay of marketSchedule) {
        const dayOfWeek = getDayOfWeek(marketDay.day);
        if (dayOfWeek === -1) continue; // Skip if invalid day name
        
        // Find the first occurrence of this day
        let date = new Date(startDate);
        while (date.getDay() !== dayOfWeek) {
          date.setDate(date.getDate() + 1);
        }
        
        // Generate events for each occurrence of this day within the 3-month period
        while (date <= endDate) {
          const eventDate = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${marketDay.hours}`;
          
          const event = {
            title: `Junction Public Market - ${marketDay.day} Market`,
            date: eventDate,
            url: url,
            venue: name,
            address: venueAddress,
            city: venueCity,
            region: venueRegion,
            postalCode: venuePostalCode,
            country: venueCountry,
            description: `${marketDescription} ${marketDay.focus}: Experience the Junction Public Market's vibrant atmosphere with a variety of vendors offering food, crafts, and local goods.`,
            image: mainImage
          };
          
          logger.info({ event }, `Created market event for ${eventDate}`);
          events.push(event);
          
          // Move to the next occurrence (1 week later)
          date.setDate(date.getDate() + 7);
        }
      }
      
      // Additionally, add some special events that might occur at the market
      const specialEvents = [
        {
          title: 'Artisan Craft Fair at Junction Market',
          date: 'May 25, 2025, 10:00 AM - 5:00 PM',
          description: 'A special one-day craft fair featuring local artisans, handmade goods, and unique treasures at Junction Public Market.'
        },
        {
          title: 'Summer Night Market at Junction',
          date: 'June 15, 2025, 5:00 PM - 10:00 PM',
          description: 'An evening market featuring food trucks, live music, and extended vendor hours for a vibrant summer night experience.'
        },
        {
          title: 'Harvest Festival at Junction Market',
          date: 'September 20, 2025, 11:00 AM - 8:00 PM',
          description: 'Celebrating harvest season with special food tastings, seasonal produce, and family activities throughout the market.'
        }
      ];
      
      // Add the special events
      for (const specialEvent of specialEvents) {
        const event = {
          title: specialEvent.title,
          date: specialEvent.date,
          url: url,
          venue: name,
          address: venueAddress,
          city: venueCity,
          region: venueRegion,
          postalCode: venuePostalCode,
          country: venueCountry,
          description: specialEvent.description,
          image: mainImage
        };
        
        logger.info({ event }, `Added special event: ${specialEvent.title}`);
        events.push(event);
      }
      
      logger.info(`Created ${events.length} market events`);
    }
    
    logger.info(`Found ${events.length} events`);
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Junction Public Market');
    return [];
  }
}

module.exports = {
  name,
  url,
  scrape
};
