/**
 * Second City Events Scraper
 * Based on events from https://secondcity.com/shows/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const SECOND_CITY_URL = 'https://www.secondcity.com/shows/toronto/';
const SECOND_CITY_VENUE = {
  name: 'Second City Toronto',
  address: '1 York St, Toronto, ON M5J 0E9',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5J 0E9',
  url: 'https://secondcity.com',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

/**
 * Generate a unique event ID based on event details
 */
function generateEventId(title, startDate) {
  const dataToHash = `${SECOND_CITY_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

/**
 * Parse date and time information from text
 */
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up the texts
    dateText = dateText.replace(/\\n/g, ' ').trim();
    timeText = timeText ? timeText.replace(/\\n/g, ' ').trim() : '';
    
    let startDate, endDate;
    
    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ')) {
      // Handle date range format
      const separator = dateText.includes(' - ') ? ' - ' : ' to ';
      const [startDateStr, endDateStr] = dateText.split(separator);
      
      startDate = new Date(startDateStr);
      
      // Handle case where year might be missing in the start date
      if (isNaN(startDate.getTime()) && endDateStr.includes(',')) {
        const year = endDateStr.split(',')[1].trim();
        startDate = new Date(`${startDateStr}, ${year}`);
      }
      
      endDate = new Date(endDateStr);
    } else {
      // Single date
      startDate = new Date(dateText);
      endDate = new Date(dateText);
    }
    
    // Process time information if available
    if (timeText) {
      // Time formats: "7:00 PM", "7 PM", "19:00", "7:00 PM - 9:00 PM"
      // Check if time range is provided
      if (timeText.includes(' - ') || timeText.includes(' to ')) {
        const separator = timeText.includes(' - ') ? ' - ' : ' to ';
        const [startTimeStr, endTimeStr] = timeText.split(separator);
        
        // Parse start time
        const startTimeMatch = startTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1], 10);
          const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2], 10) : 0;
          const period = startTimeMatch[3] ? startTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default start time for comedy shows
          startDate.setHours(20, 0, 0, 0); // 8:00 PM default
        }
        
        // Parse end time
        const endTimeMatch = endTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (endTimeMatch) {
          let hours = parseInt(endTimeMatch[1], 10);
          const minutes = endTimeMatch[2] ? parseInt(endTimeMatch[2], 10) : 0;
          const period = endTimeMatch[3] ? endTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          endDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default end time
          endDate.setHours(22, 0, 0, 0); // 10:00 PM default for comedy shows
        }
      } else {
        // Single time, assume event lasts 2 hours (typical for comedy shows)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 2 hours for comedy shows
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        } else {
          // Default times if parsing fails
          startDate.setHours(20, 0, 0, 0); // 8:00 PM default
          endDate.setHours(22, 0, 0, 0);   // 10:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(20, 0, 0, 0); // 8:00 PM default for evening shows
      endDate.setHours(22, 0, 0, 0);   // 10:00 PM default
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date/time: ${dateText} ${timeText}`, error);
    return null;
  }
}

/**
 * Extract categories from event title and description
 */
