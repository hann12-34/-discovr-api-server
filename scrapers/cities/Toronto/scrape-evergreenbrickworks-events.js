/**
 * Evergreen Brick Works Events Scraper
 * Scrapes events from https://www.evergreen.ca/whats-on/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const EVERGREEN_EVENTS_URL = 'https://www.evergreen.ca/whats-on/';
const EVERGREEN_VENUE = {
  name: 'Evergreen Brick Works',
  address: '550 Bayview Ave, Toronto, ON M4W 3X8',
  googleMapsUrl: 'https://goo.gl/maps/mVFRtTzJ4ZyPHjXs5',
  officialWebsite: 'https://www.evergreen.ca/evergreen-brick-works/'
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
  const data = `${EVERGREEN_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    'market': 'Market',
    'farmers': 'Market',
    'farm': 'Market',
    'food': 'Food & Drink',
    'drink': 'Food & Drink',
    'beer': 'Food & Drink',
    'wine': 'Food & Drink',
    'workshop': 'Education',
    'learn': 'Education',
    'class': 'Education',
    'art': 'Arts & Culture',
    'gallery': 'Arts & Culture',
    'exhibition': 'Arts & Culture',
    'music': 'Music',
    'concert': 'Music',
    'band': 'Music',
    'film': 'Film',
    'movie': 'Film',
    'screening': 'Film',
    'nature': 'Nature',
    'hike': 'Nature',
    'bird': 'Nature',
    'walk': 'Nature',
    'tour': 'Tour',
    'guided': 'Tour',
    'family': 'Family',
    'children': 'Family',
    'kids': 'Family',
    'festival': 'Festival',
    'celebration': 'Festival',
    'garden': 'Gardening',
    'plant': 'Gardening',
    'gardening': 'Gardening',
    'sustainable': 'Sustainability',
    'sustainability': 'Sustainability',
    'environment': 'Sustainability',
    'eco': 'Sustainability',
    'green': 'Sustainability',
    'yoga': 'Wellness',
    'meditation': 'Wellness',
    'wellness': 'Wellness',
    'health': 'Wellness'
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
    
    // Check for date ranges like "April 25 - May 15, 2025"
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
      
      return { startDate, endDate };
    }
    
    // Check for single dates with time like "April 25, 2025 at 10:00 AM"
    const singleDateTimeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?(?:.*?)(\d{1,2}):(\d{2})\s*([ap]m)?/i;
    const singleDateTimeMatch = dateString.match(singleDateTimeRegex);
    
    if (singleDateTimeMatch) {
      const month = singleDateTimeMatch[1];
      const day = parseInt(singleDateTimeMatch[2], 10);
      const year = singleDateTimeMatch[3] ? parseInt(singleDateTimeMatch[3], 10) : currentYear;
      const hour = parseInt(singleDateTimeMatch[4], 10);
      const minute = parseInt(singleDateTimeMatch[5], 10);
      const ampm = singleDateTimeMatch[6] ? singleDateTimeMatch[6].toLowerCase() : null;
      
      let hours24 = hour;
      if (ampm === 'pm' && hour < 12) hours24 += 12;
      if (ampm === 'am' && hour === 12) hours24 = 0;
      
      const startDate = new Date(year, getMonthIndex(month), day, hours24, minute);
      const endDate = new Date(year, getMonthIndex(month), day, hours24 + 2, minute); // Default 2 hours duration
      
      return { startDate, endDate };
    }
    
    // Check for single dates like "April 25, 2025"
    const singleDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?/i;
    const singleDateMatch = dateString.match(singleDateRegex);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = singleDateMatch[3] ? parseInt(singleDateMatch[3], 10) : currentYear;
      
      const startDate = new Date(year, getMonthIndex(month), day, 10, 0); // Default start time: 10:00 AM
      const endDate = new Date(year, getMonthIndex(month), day, 18, 0);   // Default end time: 6:00 PM
      
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
 * Main function to scrape Evergreen Brick Works events
 */
