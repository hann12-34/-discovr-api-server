/**
 * Ontario Science Centre Events Scraper
 * Scrapes events from https://www.ontariosciencecentre.ca/calendar
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
// We'll try multiple potential event pages
const OSC_EVENT_URLS = [
  'https://www.ontariosciencecentre.ca/pop-ups-plus-events/events',
  'https://www.ontariosciencecentre.ca/visit/whats-on',
  'https://www.ontariosciencecentre.ca',
  'https://www.ontariosciencecentre.ca/science-at-home/virtual-events'
];
const OSC_BASE_URL = 'https://www.ontariosciencecentre.ca';
const OSC_VENUE = {
  name: 'Ontario Science Centre',
  address: '770 Don Mills Rd, North York, ON M3C 1T3',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M3C 1T3',
  googleMapsUrl: 'https://goo.gl/maps/29Wi9TnY95Kpho928',
  officialWebsite: 'https://www.ontariosciencecentre.ca'
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
  const data = `${OSC_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array<string>} - Array of categories
 */
function extractCategories(title, description) {
  const categories = ['Science'];
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryMapping = {
    'workshop': 'Workshop',
    'learn': 'Education',
    'education': 'Education',
    'kids': 'Kids',
    'child': 'Kids',
    'children': 'Kids',
    'family': 'Family',
    'stem': 'STEM',
    'technology': 'Technology',
    'tech': 'Technology',
    'engineering': 'Engineering',
    'math': 'Mathematics',
    'mathematics': 'Mathematics',
    'space': 'Space',
    'astronomy': 'Space',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'biology': 'Biology',
    'nature': 'Nature',
    'environment': 'Environment',
    'climate': 'Climate',
    'earth': 'Earth Sciences',
    'robot': 'Robotics',
    'code': 'Coding',
    'programming': 'Coding',
    'art': 'Art & Science',
    'exhibition': 'Exhibition',
    'exhibit': 'Exhibition',
    'film': 'Film',
    'movie': 'Film',
    'screening': 'Film',
    'special': 'Special Event',
    'holiday': 'Holiday',
    'adult': 'Adult',
    'teen': 'Teen',
    'youth': 'Teen'
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
  
  return categories;
}

/**
 * Extract price information from text
 * @param {string} text - Text to extract price from
 * @returns {string} - Extracted price information or default text
 */
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  // Look for common price patterns
  const priceRegex = /(\$\d+(?:\.\d{2})?|\d+\s*dollars|free|included|admission)/i;
  const priceMatch = text.match(priceRegex);
  
  if (priceMatch) {
    return priceMatch[0].trim();
  }
  
  return 'See website for details';
}

/**
 * Normalize URL to absolute
 * @param {string} url - URL to normalize
 * @returns {string} - Absolute URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  if (url.startsWith('http')) {
    return url;
  } else if (url.startsWith('/')) {
    return `${OSC_BASE_URL}${url}`;
  } else {
    return `${OSC_BASE_URL}/${url}`;
  }
}

/**
 * Parse date string to extract start and end dates
 * @param {string} dateString - Date string to parse
 * @param {string} timeString - Optional time string
 * @returns {Object|null} - Object with startDate and endDate or null if parsing failed
 */
function parseEventDates(dateString, timeString = '') {
  if (!dateString) return null;
  
  try {
    // Clean up the date string
    dateString = dateString.replace(/\s+/g, ' ').trim();
    timeString = timeString ? timeString.replace(/\s+/g, ' ').trim() : '';
    
    const currentYear = new Date().getFullYear();
    
    // Handle date ranges like "April 25 - May 15, 2025"
    const dateRangeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*([A-Za-z]+)?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const dateRangeMatch = dateString.match(dateRangeRegex);
    
    if (dateRangeMatch) {
      const startMonth = dateRangeMatch[1];
      const startDay = parseInt(dateRangeMatch[2], 10);
      const endMonth = dateRangeMatch[3] || startMonth;
      const endDay = parseInt(dateRangeMatch[4], 10);
      const year = dateRangeMatch[5] ? parseInt(dateRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, getMonthIndex(startMonth), startDay);
      const endDate = new Date(year, getMonthIndex(endMonth), endDay, 23, 59);
      
      // Apply time if available
      if (timeString) {
        applyTimeToDate(startDate, timeString);
        applyTimeToDate(endDate, timeString, true);
      }
      
      return { startDate, endDate };
    }
    
    // Handle single dates with time like "April 25, 2025 at 10:00 AM"
    const combinedText = `${dateString} ${timeString}`;
    const singleDateTimeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?(?:.*?)(\d{1,2}):?(\d{2})?\s*([ap]m)?/i;
    const singleDateTimeMatch = combinedText.match(singleDateTimeRegex);
    
    if (singleDateTimeMatch) {
      const month = singleDateTimeMatch[1];
      const day = parseInt(singleDateTimeMatch[2], 10);
      const year = singleDateTimeMatch[3] ? parseInt(singleDateTimeMatch[3], 10) : currentYear;
      let hour = singleDateTimeMatch[4] ? parseInt(singleDateTimeMatch[4], 10) : 10; // Default to 10 AM
      const minute = singleDateTimeMatch[5] ? parseInt(singleDateTimeMatch[5], 10) : 0;
      const ampm = singleDateTimeMatch[6] ? singleDateTimeMatch[6].toLowerCase() : null;
      
      // Adjust hour for PM
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      
      const startDate = new Date(year, getMonthIndex(month), day, hour, minute);
      
      // Default event duration: 2 hours
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      return { startDate, endDate };
    }
    
    // Handle simple date formats like "April 25, 2025"
    const simpleDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?/i;
    const simpleDateMatch = dateString.match(simpleDateRegex);
    
    if (simpleDateMatch) {
      const month = simpleDateMatch[1];
      const day = parseInt(simpleDateMatch[2], 10);
      const year = simpleDateMatch[3] ? parseInt(simpleDateMatch[3], 10) : currentYear;
      
      const startDate = new Date(year, getMonthIndex(month), day);
      
      // Apply time if available
      if (timeString) {
        applyTimeToDate(startDate, timeString);
      } else {
        // Default time: 10:00 AM
        startDate.setHours(10, 0, 0);
      }
      
      // Default event duration: 8 hours for all-day events
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 8);
      
      return { startDate, endDate };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing date string:', error.message);
    return null;
  }
}

