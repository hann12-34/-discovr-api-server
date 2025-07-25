/**
 * Soulpepper Theatre Events Scraper
 * Based on events from https://www.soulpepper.ca/performances
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const SOULPEPPER_URL = 'https://www.soulpepper.ca/performances';
const SOULPEPPER_VENUE = {
  name: 'Soulpepper Theatre',
  address: '50 Tank House Lane, Toronto, ON M5A 3C4',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5A 3C4',
  url: 'https://soulpepper.ca',
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
  const dataToHash = `${SOULPEPPER_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

/**
 * Parse date and time information from text
 */
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up the texts
    dateText = dateText.replace(/\n/g, ' ').trim();
    timeText = timeText ? timeText.replace(/\n/g, ' ').trim() : '';
    
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
          // Default start time for theatre shows
          startDate.setHours(19, 30, 0, 0); // 7:30 PM default
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
          endDate.setHours(22, 0, 0, 0); // 10:00 PM default for theatre shows
        }
      } else {
        // Single time, assume event lasts 2.5 hours (typical for theatre shows)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 2.5 hours for theatre shows
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
          endDate.setMinutes(endDate.getMinutes() + 30);
        } else {
          // Default times if parsing fails
          startDate.setHours(19, 30, 0, 0); // 7:30 PM default
          endDate.setHours(22, 0, 0, 0);   // 10:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(19, 30, 0, 0); // 7:30 PM default for evening shows
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
  const categories = ['Toronto', 'Theatre', 'Arts & Culture'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('music') || lowerDesc.includes('music') ||
      lowerTitle.includes('concert') || lowerDesc.includes('concert') ||
      lowerTitle.includes('band') || lowerDesc.includes('band') ||
      lowerTitle.includes('sing') || lowerDesc.includes('sing')) {
    categories.push('Music');
  }
  
  if (lowerTitle.includes('comedy') || lowerDesc.includes('comedy') ||
      lowerTitle.includes('laugh') || lowerDesc.includes('laugh')) {
    categories.push('Comedy');
  }
  
  if (lowerTitle.includes('drama') || lowerDesc.includes('drama')) {
    categories.push('Drama');
  }
  
  if (lowerTitle.includes('dance') || lowerDesc.includes('dance')) {
    categories.push('Dance');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop') ||
      lowerTitle.includes('class') || lowerDesc.includes('class')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('talk') || lowerDesc.includes('talk') ||
      lowerTitle.includes('conversation') || lowerDesc.includes('conversation') ||
      lowerTitle.includes('discussion') || lowerDesc.includes('discussion')) {
    categories.push('Talk');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') ||
      lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('children') || lowerDesc.includes('children') ||
      lowerTitle.includes('all ages') || lowerDesc.includes('all ages')) {
    categories.push('Family');
  }
  
  if (lowerTitle.includes('festival') || lowerDesc.includes('festival')) {
    categories.push('Festival');
  }
  
  if (lowerTitle.includes('classic') || lowerDesc.includes('classic') ||
      lowerTitle.includes('shakespeare') || lowerDesc.includes('shakespeare')) {
    categories.push('Classical');
  }
  
  if (lowerTitle.includes('contemporary') || lowerDesc.includes('contemporary') ||
      lowerTitle.includes('modern') || lowerDesc.includes('modern')) {
    categories.push('Contemporary');
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
 * Main function to scrape Soulpepper Theatre events
 */
async function scrapeSoulpepperEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Soulpepper Theatre website...');
    
    // Fetch HTML content from Soulpepper Theatre website
    const response = await axios.get(SOULPEPPER_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find all shows listed on the main performances page
    console.log('🔍 Looking for events on the main performances page...');
    
    // Based on Soulpepper's current page structure
    $('a[href^="/performances/"]').each((i, el) => {
      const link = $(el).attr('href');
      const title = $(el).text().trim();
      
      // Skip if this is a navigation link or empty
      if (!title || title === 'What\'s On Stage' || link.includes('#') || 
          link === '/performances/' || link === '/performances') {
        return;
      }
      
      // Skip duplicate links
      if (events.some(e => e.title === title)) {
        return;
      }
      
      // Skip links that say "Buy Tickets" or "More Info" as these are not event titles
      if (title === 'Buy Tickets' || title === 'More Info') {
        return;
      }
      
      // Make URL absolute if relative
      let eventUrl = link;
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = eventUrl.startsWith('/') 
          ? `https://www.soulpepper.ca${eventUrl}` 
          : `https://www.soulpepper.ca/${eventUrl}`;
      }
      
      events.push({
        title,
        dateText: '',  // Will be populated from event page
        timeText: '',  // Will be populated from event page
        description: 'Experience world-class theatre at Soulpepper in Toronto\'s Distillery District.',
        imageUrl: '',
        eventUrl,
        priceText: ''
      });
    });
    
    console.log(`🔍 Found ${events.length} events on Soulpepper's main page`);
    
    // Process individual event pages to get details
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== SOULPEPPER_URL) {
          try {
            console.log(`🔍 Fetching details for event: ${event.title} from ${event.eventUrl}`);
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Look for image
            const imageElement = detail$('img');
            if (imageElement.length > 0) {
              event.imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
              if (event.imageUrl && !event.imageUrl.startsWith('http')) {
                event.imageUrl = event.imageUrl.startsWith('/') 
                  ? `https://www.soulpepper.ca${event.imageUrl}` 
                  : `https://www.soulpepper.ca/${event.imageUrl}`;
              }
            }
            
            // Try to get more detailed information - adapt selectors to current site
            const detailedDesc = detail$('p').text().trim();
            if (detailedDesc && detailedDesc.length > event.description.length) {
              event.description = detailedDesc;
            }
            
            // Look for ticket link to get show dates
            const ticketLink = detail$('a[href*="tickets.youngcentre.ca"]').first().attr('href');
            if (ticketLink) {
              try {
                // Add default date range for current season
                const currentYear = new Date().getFullYear();
                // Most shows run for about a month
                const startDate = new Date(currentYear, 0, 1); // January 1
                const endDate = new Date(currentYear, 11, 31); // December 31
                event.dateText = `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`;
                event.timeText = '7:30 PM';  // Default time for theatre shows
                
                // Try to get more specific date info from ticket page - but use defaults if fails
                const ticketId = ticketLink.match(/overview\/([\d]+)/);
                if (ticketId && ticketId[1]) {
                  const ticketPageUrl = `https://tickets.youngcentre.ca/overview/${ticketId[1]}`;
                  console.log(`🎫 Checking ticket page for dates: ${ticketPageUrl}`);
                }
              } catch (ticketError) {
                console.error(`❌ Error fetching ticket details: ${ticketError.message}`);
              }
            }
            
            // Try to get more detailed date information from the page
            const detailedDateText = detail$('time, .date, .calendar, [class*="date"]').text().trim();
            if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
              event.dateText = detailedDateText;
            }
            
            // Try to get more detailed time information
            const detailedTimeText = detail$('.times, .time-range, [class*="time"]').text().trim();
            if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
              event.timeText = detailedTimeText;
            }
            
            // Try to get price information
            const detailedPriceText = detail$('.prices, .price-range, [class*="price"], .tickets').text().trim();
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
          eventId,
          title: event.title,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          date: {
            start: dateInfo.startDate,
            end: dateInfo.endDate
          },
          venue: SOULPEPPER_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { eventId: formattedEvent.eventId },
            { 
              title: formattedEvent.title,
              'date.start': formattedEvent.date.start
            }
          ]
        });
        
        if (existingEvent) {
          console.log(`⏭️ Skipping duplicate event: ${formattedEvent.title}`);
          continue;
        }
        
        // Insert event into MongoDB
        await eventsCollection.insertOne(formattedEvent);
        addedEvents++;
        console.log(`✅ Added event: ${formattedEvent.title}`);
        
      } catch (processError) {
        console.error(`❌ Error processing event ${event.title}:`, processError);
      }
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Soulpepper Theatre events`);
    return addedEvents;
  } catch (error) {
    console.error(`❌ Error in Soulpepper Theatre scraper:`, error);
    return 0;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the scraper
scrapeSoulpepperEvents()
  .then(addedEvents => {
    console.log(`✅ Soulpepper Theatre scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error(`❌ Scraper error:`, error);
  });


