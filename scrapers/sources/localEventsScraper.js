const axios = require('axios');
const cheerio = require('cheerio');
const Event = require('../../models/Event');

/**
 * Scrape events from a local tourism/events website
 */
async function scrape() {
  console.log('Starting Local Events scraper');
  
  try {
    // Tourism Vancouver events page
    const response = await axios.get('https://www.tourismvancouver.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    
    // Select event listings
    $('.event-item').each((i, element) => {
      try {
        const name = $(element).find('h3.event-item-title').text().trim();
        const dateStr = $(element).find('.event-item-date').text().trim();
        const locationStr = $(element).find('.event-item-location').text().trim() || 'Vancouver, BC';
        const descriptionStr = $(element).find('.event-item-description').text().trim();
        const eventURL = $(element).find('a.event-item-link').attr('href');
        
        // Get full URL if it's relative
        const fullEventURL = eventURL && eventURL.startsWith('/') 
          ? `https://www.tourismvancouver.com${eventURL}` 
          : eventURL;
        
        // Find image (often in background style or img src)
        let imageURL = '';
        const imgElement = $(element).find('img.event-item-image');
        if (imgElement.length > 0) {
          imageURL = imgElement.attr('src');
        } else {
          const divWithBg = $(element).find('[style*="background-image"]');
          if (divWithBg.length > 0) {
            const bgStyle = divWithBg.attr('style');
            const bgUrlMatch = bgStyle.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);
            if (bgUrlMatch && bgUrlMatch[1]) {
              imageURL = bgUrlMatch[1];
            }
          }
        }
        
        // Make the image URL absolute if it's relative
        if (imageURL && imageURL.startsWith('/')) {
          imageURL = `https://www.tourismvancouver.com${imageURL}`;
        }
        
        // Add to events array if we have a name
        if (name) {
          events.push({
            name,
            dateStr,
            locationStr,
            descriptionStr,
            eventURL: fullEventURL,
            imageURL,
            source: 'tourismvancouver'
          });
        }
      } catch (err) {
        console.error('Error extracting event data:', err);
      }
    });
    
    console.log(`Found ${events.length} events on Tourism Vancouver`);
    
    // Process and save events
    const savedEvents = [];
    
    for (const event of events) {
      try {
        // Parse date and time
        const { startDate, endDate } = parseLocalEventDate(event.dateStr);
        if (!startDate) continue; // Skip if we can't parse the date
        
        // Check if this event already exists in the database
        let existingEvent = await Event.findOne({ 
          source: 'tourismvancouver',
          name: event.name,
          startDate: { $gte: new Date(startDate.getTime() - 3600000), $lte: new Date(startDate.getTime() + 3600000) }
        });
        
        if (existingEvent) {
          // Update existing event
          existingEvent.description = event.descriptionStr || existingEvent.description || '';
          existingEvent.location = event.locationStr || 'Vancouver, BC';
          existingEvent.imageURL = event.imageURL || existingEvent.imageURL;
          existingEvent.sourceURL = event.eventURL || existingEvent.sourceURL;
          existingEvent.endDate = endDate || existingEvent.endDate || new Date(startDate.getTime() + 7200000);
          
          // Update season
          existingEvent.season = getSeason(startDate);
          
          // Update status
          existingEvent.status = determineStatus(startDate, existingEvent.endDate);
          
          await existingEvent.save();
          savedEvents.push(existingEvent);
        } else {
          // Create new event
          // Determine event type based on name or description
          const eventText = (event.name + ' ' + (event.descriptionStr || '')).toLowerCase();
          let type = determineEventType(eventText);
          
          const newEvent = new Event({
            name: event.name,
            description: event.descriptionStr || '',
            location: event.locationStr || 'Vancouver, BC',
            latitude: 0,
            longitude: 0,
            startDate,
            endDate: endDate || new Date(startDate.getTime() + 7200000), // Default +2h
            imageURL: event.imageURL,
            sourceURL: event.eventURL,
            type,
            price: 'Check website for prices',
            source: 'tourismvancouver',
            season: getSeason(startDate),
            status: determineStatus(startDate, endDate)
          });
          
          await newEvent.save();
          savedEvents.push(newEvent);
        }
      } catch (err) {
        console.error('Error saving tourism event:', err);
      }
    }
    
    console.log(`Successfully processed and saved ${savedEvents.length} Tourism Vancouver events`);
    return savedEvents;
    
  } catch (error) {
    console.error('Local events scraper error:', error);
    throw error;
  }
}