/**
 * Apply time string to a date object
 * @param {Date} date - Date object to modify
 * @param {string} timeString - Time string to parse
 * @param {boolean} isEnd - Whether this is an end time
 */
function applyTimeToDate(date, timeString, isEnd = false) {
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*([ap]m)?(?:\s*-\s*(\d{1,2}):?(\d{2})?\s*([ap]m)?)?/i;
  const timeMatch = timeString.match(timeRegex);
  
  if (timeMatch) {
    // If there's a time range and this is the end time, use the end time of the range
    let hourIdx = isEnd && timeMatch[4] ? 4 : 1;
    let minuteIdx = isEnd && timeMatch[4] ? 5 : 2;
    let ampmIdx = isEnd && timeMatch[4] ? 6 : 3;
    
    let hour = timeMatch[hourIdx] ? parseInt(timeMatch[hourIdx], 10) : (isEnd ? 18 : 10); // Default: 10 AM or 6 PM
    const minute = timeMatch[minuteIdx] ? parseInt(timeMatch[minuteIdx], 10) : 0;
    const ampm = timeMatch[ampmIdx] ? timeMatch[ampmIdx].toLowerCase() : null;
    
    // Adjust hour for PM
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    date.setHours(hour, minute, 0);
  } else if (isEnd) {
    // Default end time: 6:00 PM
    date.setHours(18, 0, 0);
  } else {
    // Default start time: 10:00 AM
    date.setHours(10, 0, 0);
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
    'december': 11,
    'jan': 0,
    'feb': 1,
    'mar': 2,
    'apr': 3,
    'jun': 5,
    'jul': 6,
    'aug': 7,
    'sep': 8,
    'sept': 8,
    'oct': 9,
    'nov': 10,
    'dec': 11
  };
  
  return months[month.toLowerCase()] || 0;
}

/**
 * Main function to scrape Ontario Science Centre events
 */
