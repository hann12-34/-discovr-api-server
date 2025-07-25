/**
 * Gerrard India Bazaar Events Scraper
 * Based on events from https://gerrardindiabazaar.com/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const GERRARD_INDIA_BAZAAR_URL = 'https://gerrardindiabazaar.com/events/';
const GERRARD_INDIA_BAZAAR_VENUE = {
  name: "Gerrard India Bazaar",
  address: 'Gerrard Street East between Coxwell Avenue and Greenwood Avenue, Toronto, ON',
  googleMapsUrl: 'https://goo.gl/maps/cbPdiCYKm2NvaujV6',
  officialWebsite: 'https://gerrardindiabazaar.com/'
};

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Please set the MONGODB_URI environment variable');
  process.exit(1);
}

/**
 * Generate a unique ID for an event based on venue, title and start date
 * @param {string} title - Event title
 * @param {Date} startDate - Event start date
 * @returns {string} - MD5 hash of venue name, title and start date
 */
function generateEventId(title, startDate) {
  const data = `${GERRARD_INDIA_BAZAAR_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array<string>} - Array of categories
 */
function extractCategories(title, description) {
  const categories = [];
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryMapping = {
    'festival': 'Festival',
    'celebration': 'Festival',
    'music': 'Music',
    'concert': 'Music',
    'food': 'Food & Drink',
    'drink': 'Food & Drink',
    'culinary': 'Food & Drink',
    'taste': 'Food & Drink',
    'market': 'Shopping',
    'bazaar': 'Shopping',
    'shop': 'Shopping',
    'vendor': 'Shopping',
    'india': 'Cultural',
    'indian': 'Cultural',
    'south asian': 'Cultural',
    'culture': 'Cultural',
    'art': 'Art',
    'exhibit': 'Art',
    'dance': 'Performance',
    'performance': 'Performance',
    'film': 'Film',
    'movie': 'Film',
    'cinema': 'Film',
    'family': 'Family',
    'children': 'Family',
    'workshop': 'Workshop',
    'community': 'Community',
    'charity': 'Charity',
    'fundraiser': 'Charity'
  };
  
  // Check for category matches
  Object.keys(categoryMapping).forEach(keyword => {
    if (combinedText.includes(keyword)) {
      const category = categoryMapping[keyword];
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
  });
  
  // Default category if none found
  if (categories.length === 0) {
    categories.push('Community');
  }
  
  return categories;
}

/**
 * Parse date string to extract start and end dates
 * @param {string} dateString - Date string to parse
 * @returns {Object|null} - Object with startDate and endDate or null if parsing failed
 */
function parseEventDates(dateString) {
  if (!dateString) return null;
  
  try {
    // Clean up the date string
    dateString = dateString.replace(/\s+/g, ' ').trim();
    
    const currentYear = new Date().getFullYear();
    
    // Check for date ranges with time like "August 15, 2025 @ 10:00 am - 5:00 pm"
    const fullRangeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})?\s*@?\s*(\d{1,2}):(\d{2})\s*([ap]m)\s*-\s*(\d{1,2}):(\d{2})\s*([ap]m)/i;
    const fullRangeMatch = dateString.match(fullRangeRegex);
    
    if (fullRangeMatch) {
      const month = fullRangeMatch[1];
      const day = parseInt(fullRangeMatch[2], 10);
      const year = fullRangeMatch[3] ? parseInt(fullRangeMatch[3], 10) : currentYear;
      
      let startHour = parseInt(fullRangeMatch[4], 10);
      const startMinute = parseInt(fullRangeMatch[5], 10);
      const startAmPm = fullRangeMatch[6].toLowerCase();
      
      let endHour = parseInt(fullRangeMatch[7], 10);
      const endMinute = parseInt(fullRangeMatch[8], 10);
      const endAmPm = fullRangeMatch[9].toLowerCase();
      
      // Convert to 24-hour format
      if (startAmPm === 'pm' && startHour < 12) startHour += 12;
      if (startAmPm === 'am' && startHour === 12) startHour = 0;
      
      if (endAmPm === 'pm' && endHour < 12) endHour += 12;
      if (endAmPm === 'am' && endHour === 12) endHour = 0;
      
      const startDate = new Date(year, getMonthIndex(month), day, startHour, startMinute);
      const endDate = new Date(year, getMonthIndex(month), day, endHour, endMinute);
      
      return { startDate, endDate };
    }
    
    // Check for date ranges like "August 15 - August 17, 2025"
    const dateRangeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*-\s*([A-Za-z]+)?\s*(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
    const dateRangeMatch = dateString.match(dateRangeRegex);
    
    if (dateRangeMatch) {
      const startMonth = dateRangeMatch[1];
      const startDay = parseInt(dateRangeMatch[2], 10);
      const endMonth = dateRangeMatch[3] || startMonth;
      const endDay = parseInt(dateRangeMatch[4], 10);
      const year = parseInt(dateRangeMatch[5], 10);
      
      const startDate = new Date(year, getMonthIndex(startMonth), startDay, 10, 0); // Default to 10 AM
      const endDate = new Date(year, getMonthIndex(endMonth), endDay, 22, 0); // Default to 10 PM
      
      return { startDate, endDate };
    }
    
    // Check for single dates with time like "August 15, 2025 @ 7:00 pm"
    const singleDateTimeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})?\s*@?\s*(\d{1,2}):(\d{2})\s*([ap]m)/i;
    const singleDateTimeMatch = dateString.match(singleDateTimeRegex);
    
    if (singleDateTimeMatch) {
      const month = singleDateTimeMatch[1];
      const day = parseInt(singleDateTimeMatch[2], 10);
      const year = singleDateTimeMatch[3] ? parseInt(singleDateTimeMatch[3], 10) : currentYear;
      
      let hour = parseInt(singleDateTimeMatch[4], 10);
      const minute = parseInt(singleDateTimeMatch[5], 10);
      const ampm = singleDateTimeMatch[6].toLowerCase();
      
      // Convert to 24-hour format
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      
      const startDate = new Date(year, getMonthIndex(month), day, hour, minute);
      
      // Set end time to 3 hours after start time for events
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);
      
      return { startDate, endDate };
    }
    
    // Check for single dates like "August 15, 2025"
    const singleDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
    const singleDateMatch = dateString.match(singleDateRegex);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = parseInt(singleDateMatch[3], 10);
      
      const startDate = new Date(year, getMonthIndex(month), day, 10, 0); // Default to 10 AM
      const endDate = new Date(year, getMonthIndex(month), day, 22, 0); // Default to 10 PM
      
      return { startDate, endDate };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing date string:', error);
    return null;
  }
}

/**
 * Get month index from month name
 * @param {string} month - Month name
 * @returns {number} - Month index (0-11)
 */
function getMonthIndex(month) {
  const months = {
    'january': 0,
    'february': 1,
    'march': 2,
    'april': 3,
    'may': 4,
    'june': 5,
    'july': 6,
    'august': 7,
    'september': 8,
    'october': 9,
    'november': 10,
    'december': 11
  };
  
  return months[month.toLowerCase()] || 0;
}

/**
 * Main function to scrape Gerrard India Bazaar events
 */
async function scrapeGerrardIndiaBazaarEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Gerrard India Bazaar website...');
    
    // Fetch HTML content
    const response = await axios.get(GERRARD_INDIA_BAZAAR_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event elements - look for event listings
    $('.event, .tribe-events-list-event, article, .event-listing, .event-item').each((i, element) => {
      const eventElement = $(element);
      
      // Extract event title
      const titleElement = eventElement.find('.event-title, .tribe-events-list-event-title, h2, h3, h4, .title');
      const title = titleElement.text().trim();
      
      // Extract event URL
      const linkElement = eventElement.find('a');
      const eventUrl = linkElement.attr('href') || GERRARD_INDIA_BAZAAR_URL;
      
      // Extract date information
      const dateElement = eventElement.find('.event-date, .tribe-event-date-start, .date, [class*="date"], time');
      let dateText = dateElement.text().trim();
      
      // If no explicit date element, try to find it in the text content
      if (!dateText) {
        const text = eventElement.text();
        const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{4}/i);
        if (dateMatch) {
          dateText = dateMatch[0];
        }
      }
      
      // Extract description
      const descriptionElement = eventElement.find('.event-description, .tribe-events-list-event-description, .summary, .description, p');
      const description = descriptionElement.text().trim();
      
      // Extract image URL
      const imageElement = eventElement.find('img');
      const imageUrl = imageElement.attr('src') || '';
      
      if (title && (dateText || eventUrl !== GERRARD_INDIA_BAZAAR_URL)) {
        events.push({
          title,
          eventUrl,
          dateText,
          description,
          imageUrl
        });
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Gerrard India Bazaar website`);
    
    // If the main event extraction didn't work, try an alternative approach
    if (events.length === 0) {
      console.log('🔍 No events found with primary method, trying alternative approach...');
      
      // Try to find events in calendar widgets or list views
      $('.tribe-events-calendar-list__event, .type-tribe_events, [class*="event"]').each((i, element) => {
        const eventElement = $(element);
        
        // Extract event title
        const titleElement = eventElement.find('h3, h2, .title');
        const title = titleElement.text().trim();
        
        // Extract event URL
        const linkElement = eventElement.find('a');
        const eventUrl = linkElement.attr('href') || GERRARD_INDIA_BAZAAR_URL;
        
        // Extract date information
        const dateElement = eventElement.find('.date, [class*="date"], time');
        let dateText = dateElement.text().trim();
        
        // Extract description
        const descriptionElement = eventElement.find('.description, .content, p');
        const description = descriptionElement.text().trim();
        
        // Extract image URL
        const imageElement = eventElement.find('img');
        const imageUrl = imageElement.attr('src') || '';
        
        if (title && (dateText || eventUrl !== GERRARD_INDIA_BAZAAR_URL)) {
          events.push({
            title,
            eventUrl,
            dateText,
            description,
            imageUrl
          });
        }
      });
      
      // If still no events, try to find text with date patterns that might be events
      if (events.length === 0) {
        $('p, div, li').each((i, element) => {
          const text = $(element).text().trim();
          
          // Look for text that contains a title and a date
          const eventRegex = /([A-Za-z0-9\s'&-]+)(?:\s*[-:]\s*|\s+on\s+|\s*,\s*)?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[@-]\s*\d{1,2}:\d{2}\s*[ap]m)?(?:\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\s*-\s*\d{1,2}:\d{2}\s*[ap]m)?)/i;
          const match = text.match(eventRegex);
          
          if (match && match[1].length > 3 && match[2]) {
            const title = match[1].trim();
            const dateText = match[2].trim();
            
            // Get any nearby image
            const nearbyImage = $(element).prev().find('img');
            const imageUrl = nearbyImage.attr('src') || '';
            
            events.push({
              title,
              eventUrl: GERRARD_INDIA_BAZAAR_URL,
              dateText,
              description: text,
              imageUrl
            });
          }
        });
      }
      
      console.log(`🔍 Found ${events.length} events using alternative approach`);
    }
    
    // Process individual event URLs to get more details if needed
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event, index) => {
        // Only fetch details for events with a different URL than the main page and missing information
        if (event.eventUrl !== GERRARD_INDIA_BAZAAR_URL && (!event.dateText || !event.description)) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // If we don't have a date yet, try to extract it from the detail page
            if (!event.dateText) {
              const dateElement = detail$('.event-date, .tribe-events-start-date, .date, [class*="date"], time');
              event.dateText = dateElement.text().trim();
              
              if (!event.dateText) {
                // Look for date patterns in the text
                const pageText = detail$('body').text();
                const datePatterns = [
                  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[@-]\s*\d{1,2}:\d{2}\s*[ap]m)?(?:\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\s*-\s*\d{1,2}:\d{2}\s*[ap]m)?/i
                ];
                
                for (const pattern of datePatterns) {
                  const matches = pageText.match(pattern);
                  if (matches && matches.length > 0) {
                    event.dateText = matches[0];
                    console.log(`📅 Found date in page text: ${matches[0]}`);
                    break;
                  }
                }
              }
            }
            
            // If we don't have a description yet, try to extract it
            if (!event.description) {
              const descriptionElement = detail$('.event-description, .tribe-events-single-event-description, .description, .content, article p');
              if (descriptionElement.length) {
                let description = '';
                descriptionElement.each((i, el) => {
                  if (i < 3) { // Limit to first 3 elements
                    description += detail$(el).text().trim() + ' ';
                  }
                });
                event.description = description.trim();
              }
            }
            
            // If we don't have an image URL yet, try to extract it
            if (!event.imageUrl) {
              const imageElement = detail$('.event-image img, .tribe-events-event-image img, img.attachment-full, article img').first();
              if (imageElement.length) {
                event.imageUrl = imageElement.attr('src') || '';
              }
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
          }
        }
        
        // Add a small delay between requests to avoid overwhelming the server
        if (index > 0 && index % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return event;
      });
      
      // Wait for all detail requests to complete
      console.log('🔍 Fetching additional details from individual event pages...');
      await Promise.all(eventDetailsPromises);
    }
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
        
        // If no description was found, use a default one
        if (!event.description) {
          event.description = `Join us for ${event.title} at Gerrard India Bazaar. Please visit the website for more details.`;
        }
        
        // Parse date information - NO FALLBACKS
        const dateInfo = parseEventDates(event.dateText);
        
        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid or missing date: ${event.title}`);
          continue;
        }
        
        // Generate unique ID
        const eventId = generateEventId(event.title, dateInfo.startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: event.title,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          date: {
            start: dateInfo.startDate,
            end: dateInfo.endDate
          },
          venue: GERRARD_INDIA_BAZAAR_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl,
          price: 'See website for details',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { id: formattedEvent.id },
            { 
              title: formattedEvent.title,
              'date.start': formattedEvent.date.start
            }
          ]
        });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (eventError) {
        console.error(`❌ Error processing event:`, eventError.message);
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Gerrard India Bazaar website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates or missing dates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Gerrard India Bazaar events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Gerrard India Bazaar events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeGerrardIndiaBazaarEvents()
  .then(addedEvents => {
    console.log(`✅ Gerrard India Bazaar scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Gerrard India Bazaar scraper:', error);
    process.exit(1);
  });
