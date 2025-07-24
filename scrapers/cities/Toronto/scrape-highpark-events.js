/**
 * High Park Cherry Blossoms Events Scraper
 * Based on events from https://www.highparktoronto.com/cherry-blossoms.php
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const HIGH_PARK_CHERRY_BLOSSOMS_URL = 'https://www.toronto.ca/explore-enjoy/festivals-events/cherry-blossoms/';
const HIGH_PARK_NATURE_CENTRE_URL = 'https://highparknaturecentre.com/cherry-blossom-watch/';
const HIGH_PARK_EVENTS_URL = 'https://www.toronto.ca/explore-enjoy/festivals-events/';
const HIGH_PARK_VENUE = {
  name: "High Park",
  address: '1873 Bloor St W, Toronto, ON M6R 2Z3',
  googleMapsUrl: 'https://goo.gl/maps/HjMkEnQt9ajWsJX87',
  officialWebsite: 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/gardens-and-horticulture/gardens-parks/high-park/'
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
  const data = `${HIGH_PARK_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    'cherry': 'Nature',
    'blossom': 'Nature',
    'sakura': 'Nature',
    'tree': 'Nature',
    'bird': 'Nature',
    'walk': 'Outdoor Activities',
    'hike': 'Outdoor Activities',
    'run': 'Sports',
    'race': 'Sports',
    'marathon': 'Sports',
    'music': 'Music',
    'concert': 'Music',
    'theatre': 'Performance',
    'performance': 'Performance',
    'show': 'Performance',
    'art': 'Arts & Culture',
    'exhibition': 'Arts & Culture',
    'festival': 'Festival',
    'celebration': 'Festival',
    'workshop': 'Education',
    'learn': 'Education',
    'food': 'Food & Drink',
    'drink': 'Food & Drink',
    'picnic': 'Food & Drink',
    'tour': 'Tour',
    'guided': 'Tour',
    'family': 'Family',
    'children': 'Family',
    'kids': 'Family',
    'garden': 'Gardening',
    'plant': 'Gardening',
    'zoo': 'Zoo',
    'animal': 'Zoo'
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
  
  // Add special category for Cherry Blossoms
  if (combinedText.includes('cherry') || combinedText.includes('blossom') || combinedText.includes('sakura')) {
    if (!categories.includes('Cherry Blossoms')) {
      categories.push('Cherry Blossoms');
    }
  }
  
  // Default category if none found
  if (categories.length === 0) {
    categories.push('Park Event');
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
    
    // Check for Cherry Blossom season references which often include year
    const cherrySeasonRegex = /cherry\s+blossom\s+(?:bloom|season|event|festival)?\s+(\d{4})/i;
    const cherryMatch = dateString.match(cherrySeasonRegex);
    
    if (cherryMatch) {
      const year = parseInt(cherryMatch[1], 10);
      // Cherry blossoms in Toronto typically bloom in late April to early May
      const startDate = new Date(year, 3, 25); // April 25th
      const endDate = new Date(year, 4, 15);   // May 15th
      
      return { startDate, endDate };
    }
    
    // Check for typical date ranges like "April 25 - May 15, 2025"
    const dateRangeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*([A-Za-z]+)?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const dateRangeMatch = dateString.match(dateRangeRegex);
    
    if (dateRangeMatch) {
      const startMonth = dateRangeMatch[1];
      const startDay = parseInt(dateRangeMatch[2], 10);
      const endMonth = dateRangeMatch[3] || startMonth;
      const endDay = parseInt(dateRangeMatch[4], 10);
      const year = dateRangeMatch[5] ? parseInt(dateRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, getMonthIndex(startMonth), startDay);
      const endDate = new Date(year, getMonthIndex(endMonth), endDay);
      
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
      const endDate = new Date(year, getMonthIndex(month), day, hours24 + 3, minute); // Assume 3 hours duration
      
      return { startDate, endDate };
    }
    
    // Check for single dates like "April 25, 2025"
    const singleDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?/i;
    const singleDateMatch = dateString.match(singleDateRegex);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = singleDateMatch[3] ? parseInt(singleDateMatch[3], 10) : currentYear;
      
      const startDate = new Date(year, getMonthIndex(month), day, 9, 0); // Default start time: 9:00 AM
      const endDate = new Date(year, getMonthIndex(month), day, 17, 0);  // Default end time: 5:00 PM
      
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
 * Main function to scrape High Park events
 */