function extractCategories(title, description) {
  const categories = ['Toronto', 'Comedy', 'Entertainment'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('improv') || lowerDesc.includes('improv')) {
    categories.push('Improv');
  }
  
  if (lowerTitle.includes('sketch') || lowerDesc.includes('sketch')) {
    categories.push('Sketch Comedy');
  }
  
  if (lowerTitle.includes('stand-up') || lowerDesc.includes('stand-up') ||
      lowerTitle.includes('stand up') || lowerDesc.includes('stand up')) {
    categories.push('Stand-up');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop') ||
      lowerTitle.includes('class') || lowerDesc.includes('class')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('special') || lowerDesc.includes('special')) {
    categories.push('Special Event');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') ||
      lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('children') || lowerDesc.includes('children') ||
      lowerTitle.includes('all ages') || lowerDesc.includes('all ages')) {
    categories.push('Family');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  // Check for free events
  if (lowerText.includes('free') || lowerText.includes('no charge')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  // Check for ticket mentions
  if (lowerText.includes('ticket')) {
    return 'Tickets required. See website for details';
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Second City events
 */
async function scrapeSecondCityEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Second City website...');
    
    // Fetch HTML content from Second City website
    const response = await axios.get(SECOND_CITY_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page  // Primary selectors for Second City's current website structure
    $('h3').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = $(el).text().trim();
        
        // Find the paragraph following the header, which contains the description
        let description = '';
        let currentElement = $(el).next();
        while (currentElement.length && currentElement[0].tagName !== 'H3') {
          if (currentElement[0].tagName === 'P') {
            description += ' ' + currentElement.text().trim();
          }
          currentElement = currentElement.next();
        }
        
        description = description.trim() || 'Join us at Second City Toronto for this special event. See website for more details.';
        
        // Look for venue and showtimes link
        let eventType = '';
        let venueText = '';
        let dateText = '';
        let eventUrl = '';
        
        // Check elements between h3 and the next h3 for venue info and links
        currentElement = $(el).next();
        while (currentElement.length && currentElement[0].tagName !== 'H3') {
          const text = currentElement.text().trim();
          
          if (text.includes('Mainstage') || text.includes('Theatre')) {
            venueText = text;
          }
          
          const link = currentElement.find('a[href*="showtimes"], a[href*="shows/toronto"]');
          if (link.length) {
            eventUrl = link.attr('href');
            if (!eventUrl.startsWith('http')) {
              eventUrl = 'https://www.secondcity.com' + eventUrl;
            }
          }
          
          currentElement = currentElement.next();
        }
        
        // Set default date to current month through next 2 months
        const today = new Date();
        const endDate = new Date();
        endDate.setMonth(today.getMonth() + 2);
        dateText = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()} - ${endDate.toLocaleString('default', { month: 'long' })} ${endDate.getDate()}, ${endDate.getFullYear()}`;
        
        // Determine event type based on venue text
        if (venueText.includes('Mainstage')) {
          eventType = 'Mainstage Show';
        } else if (venueText.includes('Theatre')) {
          eventType = 'Theatre Production';
        } else {
          eventType = 'Comedy Show';
        }
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://secondcity.com${imageUrl}` 
              : `https://secondcity.com/${imageUrl}`;
          }
        }
        
        // Extract URL if available
        let fullEventUrl = eventUrl;
        if (!fullEventUrl.startsWith('http')) {
          fullEventUrl = 'https://www.secondcity.com' + eventUrl;
        }
        
        // Extract price information
        const priceText = element.find('.price, [class*="price"], .cost').text().trim();
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText: '',
          eventType,
          description,
          imageUrl,
          eventUrl: fullEventUrl,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Second City website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      $('h2:contains("Productions")').nextAll().find('a[href*="shows/toronto"]').each((i, el) => {
        try {
          const element = $(el);
          
          const eventUrl = $(el).attr('href');
          const title = $(el).text().trim() || 'Second City Event';
          
          // Set default date to current month through next 2 months
          const today = new Date();
          const endDate = new Date();
          endDate.setMonth(today.getMonth() + 2);
          const dateText = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()} - ${endDate.toLocaleString('default', { month: 'long' })} ${endDate.getDate()}, ${endDate.getFullYear()}`;
          
          const timeText = '';
          const eventType = 'Comedy Show';
          const description = 'Join us at Second City Toronto for this special event. See website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://secondcity.com${imageUrl}` 
                : `https://secondcity.com/${imageUrl}`;
            }
          }
          
          // Extract URL if available
          let fullEventUrl = eventUrl;
          if (!fullEventUrl.startsWith('http')) {
            fullEventUrl = 'https://www.secondcity.com' + eventUrl;
          }
          
          // Extract price information
          const priceText = element.find('.price, [class*="price"], .cost').text().trim();
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            eventType,
            description,
            imageUrl,
            eventUrl: fullEventUrl,
            priceText
          });
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      });
      
      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }
    
    // Process each event
    for (const event of events) {
      try {
        // Parse date information
        const dateInfo = parseDateAndTime(event.dateText, event.timeText);
        
        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid date: ${event.title}`);
          continue;
        }
        
        // Generate unique ID
        const eventId = generateEventId(event.title, dateInfo.startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: SECOND_CITY_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || SECOND_CITY_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: SECOND_CITY_URL,
          lastUpdated: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { id: formattedEvent.id },
            { 
              title: formattedEvent.title,
              startDate: formattedEvent.startDate
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
        console.error(`❌ Error processing event:`, eventError);
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Second City website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Second City events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Second City events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeSecondCityEvents()
  .then(addedEvents => {
    console.log(`✅ Second City scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Second City scraper:', error);
    process.exit(1);
  });
