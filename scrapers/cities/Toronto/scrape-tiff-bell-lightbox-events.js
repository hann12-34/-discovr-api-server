/**
 * TIFF Bell Lightbox Events Scraper
 * Based on events from https://www.tiff.net/calendar
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const TIFF_URL = 'https://www.tiff.net/calendar';
const TIFF_VENUE = {
  name: 'TIFF Bell Lightbox',
  address: '350 King St W, Toronto, ON M5V 3X5',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5V 3X5',
  url: 'https://www.tiff.net',
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
  const dataToHash = `${TIFF_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    
    // Remove day of week if present
    dateText = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    
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
      // Time formats: "7:00 PM", "7 PM", "19:00", "7:00 PM - 9:00 PM"
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
          // Default start time for film events - typical film screening times
          startDate.setHours(19, 0, 0, 0); // 7:00 PM default
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
          // Default end time for film events - average movie is ~2 hours
          endDate.setHours(startDate.getHours() + 2, 0, 0, 0); // 2 hours after start
        }
      } else {
        // Single time, assume event lasts 2 hours (typical for film screenings)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 2 hours for film screenings
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        } else {
          // Default times if parsing fails
          startDate.setHours(19, 0, 0, 0); // 7:00 PM default
          endDate.setHours(21, 0, 0, 0);   // 9:00 PM default
        }
      }
    } else {
      // Default times if no time provided - common film screening times
      startDate.setHours(19, 0, 0, 0); // 7:00 PM default for evening screenings
      endDate.setHours(21, 0, 0, 0);   // 9:00 PM default (assuming 2 hour film)
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
function extractCategories(title, description, eventType = '') {
  const categories = ['Toronto', 'Film', 'Entertainment', 'Arts & Culture'];
  
  // Add event type as category if available
  if (eventType) {
    categories.push(eventType);
  }
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('premiere') || lowerDesc.includes('premiere') ||
      lowerTitle.includes('opening') || lowerDesc.includes('opening')) {
    categories.push('Premiere');
  }
  
  if (lowerTitle.includes('festival') || lowerDesc.includes('festival')) {
    categories.push('Festival');
  }
  
  if (lowerTitle.includes('documentary') || lowerDesc.includes('documentary') ||
      lowerTitle.includes('doc') || lowerDesc.includes('doc')) {
    categories.push('Documentary');
  }
  
  if (lowerTitle.includes('talk') || lowerDesc.includes('talk') ||
      lowerTitle.includes('q&a') || lowerDesc.includes('q&a') ||
      lowerTitle.includes('discussion') || lowerDesc.includes('discussion') ||
      lowerTitle.includes('conversation') || lowerDesc.includes('conversation')) {
    categories.push('Talk');
  }
  
  if (lowerTitle.includes('international') || lowerDesc.includes('international') ||
      lowerTitle.includes('foreign') || lowerDesc.includes('foreign')) {
    categories.push('International');
  }
  
  if (lowerTitle.includes('director') || lowerDesc.includes('director') ||
      lowerTitle.includes('filmmaker') || lowerDesc.includes('filmmaker')) {
    categories.push('Director');
  }
  
  if (lowerTitle.includes('classic') || lowerDesc.includes('classic') ||
      lowerTitle.includes('retrospective') || lowerDesc.includes('retrospective')) {
    categories.push('Classic Film');
  }
  
  if (lowerTitle.includes('indie') || lowerDesc.includes('indie') ||
      lowerTitle.includes('independent') || lowerDesc.includes('independent')) {
    categories.push('Independent Film');
  }
  
  if (lowerTitle.includes('short') || lowerDesc.includes('short film') ||
      lowerTitle.includes('shorts') || lowerDesc.includes('shorts')) {
    categories.push('Short Film');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop') ||
      lowerTitle.includes('masterclass') || lowerDesc.includes('masterclass')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') ||
      lowerTitle.includes('children') || lowerDesc.includes('children') ||
      lowerTitle.includes('kids') || lowerDesc.includes('kids')) {
    categories.push('Family');
  }
  
  if (lowerTitle.includes('animation') || lowerDesc.includes('animation') ||
      lowerTitle.includes('animated') || lowerDesc.includes('animated')) {
    categories.push('Animation');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'See website for ticket prices';
  
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
  
  // Check for member mentions
  if (lowerText.includes('member')) {
    return 'Special rates for members. See website for details';
  }
  
  return 'See website for ticket prices';
}

/**
 * Main function to scrape TIFF Bell Lightbox events
 */
