/**
 * Hockey Hall of Fame Events Scraper
 * Based on events from https://www.hhof.com/visit/events
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const HHOF_URL = 'https://www.hhof.com/visit/events';
const HHOF_VENUE = {
  name: 'Hockey Hall of Fame',
  address: '30 Yonge St, Toronto, ON M5E 1X8',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5E 1X8',
  url: 'https://www.hhof.com',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Generate unique event ID
function generateEventId(title, startDate) {
  const dataToHash = `${HHOF_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

// Parse date and time information
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up texts
    dateText = dateText.trim();
    timeText = timeText ? timeText.trim() : '';
    
    // Remove day of week if present
    dateText = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    
    let startDate, endDate;
    
    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ') || dateText.includes('–')) {
      const separator = dateText.includes(' - ') ? ' - ' : (dateText.includes('–') ? '–' : ' to ');
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
    
    // Process time information
    if (timeText) {
      // Check if time range is provided
      if (timeText.includes(' - ') || timeText.includes(' to ') || timeText.includes('–')) {
        const separator = timeText.includes(' - ') ? ' - ' : (timeText.includes('–') ? '–' : ' to ');
        const [startTimeStr, endTimeStr] = timeText.split(separator);
        
        // Parse start time
        const startTimeMatch = startTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1], 10);
          const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2], 10) : 0;
          const period = startTimeMatch[3] ? startTimeMatch[3].toLowerCase() : null;
          
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        } else {
          startDate.setHours(10, 0, 0, 0); // Default 10:00 AM - typical opening time
        }
        
        // Parse end time
        const endTimeMatch = endTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (endTimeMatch) {
          let hours = parseInt(endTimeMatch[1], 10);
          const minutes = endTimeMatch[2] ? parseInt(endTimeMatch[2], 10) : 0;
          const period = endTimeMatch[3] ? endTimeMatch[3].toLowerCase() : null;
          
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          endDate.setHours(hours, minutes, 0, 0);
        } else {
          endDate.setHours(startDate.getHours() + 2, 0, 0, 0); // Default 2 hours after start
        }
      } else {
        // Single time
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2); // Default 2 hours duration
        } else {
          startDate.setHours(10, 0, 0, 0); // Default 10:00 AM
          endDate.setHours(17, 0, 0, 0);   // Default 5:00 PM - typical closing time
        }
      }
    } else {
      // Default times if no time provided - typical museum hours
      startDate.setHours(10, 0, 0, 0); // 10:00 AM
      endDate.setHours(17, 0, 0, 0);   // 5:00 PM
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date/time: ${dateText} ${timeText}`, error);
    return null;
  }
}

// Extract categories from event title and description
function extractCategories(title, description, eventType = '') {
  const categories = ['Toronto', 'Sports', 'Hockey', 'Museum'];
  
  // Add event type as category if available
  if (eventType && !categories.includes(eventType)) {
    categories.push(eventType);
  }
  
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  const categoryMatches = {
    'Special Event': ['special', 'celebration', 'party', 'gala', 'limited time'],
    'Exhibition': ['exhibition', 'exhibit', 'showcase', 'display', 'feature'],
    'Family': ['family', 'kids', 'children', 'youth', 'all ages'],
    'Workshop': ['workshop', 'class', 'learn', 'training', 'educational'],
    'Signing': ['signing', 'autograph', 'meet and greet', 'appearance'],
    'Trophy': ['cup', 'trophy', 'stanley cup', 'medal', 'award'],
    'History': ['history', 'historical', 'heritage', 'legacy', 'tradition'],
    'Memorabilia': ['memorabilia', 'collectible', 'collection', 'souvenir', 'artifact'],
    'Induction': ['induction', 'hall of fame', 'ceremony', 'honor', 'recognition'],
    'NHL': ['nhl', 'national hockey league', 'pro', 'professional'],
    'Fan Experience': ['fan', 'experience', 'interactive', 'immersive'],
    'Talk': ['talk', 'lecture', 'discussion', 'speaker', 'presentation'],
    'Charity': ['charity', 'fundraiser', 'benefit', 'donation', 'foundation']
  };
  
  for (const [category, keywords] of Object.entries(categoryMatches)) {
    if (keywords.some(keyword => 
      lowerTitle.includes(keyword) || 
      lowerDesc.includes(keyword)
    )) {
      categories.push(category);
    }
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

// Extract price information
function extractPrice(text) {
  if (!text) return 'Regular admission fees apply. See website for details.';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('free')) {
    return 'Free';
  }
  
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  if (lowerText.includes('member')) {
    return 'Special rates for members. Regular admission for non-members.';
  }
  
  if (lowerText.includes('admission') || lowerText.includes('ticket')) {
    return 'Regular admission fees apply. See website for details.';
  }
  
  return 'Regular admission fees apply. See website for details.';
}

// Normalize URL to absolute
function normalizeUrl(url, baseUrl = 'https://www.hhof.com') {
  if (!url) return baseUrl;
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
}

// Main scraper function
async function scrapeHHOFEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Hockey Hall of Fame website...');
    
    // Fetch HTML content
    const response = await axios.get(HHOF_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Primary selectors - adjust based on actual website structure
    $('.event, .event-item, .event-listing, [class*="event-"], article, .content-block, .card').each((i, el) => {
      try {
        const element = $(el);
        
        const title = element.find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
        const dateText = element.find('.date, [class*="date"], time').first().text().trim();
        const timeText = element.find('.time, [class*="time"]').first().text().trim();
        const eventType = element.find('.type, .category, [class*="type"], [class*="category"]').first().text().trim();
        const description = element.find('p, .description, [class*="description"], .content, .text').first().text().trim() || 
                           'Join us at the Hockey Hall of Fame for this special event. See website for more details.';
        
        let imageUrl = '';
        const imgEl = element.find('img');
        if (imgEl.length) {
          imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';
          imageUrl = normalizeUrl(imageUrl);
        }
        
        let eventUrl = '';
        const linkEl = element.find('a[href]');
        if (linkEl.length) {
          eventUrl = linkEl.attr('href');
          eventUrl = normalizeUrl(eventUrl);
        }
        
        const priceText = element.find('.price, [class*="price"], .cost, .admission').first().text().trim();
        
        // Skip events without title
        if (!title) return;
        
        events.push({
          title,
          dateText,
          timeText,
          eventType,
          description,
          imageUrl,
          eventUrl,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Hockey Hall of Fame website`);
    
    // Try alternative selectors if no events found
    if (events.length === 0) {
      $('.program, .card, .grid-item, .tile, .col, .row, .listing, .item').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"]').first().text().trim() || 'Hockey Hall of Fame Event';
          const dateText = element.find('.date, [class*="date"], time').first().text().trim();
          const timeText = element.find('.time, [class*="time"]').first().text().trim();
          const eventType = element.find('.type, .category, [class*="type"], [class*="category"]').first().text().trim();
          const description = element.find('p, .description, [class*="description"], .content, .text').first().text().trim() || 
                             'Join us at the Hockey Hall of Fame for this special event. See website for more details.';
          
          let imageUrl = '';
          const imgEl = element.find('img');
          if (imgEl.length) {
            imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';
            imageUrl = normalizeUrl(imageUrl);
          }
          
          let eventUrl = '';
          const linkEl = element.find('a[href]');
          if (linkEl.length) {
            eventUrl = linkEl.attr('href');
            eventUrl = normalizeUrl(eventUrl);
          }
          
          const priceText = element.find('.price, [class*="price"], .cost, .admission').first().text().trim();
          
          // Skip items without title or date
          if (!title) return;
          
          events.push({
            title,
            dateText,
            timeText,
            eventType,
            description,
            imageUrl,
            eventUrl,
            priceText
          });
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      });
      
      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }
    
    // Process individual event pages for more details
    const eventDetailsPromises = events.map(async (event) => {
      if (event.eventUrl && event.eventUrl !== HHOF_URL) {
        try {
          const detailResponse = await axios.get(event.eventUrl);
          const detailHtml = detailResponse.data;
          const detail$ = cheerio.load(detailHtml);
          
          // Try to get more detailed description
          const detailedDesc = detail$('.description, .content, [class*="description"], .body, [class*="content"], article p').text().trim();
          if (detailedDesc && detailedDesc.length > event.description.length) {
            event.description = detailedDesc;
          }
          
          // Try to get more detailed date information
          const detailedDateText = detail$('.dates, [class*="date"], .schedule, .calendar').text().trim();
          if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
            event.dateText = detailedDateText;
          }
          
          // Try to get more detailed time information
          const detailedTimeText = detail$('.times, [class*="time"], .schedule, .hours').text().trim();
          if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
            event.timeText = detailedTimeText;
          }
          
          // Try to get price information
          const detailedPriceText = detail$('.prices, [class*="price"], .tickets, .admission, .cost').text().trim();
          if (detailedPriceText && (!event.priceText || detailedPriceText.length > event.priceText.length)) {
            event.priceText = detailedPriceText;
          }
          
          // Try to get event type if not already available
          if (!event.eventType) {
            const detailedType = detail$('.type, .category, [class*="type"], [class*="category"]').text().trim();
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
    
    events.length > 0 && console.log('🔍 Fetching additional details from individual event pages...');
    await Promise.all(eventDetailsPromises);
    
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
          venue: HHOF_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || HHOF_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'Regular admission fees apply. See website for details.',
          location: 'Toronto, Ontario',
          sourceURL: HHOF_URL,
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
    
    // Log status
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Hockey Hall of Fame website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Hockey Hall of Fame events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Hockey Hall of Fame events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeHHOFEvents()
  .then(addedEvents => {
    console.log(`✅ Hockey Hall of Fame scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Hockey Hall of Fame scraper:', error);
    process.exit(1);
  });
