/**
 * Toronto Zoo Events Scraper
 * Based on events from https://www.torontozoo.com/events
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const TORONTO_ZOO_URL = 'https://www.torontozoo.com/events';
const TORONTO_ZOO_VENUE = {
  name: 'Toronto Zoo',
  address: '2000 Meadowvale Rd, Toronto, ON M1B 5K7',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M1B 5K7',
  url: 'https://www.torontozoo.com',
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
  const dataToHash = `${TORONTO_ZOO_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    if (dateText.includes(' - ') || dateText.includes(' to ') || dateText.includes(' – ')) {
      // Handle date range format (note: includes both hyphen and en-dash)
      const separator = dateText.includes(' - ') ? ' - ' : (dateText.includes(' – ') ? ' – ' : ' to ');
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
      // Time formats: "9:00 AM", "9 AM", "09:00", "9:00 AM - 4:00 PM"
      // Check if time range is provided
      if (timeText.includes(' - ') || timeText.includes(' to ') || timeText.includes(' – ')) {
        const separator = timeText.includes(' - ') ? ' - ' : (timeText.includes(' – ') ? ' – ' : ' to ');
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
          // Default start time for Zoo events
          startDate.setHours(9, 30, 0, 0); // 9:30 AM default for zoo opening
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
          endDate.setHours(16, 30, 0, 0); // 4:30 PM default for zoo closing
        }
      } else {
        // Single time, assume event lasts 2 hours (typical for zoo events)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 2 hours for zoo events
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        } else {
          // Default times if parsing fails
          startDate.setHours(9, 30, 0, 0); // 9:30 AM default
          endDate.setHours(11, 30, 0, 0);  // 11:30 AM default
        }
      }
    } else {
      // Default times if no time provided - regular zoo hours
      startDate.setHours(9, 30, 0, 0); // 9:30 AM default for zoo opening
      endDate.setHours(16, 30, 0, 0);  // 4:30 PM default for zoo closing
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
  const categories = ['Toronto', 'Zoo', 'Animals', 'Family'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('education') || lowerDesc.includes('education') ||
      lowerTitle.includes('learn') || lowerDesc.includes('learn') ||
      lowerTitle.includes('workshop') || lowerDesc.includes('workshop')) {
    categories.push('Education');
  }
  
  if (lowerTitle.includes('conservation') || lowerDesc.includes('conservation') ||
      lowerTitle.includes('wildlife') || lowerDesc.includes('wildlife') ||
      lowerTitle.includes('nature') || lowerDesc.includes('nature') ||
      lowerTitle.includes('environment') || lowerDesc.includes('environment')) {
    categories.push('Conservation');
  }
  
  if (lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('children') || lowerDesc.includes('children') ||
      lowerTitle.includes('child') || lowerDesc.includes('child') ||
      lowerTitle.includes('family') || lowerDesc.includes('family')) {
    categories.push('Kids');
  }
  
  if (lowerTitle.includes('camp') || lowerDesc.includes('camp')) {
    categories.push('Camp');
  }
  
  if (lowerTitle.includes('holiday') || lowerDesc.includes('holiday') ||
      lowerTitle.includes('christmas') || lowerDesc.includes('christmas') ||
      lowerTitle.includes('halloween') || lowerDesc.includes('halloween') ||
      lowerTitle.includes('easter') || lowerDesc.includes('easter') ||
      lowerTitle.includes('thanksgiving') || lowerDesc.includes('thanksgiving')) {
    categories.push('Holiday');
  }
  
  if (lowerTitle.includes('behind the scenes') || lowerDesc.includes('behind the scenes') ||
      lowerTitle.includes('behind-the-scenes') || lowerDesc.includes('behind-the-scenes') ||
      lowerTitle.includes('exclusive') || lowerDesc.includes('exclusive')) {
    categories.push('Behind the Scenes');
  }
  
  if (lowerTitle.includes('tour') || lowerDesc.includes('tour')) {
    categories.push('Tour');
  }
  
  if (lowerTitle.includes('night') || lowerDesc.includes('night') ||
      lowerTitle.includes('evening') || lowerDesc.includes('evening') ||
      lowerTitle.includes('after hours') || lowerDesc.includes('after hours')) {
    categories.push('Evening');
  }
  
  if (lowerTitle.includes('photo') || lowerDesc.includes('photo') ||
      lowerTitle.includes('photography') || lowerDesc.includes('photography')) {
    categories.push('Photography');
  }
  
  if (lowerTitle.includes('feeding') || lowerDesc.includes('feeding') ||
      lowerTitle.includes('keeper talk') || lowerDesc.includes('keeper talk') ||
      lowerTitle.includes('animal encounter') || lowerDesc.includes('animal encounter')) {
    categories.push('Animal Encounter');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'Zoo admission rates apply. See website for details';
  
  const lowerText = text.toLowerCase();
  
  // Check for free events
  if (lowerText.includes('free') || lowerText.includes('no charge') || lowerText.includes('included with admission')) {
    return 'Free with zoo admission';
  }
  
  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  // Check for admission mentions
  if (lowerText.includes('admission')) {
    return 'Zoo admission rates apply. See website for details';
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Toronto Zoo events
 */