async function scrapeTIFFEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from TIFF Bell Lightbox website...');
    
    // Fetch HTML content from TIFF website
    const response = await axios.get(TIFF_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .screening, .film, .event-card, .event-item, article, .calendar-item').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title, .film-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"]').text().trim();
        
        // Extract event type if available
        const eventType = element.find('.type, .event-type, .category, [class*="type"]').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt, .synopsis').text().trim() || 
                           'Join us at TIFF Bell Lightbox for this special screening or event! Visit our website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://www.tiff.net${imageUrl}` 
              : `https://www.tiff.net/${imageUrl}`;
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
              ? `https://www.tiff.net${eventUrl}` 
              : `https://www.tiff.net/${eventUrl}`;
          }
        }
        
        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"], .cost, .ticket-price').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          eventType,
          imageUrl,
          eventUrl: eventUrl || TIFF_URL,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on TIFF Bell Lightbox website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.calendar-entry, .program, .grid-item, .card, [class*="event"], [class*="film"], .listing-item').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"]').text().trim() || 'TIFF Bell Lightbox Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const eventType = element.find('.type, .category, [class*="type"]').text().trim();
          const description = element.find('p, .description, .excerpt, .synopsis').text().trim() || 
                             'Join us at TIFF Bell Lightbox for this special screening or event! Visit our website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://www.tiff.net${imageUrl}` 
                : `https://www.tiff.net/${imageUrl}`;
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
                ? `https://www.tiff.net${eventUrl}` 
                : `https://www.tiff.net/${eventUrl}`;
            }
          }
          
          // Extract price information
          const priceText = element.find('.price, [class*="price"], .cost, .ticket').text().trim();
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            eventType,
            imageUrl,
            eventUrl: eventUrl || TIFF_URL,
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
        if (event.eventUrl && event.eventUrl !== TIFF_URL) {
          try {
            const detailResponse = await axios.get(event.eventUrl);
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Try to get more detailed information
            const detailedDesc = detail$('.description, .content, .event-description, .details, [class*="description"], .synopsis, .film-description').text().trim();
            if (detailedDesc && detailedDesc.length > event.description.length) {
              event.description = detailedDesc;
            }
            
            // Try to get more detailed date information
            const detailedDateText = detail$('.dates, .date-range, .calendar, [class*="date"], .event-date, .screening-date').text().trim();
            if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
              event.dateText = detailedDateText;
            }
            
            // Try to get more detailed time information
            const detailedTimeText = detail$('.times, .time-range, [class*="time"], .event-time, .screening-time').text().trim();
            if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
              event.timeText = detailedTimeText;
            }
            
            // Try to get price information
            const detailedPriceText = detail$('.prices, .price-range, [class*="price"], .tickets, .admission, .ticket-info').text().trim();
            if (detailedPriceText && (!event.priceText || detailedPriceText.length > event.priceText.length)) {
              event.priceText = detailedPriceText;
            }
            
            // Try to get event type if not already available
            if (!event.eventType) {
              const detailedType = detail$('.type, .category, [class*="type"], .film-type').text().trim();
              if (detailedType) {
                event.eventType = detailedType;
              }
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
          categories: extractCategories(event.title, event.description, event.eventType),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: TIFF_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || TIFF_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for ticket prices',
          location: 'Toronto, Ontario',
          sourceURL: TIFF_URL,
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
      console.warn('⚠️ Warning: No events found on TIFF Bell Lightbox website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new TIFF Bell Lightbox events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping TIFF Bell Lightbox events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeTIFFEvents()
  .then(addedEvents => {
    console.log(`✅ TIFF Bell Lightbox scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running TIFF Bell Lightbox scraper:', error);
    process.exit(1);
  });