async function scrapeOSCEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    // Array to store all events
    const events = [];
    
    // Try each URL in our list
    for (const currentUrl of OSC_EVENT_URLS) {
      try {
        console.log(`🔍 Fetching events from ${currentUrl}...`);
        
        // Fetch the events page
        const response = await axios.get(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          maxRedirects: 5,
          timeout: 10000
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
    
        // Look for event listings - adapt selectors based on actual website structure
        $('.event, .calendar-item, .event-item, .event-card, article, [class*="event"], .program, .upcoming-event, .featured-event, .event-listing').each((i, element) => {
          try {
            const eventElement = $(element);
            
            // Extract title
            const titleElement = eventElement.find('h2, h3, h4, .title, .heading, [class*="title"]');
            const title = titleElement.text().trim();
            
            // Extract date
            const dateElement = eventElement.find('.date, time, [class*="date"], .calendar-date');
            const dateText = dateElement.text().trim();
            
            // Extract time
            const timeElement = eventElement.find('.time, [class*="time"]');
            const timeText = timeElement.text().trim();
            
            // Extract description
            const descriptionElement = eventElement.find('p, .description, [class*="description"], .summary');
            let description = descriptionElement.text().trim();
            if (!description || description.length < 20) {
              description = `Event at the Ontario Science Centre. See website for more details.`;
            }
            
            // Extract image URL
            const imageElement = eventElement.find('img');
            let imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            imageUrl = normalizeUrl(imageUrl);
            
            // Extract event URL
            const linkElement = eventElement.find('a');
            let eventUrl = linkElement.attr('href') || currentUrl;
            eventUrl = normalizeUrl(eventUrl);
            
            // Extract price information
            const priceElement = eventElement.find('.price, [class*="price"], .cost, [class*="admission"]');
            const priceText = priceElement.text().trim();
            const price = extractPrice(priceText);
            
            // Only add events with title
            if (title) {
              // Check if we already have this event (avoid duplicates across multiple URLs)
              const isDuplicate = events.some(existingEvent => 
                existingEvent.title === title && 
                existingEvent.dateText === dateText
              );
              
              if (!isDuplicate) {
                events.push({
                  title,
                  dateText,
                  timeText,
                  description,
                  imageUrl,
                  eventUrl,
                  price
                });
                
                console.log(`🔍 Found event: ${title}`);
              }
            }
          } catch (eventError) {
            console.error(`❌ Error extracting event details:`, eventError.message);
          }
        });
        
        // If we don't find many events with the primary selectors, try alternative approaches
        if (events.length < 3) {
          console.log('🔍 Looking for additional events using alternative selectors...');
          
          // Try more generic selectors
          $('.card, .item, .listing, .tile, .col, .event-card, .card-body').each((i, element) => {
        try {
          const eventElement = $(element);
          
          // Skip if we've already processed this element
          if (eventElement.hasClass('processed')) return;
          eventElement.addClass('processed');
          
          const title = eventElement.find('h2, h3, h4, h5, .title, strong').first().text().trim();
          if (!title) return;
          
          // Look for date patterns in the text content
          const allText = eventElement.text();
          
          // Check for date patterns
          const datePatterns = [
            /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*\d{4})?(?:\s*[-–]\s*(?:[A-Za-z]+)?\s*\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)?/i, // April 15 - April 20, 2025
            /\d{1,2}(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)?(?:,\s*\d{4})?/i, // 15th April, 2025
          ];
          
          let dateText = '';
          for (const pattern of datePatterns) {
            const match = allText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
          
          if (!dateText) return; // Skip if no date found
          
          // Extract description (use first paragraph or basic description)
          let description = eventElement.find('p').first().text().trim();
          if (!description || description.length < 20) {
            description = `Event at the Ontario Science Centre. See website for details.`;
          }
          
          // Extract image
          let imageUrl = eventElement.find('img').first().attr('src') || '';
          imageUrl = normalizeUrl(imageUrl);
          
          // Extract link
          let eventUrl = eventElement.find('a').first().attr('href') || currentUrl;
          eventUrl = normalizeUrl(eventUrl);
          
          // Check for duplicates before adding
          const isDuplicate = events.some(existingEvent => 
            existingEvent.title === title && 
            existingEvent.dateText === dateText
          );
          
          if (!isDuplicate) {
            events.push({
              title,
              dateText,
              timeText: '',
              description,
              imageUrl,
              eventUrl,
              price: 'See website for details'
            });
            
            console.log(`🔍 Found additional event: ${title}`);
          }
        } catch (eventError) {
          console.error(`❌ Error extracting event with alternative selectors:`, eventError.message);
        }
      });
        }
      } catch (urlError) {
        console.error(`❌ Error fetching from ${currentUrl}:`, urlError.message);
      }
    }
    
    // Fetch additional details from individual event pages
    if (events.length > 0) {
      console.log(`🔍 Fetching additional details from ${events.length} event pages...`);
      
      for (const event of events) {
        try {
          if (event.eventUrl && !OSC_EVENT_URLS.includes(event.eventUrl)) {
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Try to get a better description
            const detailDescription = detail$('.description, [class*="description"], .content p, main p').slice(0, 3).text().trim();
            if (detailDescription && detailDescription.length > event.description.length) {
              event.description = detailDescription;
            }
            
            // Try to get a better image
            if (!event.imageUrl) {
              const detailImage = detail$('img').first();
              const imgSrc = detailImage.attr('src') || detailImage.attr('data-src');
              if (imgSrc) {
                event.imageUrl = normalizeUrl(imgSrc);
              }
            }
            
            // Try to get better date/time info
            if (!event.dateText) {
              const detailDate = detail$('.date, time, [class*="date"], .calendar-date').first().text().trim();
              if (detailDate) {
                event.dateText = detailDate;
              }
            }
            
            console.log(`🔍 Enhanced details for: ${event.title}`);
          }
        } catch (detailError) {
          console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
        }
      }
    }
    
    // Process each event and insert into MongoDB
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
        
        // Skip events without dates - NO FALLBACKS
        if (!event.dateText) {
          console.log(`⏭️ Skipping event with missing date: ${event.title}`);
          continue;
        }
        
        // Parse date information
        const dateInfo = parseEventDates(event.dateText, event.timeText);
        
        // Skip events with invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid date: ${event.title}`);
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
          venue: OSC_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl,
          price: event.price || 'See website for details',
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
    
    console.log(`📊 Successfully added ${addedEvents} new Ontario Science Centre events`);
    
  } catch (error) {
    console.error('❌ Error scraping Ontario Science Centre events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeOSCEvents()
  .then(addedEvents => {
    console.log(`✅ Ontario Science Centre scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Ontario Science Centre scraper:', error);
    process.exit(1);
  });