/**
 * Parse date string from Tourism Vancouver format
 */
function parseLocalEventDate(dateString) {
  if (!dateString) return { startDate: null, endDate: null };
  
  try {
    // Common format: "June 24, 2024 - June 30, 2024" or "August 15, 2024"
    const now = new Date();
    let startDate, endDate;
    
    // Check for date range with dash
    if (dateString.includes('-')) {
      const [startStr, endStr] = dateString.split('-').map(s => s.trim());
      
      // Parse start date
      const startMatch = startStr.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s+(\d{4}))?/);
      if (startMatch) {
        const startMonth = getMonthNumber(startMatch[1]);
        const startDay = parseInt(startMatch[2]);
        const startYear = startMatch[3] ? parseInt(startMatch[3]) : now.getFullYear();
        
        startDate = new Date(startYear, startMonth, startDay);
      }
      
      // Parse end date
      const endMatch = endStr.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s+(\d{4}))?/);
      if (endMatch) {
        const endMonth = getMonthNumber(endMatch[1]);
        const endDay = parseInt(endMatch[2]);
        const endYear = endMatch[3] ? parseInt(endMatch[3]) : now.getFullYear();
        
        endDate = new Date(endYear, endMonth, endDay);
        endDate.setHours(23, 59, 59, 999); // End of day
      }
    } else {
      // Single date format
      const dateMatch = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s+(\d{4}))?/);
      if (dateMatch) {
        const month = getMonthNumber(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        const year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
        
        startDate = new Date(year, month, day);
        // For single day events, end date is same day end of day
        endDate = new Date(year, month, day, 23, 59, 59, 999);
      }
    }
    
    // If we couldn't parse the date, return null
    if (!startDate) {
      return { startDate: null, endDate: null };
    }
    
    // Set default time if not already set (9:00 AM)
    if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
      startDate.setHours(9, 0, 0, 0);
    }
    
    // If no end date was found, default to end of start date
    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error('Error parsing local event date:', error);
    return { startDate: null, endDate: null };
  }
}

/**
 * Convert month name to month number (0-11)
 */
function getMonthNumber(monthName) {
  const months = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  
  return months[monthName.toLowerCase()] || 0;
}

/**
 * Determine event status based on dates
 */
function determineStatus(startDate, endDate) {
  const now = new Date();
  
  if (startDate > now) {
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    return startDate > oneWeekFromNow ? 'upcoming' : 'active';
  } else if (endDate && endDate > now) {
    return 'active';
  } else {
    return 'ended';
  }
}

/**
 * Get season based on date
 */
function getSeason(date) {
  const month = date.getMonth();
  
  if ([11, 0, 1].includes(month)) return 'winter';
  else if ([2, 3, 4].includes(month)) return 'spring';
  else if ([5, 6, 7].includes(month)) return 'summer';
  else return 'fall';
}

/**
 * Determine event type based on name/description
 */
function determineEventType(eventText) {
  const text = eventText.toLowerCase();
  
  if (text.match(/\b(music|concert|dj|band|singer|performance|show)\b/)) {
    return 'music';
  } else if (text.match(/\b(food|dinner|lunch|brunch|cuisine|tasting|wine|beer|cocktail)\b/)) {
    return 'food';
  } else if (text.match(/\b(hike|bike|outdoor|nature|trail|walk|climbing|camping)\b/)) {
    return 'outdoor';
  } else if (text.match(/\b(art|gallery|exhibit|museum|culture|theater|dance|film|festival)\b/)) {
    return 'culture';
  } else if (text.match(/\b(tech|technology|coding|programming|developer|software|data|science)\b/)) {
    return 'tech';
  } else {
    return 'general';
  }
}

module.exports = {
  scrape
};