async function scrapeTorontoZooEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Toronto Zoo website...');
    
    // Fetch HTML content from Toronto Zoo website
    const response = await axios.get(TORONTO_ZOO_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .event-card, .event-item, article, .entry, .events-list .item, .event-container, .activity').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"]').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt').text().trim() || 
                           'Join us at the Toronto Zoo for this special event! Visit our website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://www.torontozoo.com${imageUrl}` 
              : `https://www.torontozoo.com/${imageUrl}`;
          }
        }
        
        // Extract URL if available
        let eventUrl = '';
        const linkElement = element.find('a');
        if (linkElement.length > 0) {
          eventUrl = linkElement.attr('href') || '';
          // Make URL absolute if relative
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = eventUrl.startsWith('/') 
              ? `https://www.torontozoo.com${eventUrl}` 
              : `https://www.torontozoo.com/${eventUrl}`;
          }
        }
        
        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"], .cost').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || TORONTO_ZOO_URL,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Toronto Zoo website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.calendar-event, .grid-item, .card, [class*="event"], .event-wrapper, .events-grid .item').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"]').text().trim() || 'Toronto Zoo Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const description = element.find('p, .description, .excerpt').text().trim() || 
                             'Join us at the Toronto Zoo for this special event! Visit our website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://www.torontozoo.com${imageUrl}` 
                : `https://www.torontozoo.com/${imageUrl}`;
            }
          }
          
          // Extract URL if available
          let eventUrl = '';
          const linkElement = element.find('a');
          if (linkElement.length > 0) {
            eventUrl = linkElement.attr('href') || '';
            // Make URL absolute if relative
            if (eventUrl && !eventUrl.startsWith('http')) {
              eventUrl = eventUrl.startsWith('/') 
                ? `https://www.torontozoo.com${eventUrl}` 
                : `https://www.torontozoo.com/${eventUrl}`;
            }
          }
          
          // Extract price information
          const priceText = element.find('.price, [class*="price"], .cost').text().trim();
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || TORONTO_ZOO_URL,
            priceText
          });
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      });
      
      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }
    
    // Process individual event pages if needed
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== TORONTO_ZOO_URL) {
          try {
            const detailResponse = await axios.get(event.eventUrl);
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Try to get more detailed information
            const detailedDesc = detail$('.description, .content, .event-description, .details, [class*="description"], .event-content').text().trim();
            if (detailedDesc && detailedDesc.length > event.description.length) {
              event.description = detailedDesc;
            }
            
            // Try to get more detailed date information
            const detailedDateText = detail$('.dates, .date-range, .calendar, [class*="date"], .event-date').text().trim();
            if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
              event.dateText = detailedDateText;
            }
            
            // Try to get more detailed time information
            const detailedTimeText = detail$('.times, .time-range, [class*="time"], .event-time').text().trim();
            if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
              event.timeText = detailedTimeText;
            }
            
            // Try to get price information
            const detailedPriceText = detail$('.prices, .price-range, [class*="price"], .tickets, .admission, .event-price').text().trim();
            if (detailedPriceText && (!event.priceText || detailedPriceText.length > event.priceText.length)) {
              event.priceText = detailedPriceText;
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      events.length > 0 && console.log('🔍 Fetching additional details from individual event pages...');
      await Promise.all(eventDetailsPromises);
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
          venue: TORONTO_ZOO_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || TORONTO_ZOO_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'Zoo admission rates apply. See website for details',
          location: 'Toronto, Ontario',
          sourceURL: TORONTO_ZOO_URL,
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
      console.warn('⚠️ Warning: No events found on Toronto Zoo website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Toronto Zoo events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Toronto Zoo events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeTorontoZooEvents()
  .then(addedEvents => {
    console.log(`✅ Toronto Zoo scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Toronto Zoo scraper:', error);
    process.exit(1);
  });