async function scrapeEvergreenEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Evergreen Brick Works website...');
    
    // Fetch the events page
    const response = await axios.get(EVERGREEN_EVENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Look for event listings
    $('.event, .card, article, .event-item, .events-list > *, .events-container > *').each((i, element) => {
      const eventElement = $(element);
      
      // Extract title
      const titleElement = eventElement.find('h1, h2, h3, h4, h5, .title, .heading');
      const title = titleElement.text().trim();
      
      // Extract description
      const descriptionElement = eventElement.find('p, .description, .excerpt, .summary');
      let description = descriptionElement.text().trim();
      
      // Extract image URL
      const imageElement = eventElement.find('img');
      const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
      
      // Extract event URL
      const linkElement = eventElement.find('a');
      let eventUrl = linkElement.attr('href') || '';
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = new URL(eventUrl, EVERGREEN_EVENTS_URL).href;
      }
      
      // Extract date
      const dateElement = eventElement.find('.date, time, .calendar, [class*="date"], [class*="time"]');
      let dateText = dateElement.text().trim();
      
      // If no specific date element found, look for date patterns in the text
      if (!dateText) {
        const text = eventElement.text();
        const datePatterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)?/i,
          /\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:,?\s*\d{4})?/i
        ];
        
        for (const pattern of datePatterns) {
          const match = text.match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      // Only add events with title and date
      if (title && dateText) {
        events.push({
          title,
          description,
          dateText,
          imageUrl,
          eventUrl: eventUrl || EVERGREEN_EVENTS_URL
        });
        
        console.log(`🔍 Found event: ${title}`);
      }
    });
    
    // If we don't have many events yet, try a different approach
    if (events.length < 3) {
      console.log('🔍 Looking for additional events using alternative approach...');
      
      // Try to find any calendar or events list
      $('a').each((i, element) => {
        const href = $(element).attr('href') || '';
        const text = $(element).text().trim();
        
        // Check if the link might be for an event
        if ((href.includes('event') || 
             href.includes('whats-on') || 
             href.includes('calendar') ||
             text.toLowerCase().includes('event')) && 
            href.startsWith('/') || href.includes('evergreen.ca')) {
          
          // Format URL
          let eventUrl = href;
          if (eventUrl.startsWith('/')) {
            eventUrl = new URL(eventUrl, EVERGREEN_EVENTS_URL).href;
          }
          
          // Add potential event to follow-up
          events.push({
            title: text || 'Evergreen Brick Works Event',
            description: 'Event at Evergreen Brick Works. See website for details.',
            dateText: '', // We'll need to fetch the detail page
            imageUrl: '',
            eventUrl
          });
          
          console.log(`🔍 Found potential event link: "${text}" at ${eventUrl}`);
        }
      });
    }
    
    // Process individual event URLs to get more details
    if (events.length > 0) {
      console.log('🔍 Fetching additional details from individual event pages...');
      
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && !event.dateText) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Try to find date information
            const dateElement = detail$('.date, time, .calendar, [class*="date"], [class*="time"]');
            let detailDateText = dateElement.text().trim();
            
            // If no specific date element found, look for date patterns in the text
            if (!detailDateText) {
              const text = detail$('body').text();
              const datePatterns = [
                /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)?/i,
                /\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:,?\s*\d{4})?/i
              ];
              
              for (const pattern of datePatterns) {
                const match = text.match(pattern);
                if (match) {
                  detailDateText = match[0];
                  break;
                }
              }
            }
            
            if (detailDateText) {
              event.dateText = detailDateText;
              console.log(`📅 Found date on detail page: ${detailDateText}`);
            }
            
            // Try to get a better description
            if (!event.description || event.description.length < 50) {
              const detailDesc = detail$('p').slice(0, 3).text().trim();
              if (detailDesc && detailDesc.length > event.description.length) {
                event.description = detailDesc;
              }
            }
            
            // Try to get an image
            if (!event.imageUrl) {
              const detailImage = detail$('img').first();
              const imgSrc = detailImage.attr('src') || detailImage.attr('data-src');
              if (imgSrc) {
                event.imageUrl = imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, event.eventUrl).href;
              }
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      await Promise.all(eventDetailsPromises);
    }
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
        
        // Skip events without dates
        if (!event.dateText) {
          console.log(`⏭️ Skipping event with missing date: ${event.title}`);
          continue;
        }
        
        // Parse date information - NO FALLBACKS
        const dateInfo = parseEventDates(event.dateText);
        
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
          venue: EVERGREEN_VENUE,
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
      console.warn('⚠️ Warning: No events found on Evergreen Brick Works website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates or missing dates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Evergreen Brick Works events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Evergreen Brick Works events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeEvergreenEvents()
  .then(addedEvents => {
    console.log(`✅ Evergreen Brick Works scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Evergreen Brick Works scraper:', error);
    process.exit(1);
  });