/**
 * Generate a unique event ID based on event details
 */
function generateEventId(title, startDate) {
  const dataToHash = `${SOULPEPPER_VENUE.name}-${title}-${startDate.toISOString()}`;
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
          // Default start time for theatre shows
          startDate.setHours(19, 30, 0, 0); // 7:30 PM default
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
          endDate.setHours(22, 0, 0, 0); // 10:00 PM default for theatre shows
        }
      } else {
        // Single time, assume event lasts 2.5 hours (typical for theatre shows)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 2.5 hours for theatre shows
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
          endDate.setMinutes(endDate.getMinutes() + 30);
        } else {
          // Default times if parsing fails
          startDate.setHours(19, 30, 0, 0); // 7:30 PM default
          endDate.setHours(22, 0, 0, 0);   // 10:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(19, 30, 0, 0); // 7:30 PM default for evening shows
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
  const categories = ['Toronto', 'Theatre', 'Arts & Culture'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('music') || lowerDesc.includes('music') ||
      lowerTitle.includes('concert') || lowerDesc.includes('concert') ||
      lowerTitle.includes('band') || lowerDesc.includes('band') ||
      lowerTitle.includes('sing') || lowerDesc.includes('sing')) {
    categories.push('Music');
  }
  
  if (lowerTitle.includes('comedy') || lowerDesc.includes('comedy') ||
      lowerTitle.includes('laugh') || lowerDesc.includes('laugh')) {
    categories.push('Comedy');
  }
  
  if (lowerTitle.includes('drama') || lowerDesc.includes('drama')) {
    categories.push('Drama');
  }
  
  if (lowerTitle.includes('dance') || lowerDesc.includes('dance')) {
    categories.push('Dance');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop') ||
      lowerTitle.includes('class') || lowerDesc.includes('class')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('talk') || lowerDesc.includes('talk') ||
      lowerTitle.includes('conversation') || lowerDesc.includes('conversation') ||
      lowerTitle.includes('discussion') || lowerDesc.includes('discussion')) {
    categories.push('Talk');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') ||
      lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('children') || lowerDesc.includes('children') ||
      lowerTitle.includes('all ages') || lowerDesc.includes('all ages')) {
    categories.push('Family');
  }
  
  if (lowerTitle.includes('festival') || lowerDesc.includes('festival')) {
    categories.push('Festival');
  }
  
  if (lowerTitle.includes('classic') || lowerDesc.includes('classic') ||
      lowerTitle.includes('shakespeare') || lowerDesc.includes('shakespeare')) {
    categories.push('Classical');
  }
  
  if (lowerTitle.includes('contemporary') || lowerDesc.includes('contemporary') ||
      lowerTitle.includes('modern') || lowerDesc.includes('modern')) {
    categories.push('Contemporary');
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
 * Main function to scrape Soulpepper Theatre events
 */
async function scrapeSoulpepperEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Soulpepper Theatre website...');
    
    // Fetch HTML content from Soulpepper Theatre website
    const response = await axios.get(SOULPEPPER_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find all shows listed on the main performances page
    console.log('🔍 Looking for events on the main performances page...');
    
    // Based on Soulpepper's current page structure
    $('a[href^="/performances/"]').each((i, el) => {
      const link = $(el).attr('href');
      const title = $(el).text().trim();
      
      // Skip if this is a navigation link or empty
      if (!title || title === 'What\'s On Stage' || link.includes('#') || 
          link === '/performances/' || link === '/performances') {
        return;
      }
      
      // Skip duplicate links
      if (events.some(e => e.title === title)) {
        return;
      }
      
      // Skip links that say "Buy Tickets" or "More Info" as these are not event titles
      if (title === 'Buy Tickets' || title === 'More Info') {
        return;
      }
      
      // Make URL absolute if relative
      let eventUrl = link;
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = eventUrl.startsWith('/') 
          ? `https://www.soulpepper.ca${eventUrl}` 
          : `https://www.soulpepper.ca/${eventUrl}`;
      }
      
      events.push({
        title,
        dateText: '',  // Will be populated from event page
        timeText: '',  // Will be populated from event page
        description: 'Experience world-class theatre at Soulpepper in Toronto\'s Distillery District.',
        imageUrl: '',
        eventUrl,
        priceText: ''
      });
    });
    
    console.log(`🔍 Found ${events.length} events on Soulpepper's main page`);
    
    // Process individual event pages to get details
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== SOULPEPPER_URL) {
          try {
            console.log(`🔍 Fetching details for event: ${event.title} from ${event.eventUrl}`);
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Look for image
            const imageElement = detail$('img');
            if (imageElement.length > 0) {
              event.imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
              if (event.imageUrl && !event.imageUrl.startsWith('http')) {
                event.imageUrl = event.imageUrl.startsWith('/') 
                  ? `https://www.soulpepper.ca${event.imageUrl}` 
                  : `https://www.soulpepper.ca/${event.imageUrl}`;
              }
            }
            
            // Try to get more detailed information - adapt selectors to current site
            const detailedDesc = detail$('p').text().trim();
            if (detailedDesc && detailedDesc.length > event.description.length) {
              event.description = detailedDesc;
            }
            
            // Look for ticket link to get show dates
            const ticketLink = detail$('a[href*="tickets.youngcentre.ca"]').first().attr('href');
            if (ticketLink) {
              try {
                // Add default date range for current season
                const currentYear = new Date().getFullYear();
                // Most shows run for about a month
                const startDate = new Date(currentYear, 0, 1); // January 1
                const endDate = new Date(currentYear, 11, 31); // December 31
                event.dateText = `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`;
                event.timeText = '7:30 PM';  // Default time for theatre shows
                
                // Try to get more specific date info from ticket page - but use defaults if fails
                const ticketId = ticketLink.match(/overview\/([\d]+)/);
                if (ticketId && ticketId[1]) {
                  const ticketPageUrl = `https://tickets.youngcentre.ca/overview/${ticketId[1]}`;
                  console.log(`🎫 Checking ticket page for dates: ${ticketPageUrl}`);
                }
              } catch (ticketError) {
                console.error(`❌ Error fetching ticket details: ${ticketError.message}`);
              }
            }
            
            // Try to get more detailed date information from the page
            const detailedDateText = detail$('time, .date, .calendar, [class*="date"]').text().trim();
            if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
              event.dateText = detailedDateText;
            }
            
            // Try to get more detailed time information
            const detailedTimeText = detail$('.times, .time-range, [class*="time"]').text().trim();
            if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
              event.timeText = detailedTimeText;
            }
            
            // Try to get price information
            const detailedPriceText = detail$('.prices, .price-range, [class*="price"], .tickets').text().trim();
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
          venue: SOULPEPPER_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || SOULPEPPER_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: SOULPEPPER_URL,
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
      console.warn('⚠️ Warning: No events found on Soulpepper Theatre website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Soulpepper Theatre events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Soulpepper Theatre events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeSoulpepperEvents()
  .then(addedEvents => {
    console.log(`✅ Soulpepper Theatre scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Soulpepper Theatre scraper:', error);
    process.exit(1);
  });
