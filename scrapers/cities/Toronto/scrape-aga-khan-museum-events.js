/**
 * Aga Khan Museum Events Scraper
 * Based on events from https://www.agakhanmuseum.org/programs/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const AGA_KHAN_URL = 'https://www.agakhanmuseum.org/programs/';
const AGA_KHAN_VENUE = {
  name: 'Aga Khan Museum',
  address: '77 Wynford Dr, North York, ON M3C 1K1',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M3C 1K1',
  url: 'https://www.agakhanmuseum.org',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Generate unique event ID
function generateEventId(title, startDate) {
  const dataToHash = `${AGA_KHAN_VENUE.name}-${title}-${startDate.toISOString()}`;
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
          // Default for museum events
          startDate.setHours(10, 0, 0, 0); // Default 10:00 AM
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
          // Default to 2 hours after start time
          endDate.setHours(startDate.getHours() + 2, 0, 0, 0);
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
          // Default times for museum events
          startDate.setHours(10, 0, 0, 0); // Default 10:00 AM
          endDate.setHours(17, 0, 0, 0);   // Default 5:00 PM
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
  const categories = ['Toronto', 'Museum', 'Islamic Art', 'Culture'];
  
  // Add event type as category if available
  if (eventType && !categories.includes(eventType)) {
    categories.push(eventType);
  }
  
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  const categoryMatches = {
    'Exhibition': ['exhibition', 'gallery', 'collection', 'artifact', 'display'],
    'Performance': ['performance', 'music', 'concert', 'dance', 'theatre', 'theater'],
    'Film': ['film', 'movie', 'cinema', 'documentary', 'screening'],
    'Talk': ['talk', 'lecture', 'discussion', 'conversation', 'speaker', 'panel'],
    'Workshop': ['workshop', 'class', 'learn', 'education', 'hands-on'],
    'Family': ['family', 'kid', 'child', 'children', 'youth'],
    'Art': ['art', 'artist', 'artwork', 'painting', 'sculpture'],
    'Architecture': ['architecture', 'design', 'building', 'structure'],
    'Islamic Culture': ['islamic', 'muslim', 'islam', 'middle east', 'arabic'],
    'History': ['history', 'heritage', 'historical', 'ancient', 'tradition'],
    'Poetry': ['poetry', 'poem', 'spoken word', 'reading', 'literature'],
    'Music': ['music', 'concert', 'performance', 'musical', 'instrument'],
    'Food': ['food', 'culinary', 'cuisine', 'taste', 'dining'],
    'Special Event': ['special', 'celebration', 'ceremony', 'exclusive', 'gala'],
    'Tour': ['tour', 'guided', 'walk', 'visit', 'explore']
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
  
  if (lowerText.includes('pay what you can') || lowerText.includes('pwyc')) {
    return 'Pay What You Can';
  }
  
  if (lowerText.includes('donation')) {
    return 'By donation';
  }
  
  if (lowerText.includes('included with admission') || lowerText.includes('with admission')) {
    return 'Included with museum admission';
  }
  
  return 'See website for details';
}

// Normalize URL to absolute
function normalizeUrl(url, baseUrl = 'https://www.agakhanmuseum.org') {
  if (!url) return baseUrl;
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
}

// Main scraper function
async function scrapeAgaKhanEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Aga Khan Museum website...');
    
    // Fetch HTML content
    const response = await axios.get(AGA_KHAN_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Primary selectors - adjust based on actual website structure
    $('.event, .program-item, .event-card, [class*="event"], [class*="program"], .card, .listing').each((i, el) => {
      try {
        const element = $(el);
        
        const title = element.find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
        const dateText = element.find('.date, [class*="date"], time, .when').first().text().trim();
        const timeText = element.find('.time, [class*="time"]').first().text().trim();
        const eventType = element.find('.type, .category, [class*="type"], [class*="category"], .tag').first().text().trim();
        const description = element.find('p, .description, [class*="description"], .excerpt, .summary').first().text().trim() || 
                           'Join us at the Aga Khan Museum for this special event. See website for more details.';
        
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
    
    console.log(`🔍 Found ${events.length} events on Aga Khan Museum website`);
    
    // Try alternative selectors if no events found
    if (events.length === 0) {
      $('article, .grid-item, .listing-item, .post, .item, .calendar-item, .tile').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"], [class*="heading"]').first().text().trim() || 
                       'Aga Khan Museum Event';
          const dateText = element.find('.date, [class*="date"], time, .when, [class*="calendar"]').first().text().trim();
          const timeText = element.find('.time, [class*="time"]').first().text().trim();
          const eventType = element.find('.type, .category, [class*="type"], [class*="category"], .tag').first().text().trim();
          const description = element.find('p, .description, [class*="description"], .excerpt, .summary').first().text().trim() || 
                             'Join us at the Aga Khan Museum for this special event. See website for more details.';
          
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
          
          // Skip items without title
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
      if (event.eventUrl && event.eventUrl !== AGA_KHAN_URL) {
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
            const detailedType = detail$('.type, .category, [class*="type"], [class*="category"], .tag').text().trim();
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
          venue: AGA_KHAN_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || AGA_KHAN_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: AGA_KHAN_URL,
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
      console.warn('⚠️ Warning: No events found on Aga Khan Museum website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Aga Khan Museum events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Aga Khan Museum events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeAgaKhanEvents()
  .then(addedEvents => {
    console.log(`✅ Aga Khan Museum scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Aga Khan Museum scraper:', error);
    process.exit(1);
  });
