/**
 * Toronto Distillery District Events Scraper
 * Based on events from https://www.thedistillerydistrict.com/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const DISTILLERY_URL = 'https://www.thedistillerydistrict.com/events/';
const DISTILLERY_VENUE = {
  name: 'The Distillery District',
  address: '55 Mill St, Toronto, ON M5A 3C4',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5A 3C4',
  url: 'https://www.thedistillerydistrict.com',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Generate unique event ID
function generateEventId(title, startDate) {
  const dataToHash = `${DISTILLERY_VENUE.name}-${title}-${startDate.toISOString()}`;
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
          startDate.setHours(11, 0, 0, 0); // Default 11:00 AM - typical district opening
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
          endDate.setHours(startDate.getHours() + 3, 0, 0, 0); // Default 3 hours after start
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
          endDate.setHours(endDate.getHours() + 3); // Default 3 hours duration
        } else {
          startDate.setHours(11, 0, 0, 0); // Default 11:00 AM
          endDate.setHours(21, 0, 0, 0);   // Default 9:00 PM - typical district closing
        }
      }
    } else {
      // Default times if no time provided - typical district hours
      startDate.setHours(11, 0, 0, 0); // 11:00 AM
      endDate.setHours(21, 0, 0, 0);   // 9:00 PM
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date/time: ${dateText} ${timeText}`, error);
    return null;
  }
}

// Extract categories from event title and description
function extractCategories(title, description, eventType = '') {
  const categories = ['Toronto', 'Distillery District', 'Arts & Culture'];
  
  // Add event type as category if available
  if (eventType && !categories.includes(eventType)) {
    categories.push(eventType);
  }
  
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  const categoryMatches = {
    'Market': ['market', 'vendor', 'shop', 'shopping', 'boutique'],
    'Art': ['art', 'artist', 'gallery', 'exhibition', 'exhibit', 'installation'],
    'Food & Drink': ['food', 'drink', 'culinary', 'tasting', 'beer', 'wine', 'spirit', 'cocktail', 'restaurant'],
    'Festival': ['festival', 'celebration', 'fair'],
    'Music': ['music', 'concert', 'live music', 'band', 'performance'],
    'Holiday': ['holiday', 'christmas', 'winter', 'halloween', 'easter', 'valentine'],
    'Special Event': ['special event', 'gala', 'party', 'celebration'],
    'Workshop': ['workshop', 'class', 'learn', 'make', 'create'],
    'Theatre': ['theatre', 'theater', 'play', 'stage', 'acting'],
    'Dance': ['dance', 'dancing', 'ballet', 'contemporary'],
    'Historic': ['historic', 'history', 'heritage', 'victorian', 'industrial'],
    'Family': ['family', 'kid', 'child', 'children', 'youth'],
    'Seasonal': ['seasonal', 'spring', 'summer', 'fall', 'autumn', 'winter']
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
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('free')) {
    return 'Free';
  }
  
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  if (lowerText.includes('admission')) {
    return 'Admission fees apply. See website for details.';
  }
  
  return 'See website for details';
}

// Normalize URL to absolute
function normalizeUrl(url, baseUrl = 'https://www.thedistillerydistrict.com') {
  if (!url) return baseUrl;
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
}

// Main scraper function for master scraper
async function scrapeDistilleryDistrictEvents(eventsCollection) {
  let addedEvents = 0;
  
  try {
    
    console.log('🔍 Fetching events from Distillery District website...');
    
    // Fetch HTML content
    const response = await axios.get(DISTILLERY_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Primary selectors - adjust based on actual website structure
    $('.event-item, .event-card, [class*="event"], article, .grid-item, .post, .listing-item').each((i, el) => {
      try {
        const element = $(el);
        
        const title = element.find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
        const dateText = element.find('.date, [class*="date"], time, .when').first().text().trim();
        const timeText = element.find('.time, [class*="time"]').first().text().trim();
        const eventType = element.find('.type, .category, [class*="type"], [class*="category"]').first().text().trim();
        const description = element.find('p, .description, [class*="description"], .excerpt, .summary').first().text().trim() || 
                           'Join us at the Distillery District for this special event. See website for more details.';
        
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
        
        const priceText = element.find('.price, [class*="price"], .cost, .fee, .admission').first().text().trim();
        
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
    
    console.log(`🔍 Found ${events.length} events on Distillery District website`);
    
    // Try alternative selectors if no events found
    if (events.length === 0) {
      $('.card, .column, .item, .program, .tile, [class*="listing"], [class*="post"]').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"], [class*="heading"]').first().text().trim() || 
                       'Distillery District Event';
          const dateText = element.find('.date, [class*="date"], time, .when').first().text().trim();
          const timeText = element.find('.time, [class*="time"]').first().text().trim();
          const eventType = element.find('.type, .category, [class*="type"], [class*="category"]').first().text().trim();
          const description = element.find('p, .description, [class*="description"], .excerpt, .summary').first().text().trim() || 
                             'Join us at the Distillery District for this special event. See website for more details.';
          
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
          
          const priceText = element.find('.price, [class*="price"], .cost, .fee, .admission').first().text().trim();
          
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
      if (event.eventUrl && event.eventUrl !== DISTILLERY_URL) {
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
          const detailedDateText = detail$('.dates, [class*="date"], .schedule, .calendar, .when').text().trim();
          if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
            event.dateText = detailedDateText;
          }
          
          // Try to get more detailed time information
          const detailedTimeText = detail$('.times, [class*="time"], .schedule, .hours').text().trim();
          if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
            event.timeText = detailedTimeText;
          }
          
          // Try to get price information
          const detailedPriceText = detail$('.prices, [class*="price"], .tickets, .admission, .cost, .fee').text().trim();
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
          venue: DISTILLERY_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || DISTILLERY_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: DISTILLERY_URL,
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
      console.warn('⚠️ Warning: No events found on Distillery District website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Distillery District events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Distillery District events:', error);
  }
  
  return addedEvents;
}

// Standalone scraper function (for direct execution)
async function scrapeDistilleryEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    const addedEvents = await scrapeDistilleryDistrictEvents(eventsCollection);
    return addedEvents;
    
  } catch (error) {
    console.error('❌ Error in standalone scraper:', error);
    return 0;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Export for master scraper
module.exports = { scrapeDistilleryDistrictEvents };

// Run the scraper if executed directly
if (require.main === module) {
  scrapeDistilleryEvents()
    .then(addedEvents => {
      console.log(`✅ Distillery District scraper completed. Added ${addedEvents} new events.`);
    })
    .catch(error => {
      console.error('❌ Error running Distillery District scraper:', error);
      process.exit(1);
    });
}
