/**
 * Toronto Reference Library Events Scraper
 * Based on events from https://www.torontopubliclibrary.ca/programs-and-classes/featured/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const TPL_URL = 'https://www.torontopubliclibrary.ca/programs-and-classes/featured/';
const TPL_VENUE = {
  name: 'Toronto Reference Library',
  address: '789 Yonge St, Toronto, ON M4W 2G8',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M4W 2G8',
  url: 'https://www.torontopubliclibrary.ca',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Generate unique event ID
function generateEventId(title, startDate) {
  const dataToHash = `${TPL_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

// Parse date and time information
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up texts
    dateText = dateText.trim();
    timeText = timeText ? timeText.trim() : '';
    
    // Handle common TPL date formats
    // Example: "Monday, May 27, 2024"
    // Example: "May 27"
    // Example: "May 27 - June 3, 2024"
    
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
          startDate.setHours(13, 0, 0, 0); // Default 1:00 PM
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
          // Default times for library events
          startDate.setHours(13, 0, 0, 0); // Default 1:00 PM
          endDate.setHours(15, 0, 0, 0);   // Default 3:00 PM
        }
      }
    } else {
      // Default times if no time provided - typical library event hours
      startDate.setHours(13, 0, 0, 0); // 1:00 PM
      endDate.setHours(15, 0, 0, 0);   // 3:00 PM
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date/time: ${dateText} ${timeText}`, error);
    return null;
  }
}

// Extract categories from event title and description
function extractCategories(title, description, eventType = '', ageGroup = '') {
  const categories = ['Toronto', 'Library', 'Education'];
  
  // Add event type as category if available
  if (eventType && !categories.includes(eventType)) {
    categories.push(eventType);
  }
  
  // Add age group as category if available
  if (ageGroup) {
    if (ageGroup.toLowerCase().includes('adult')) categories.push('Adult');
    if (ageGroup.toLowerCase().includes('teen')) categories.push('Teen');
    if (ageGroup.toLowerCase().includes('child') || ageGroup.toLowerCase().includes('kid')) categories.push('Children');
    if (ageGroup.toLowerCase().includes('family')) categories.push('Family');
    if (ageGroup.toLowerCase().includes('senior')) categories.push('Senior');
  }
  
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  const categoryMatches = {
    'Book Club': ['book club', 'reading group', 'book discussion', 'literature', 'author'],
    'Technology': ['tech', 'computer', 'digital', 'coding', 'programming', 'internet'],
    'Workshop': ['workshop', 'class', 'learn', 'education', 'hands-on', 'skill'],
    'Art': ['art', 'craft', 'creative', 'painting', 'drawing'],
    'Music': ['music', 'concert', 'performance', 'musical', 'instrument'],
    'Film': ['film', 'movie', 'cinema', 'documentary', 'screening'],
    'Talk': ['talk', 'lecture', 'discussion', 'conversation', 'speaker', 'panel'],
    'Health': ['health', 'wellness', 'fitness', 'medical', 'wellbeing'],
    'Career': ['career', 'job', 'employment', 'resume', 'interview', 'professional'],
    'Finance': ['finance', 'money', 'investment', 'financial', 'budget', 'taxes'],
    'Language': ['language', 'esl', 'english', 'french', 'spanish', 'learn'],
    'Science': ['science', 'stem', 'scientific', 'experiment', 'research'],
    'History': ['history', 'historical', 'heritage', 'archive', 'past'],
    'Writing': ['writing', 'writer', 'write', 'poetry', 'storytelling', 'author'],
    'Gaming': ['game', 'gaming', 'board game', 'video game', 'play'],
    'Special Event': ['special', 'celebration', 'ceremony', 'exclusive', 'gala'],
    'Exhibition': ['exhibition', 'exhibit', 'display', 'showcase', 'gallery']
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
  if (!text) return 'Free';
  
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
  
  // Most library events are free
  return 'Free';
}

// Normalize URL to absolute
function normalizeUrl(url, baseUrl = 'https://www.torontopubliclibrary.ca') {
  if (!url) return baseUrl;
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
}

// Main scraper function
async function scrapeTPLEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Toronto Reference Library website...');
    
    // Fetch HTML content
    const response = await axios.get(TPL_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Primary selectors for TPL events
    $('.event, .program, .program-item, [class*="event"], [class*="program"], .listing').each((i, el) => {
      try {
        const element = $(el);
        
        const title = element.find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
        const dateText = element.find('.date, [class*="date"], time, .when').first().text().trim();
        const timeText = element.find('.time, [class*="time"]').first().text().trim();
        const eventType = element.find('.type, .category, [class*="type"], [class*="category"], .tag, .branch').first().text().trim();
        const ageGroup = element.find('.audience, [class*="audience"], [class*="age"]').first().text().trim();
        const description = element.find('p, .description, [class*="description"], .excerpt, .summary').first().text().trim() || 
                           'Join us at the Toronto Reference Library for this special event. See website for more details.';
        
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
          ageGroup,
          description,
          imageUrl,
          eventUrl,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Toronto Reference Library website`);
    
    // Try alternative selectors if no events found
    if (events.length === 0) {
      $('.card, .grid-item, .col-md, article, .post, .item, .calendar-item, .tile, .highlight-box').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"], [class*="heading"], a strong').first().text().trim() || 
                       'Toronto Reference Library Event';
          const dateText = element.find('.date, [class*="date"], time, .when, [class*="calendar"]').first().text().trim();
          const timeText = element.find('.time, [class*="time"]').first().text().trim();
          const eventType = element.find('.type, .category, [class*="type"], [class*="category"], .tag, .branch').first().text().trim();
          const ageGroup = element.find('.audience, [class*="audience"], [class*="age"]').first().text().trim();
          const description = element.find('p, .description, [class*="description"], .excerpt, .summary').first().text().trim() || 
                             'Join us at the Toronto Reference Library for this special event. See website for more details.';
          
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
            ageGroup,
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
      if (event.eventUrl && !event.eventUrl.includes('#')) {
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
          
          // Try to get more detailed age group information
          const detailedAgeGroup = detail$('.audience, [class*="audience"], [class*="age"]').text().trim();
          if (detailedAgeGroup && (!event.ageGroup || detailedAgeGroup.length > event.ageGroup.length)) {
            event.ageGroup = detailedAgeGroup;
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
          categories: extractCategories(event.title, event.description, event.eventType, event.ageGroup),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: TPL_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || TPL_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'Free',
          location: 'Toronto, Ontario',
          sourceURL: TPL_URL,
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
      console.warn('⚠️ Warning: No events found on Toronto Reference Library website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Toronto Reference Library events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Toronto Reference Library events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeTPLEvents()
  .then(addedEvents => {
    console.log(`✅ Toronto Reference Library scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Toronto Reference Library scraper:', error);
    process.exit(1);
  });