async function scrapeHighParkEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from High Park website...');
    
    // First fetch Cherry Blossom page
    const response = await axios.get(HIGH_PARK_CHERRY_BLOSSOMS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // First look for the cherry blossom information
    const content = $('.content, main, article');
    const cherryBlossomContent = content.text();
    
    // Extract year information
    const currentYear = new Date().getFullYear();
    const yearMatch = cherryBlossomContent.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;
    
    // Create a cherry blossom event
    events.push({
      title: `Cherry Blossoms in High Park ${year}`,
      description: `Experience the beauty of cherry blossoms (sakura) in High Park. The Japanese Cherry Trees typically bloom for a short period in late April to early May, depending on weather conditions. During the peak bloom, thousands of visitors come to High Park to witness the spectacular sight of pink and white blossoms.`,
      dateText: `Cherry Blossom Season ${year}`, // This will be parsed to a date range
      imageUrl: '', // Will be updated if found
      eventUrl: HIGH_PARK_CHERRY_BLOSSOMS_URL
    });
    
    console.log('🔍 Added Cherry Blossom event');
    
    // Try to find an image for cherry blossoms
    const cherryBlossomImage = $('img').filter((i, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      return src.toLowerCase().includes('cherry') || 
             src.toLowerCase().includes('blossom') || 
             alt.toLowerCase().includes('cherry') || 
             alt.toLowerCase().includes('blossom');
    }).first().attr('src') || '';
    
    if (cherryBlossomImage) {
      // Update the cherry blossom event with the found image
      if (cherryBlossomImage.startsWith('http')) {
        events[0].imageUrl = cherryBlossomImage;
      } else {
        // Handle relative URLs
        const baseUrl = new URL(HIGH_PARK_CHERRY_BLOSSOMS_URL).origin;
        events[0].imageUrl = baseUrl + (cherryBlossomImage.startsWith('/') ? '' : '/') + cherryBlossomImage;
      }
    }
    
    // Also try High Park Nature Centre for cherry blossom info
    try {
      console.log('🔍 Fetching High Park Nature Centre cherry blossom info...');
      const natureResponse = await axios.get(HIGH_PARK_NATURE_CENTRE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const natureHtml = natureResponse.data;
      const nature$ = cheerio.load(natureHtml);
      
      // Look for updated cherry blossom information
      const natureDesc = nature$('p').slice(0, 3).text(); // Get first few paragraphs
      
      // If we found content, update our event description
      if (natureDesc.length > 50) {
        events[0].description = natureDesc.trim() + ' ' + events[0].description;
      }
      
      // Look for a better cherry blossom image
      const natureImage = nature$('img').filter((i, el) => {
        const src = nature$(el).attr('src') || '';
        const alt = nature$(el).attr('alt') || '';
        return src.toLowerCase().includes('cherry') || 
               src.toLowerCase().includes('blossom') || 
               alt.toLowerCase().includes('cherry') || 
               alt.toLowerCase().includes('blossom');
      }).first().attr('src') || '';
      
      if (natureImage && !events[0].imageUrl) {
        if (natureImage.startsWith('http')) {
          events[0].imageUrl = natureImage;
        } else {
          // Handle relative URLs
          const baseUrl = new URL(HIGH_PARK_NATURE_CENTRE_URL).origin;
          events[0].imageUrl = baseUrl + (natureImage.startsWith('/') ? '' : '/') + natureImage;
        }
      }
    } catch (natureError) {
      console.log('⚠️ Could not fetch Nature Centre information:', natureError.message);
    }
    
    // Now fetch the general events page
    console.log('🔍 Fetching events from Toronto events page...');
    const eventsResponse = await axios.get(HIGH_PARK_EVENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const eventsHtml = eventsResponse.data;
    const events$ = cheerio.load(eventsHtml);
    
    // Look for event listings specifically related to High Park
    events$('div.event, article, .event-item, .event-listing, .listing, .search-result').each((i, element) => {
      const elementText = events$(element).text();
      
      // Only process if it mentions High Park
      if (!elementText.toLowerCase().includes('high park')) {
        return;
      }
      const eventElement = events$(element);
      
      // Extract title
      const titleElement = eventElement.find('h1, h2, h3, h4, .title');
      const title = titleElement.text().trim() || eventElement.find('strong').first().text().trim();
      
      // Extract description
      const descriptionElement = eventElement.find('p, .description');
      const description = descriptionElement.text().trim() || eventElement.text().trim();
      
      // Extract date information - look for date patterns in the text
      const text = eventElement.text();
      const datePatterns = [
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)?/i,
        /\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:,?\s*\d{4})?/i
      ];
      
      let dateText = '';
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          dateText = match[0];
          break;
        }
      }
      
      // Extract image
      const imageElement = eventElement.find('img');
      const imageUrl = imageElement.attr('src') || '';
      
      // Only add events with title and date
      if (title && dateText) {
        events.push({
          title,
          description,
          dateText,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.toronto.ca${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`) : '',
          eventUrl: HIGH_PARK_EVENTS_URL
        });
        
        console.log(`🔍 Found event: ${title}`);
      }
    });
    
    // If we don't have many events yet, try a different approach
    if (events.length < 2) {
      console.log('🔍 Looking for additional events using alternative approach...');
      
      // Look for paragraphs that might contain event information
      events$('p, div').each((i, element) => {
        const text = events$(element).text().trim();
        
        // Check if paragraph has date patterns
        const datePatterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)?/i,
          /\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:,?\s*\d{4})?/i
        ];
        
        let dateMatch = null;
        for (const pattern of datePatterns) {
          const match = text.match(pattern);
          if (match) {
            dateMatch = match;
            break;
          }
        }
        
        // If we found a date, look for a potential event title before it
        if (dateMatch) {
          // Get text before the date match as potential title
          const dateIndex = text.indexOf(dateMatch[0]);
          let potentialTitle = text.substring(0, dateIndex).trim();
          
          // If title is too long, try to extract a reasonable title
          if (potentialTitle.length > 100) {
            const titleWords = potentialTitle.split(' ').slice(-7).join(' '); // Take last 7 words
            potentialTitle = titleWords;
          }
          
          // If we have a title and it's reasonable, add as event
          if (potentialTitle && potentialTitle.length > 3 && potentialTitle.length < 100) {
            events.push({
              title: potentialTitle,
              description: text,
              dateText: dateMatch[0],
              imageUrl: '',
              eventUrl: HIGH_PARK_EVENTS_URL
            });
            
            console.log(`🔍 Found potential event: ${potentialTitle}`);
          }
        }
      });
    }
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
        
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
          venue: HIGH_PARK_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl,
          price: 'Free (Park admission is free)',
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
      console.warn('⚠️ Warning: No events found on High Park website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates or missing dates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new High Park events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping High Park events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeHighParkEvents()
  .then(addedEvents => {
    console.log(`✅ High Park scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running High Park scraper:', error);
    process.exit(1);
  });
