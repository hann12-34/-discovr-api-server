const puppeteer = require('puppeteer');
const Event = require('../../models/Event');

/**
 * Scrape events from Meetup.com
 */
async function scrape() {
  console.log('Starting Meetup scraper');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Navigate to Vancouver events page
    await page.goto('https://www.meetup.com/find/?location=ca--bc--Vancouver&source=EVENTS', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for events to load
    await page.waitForSelector('.event-card', { timeout: 30000 });
    
    console.log('Meetup page loaded, extracting events');
    
    // Extract event data
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('.event-card');
      const eventData = [];
      
      eventElements.forEach(element => {
        try {
          // Extract event information
          const name = element.querySelector('.text-gray-900')?.innerText.trim();
          if (!name) return; // Skip events without names
          
          const dateTimeText = element.querySelector('time')?.innerText.trim();
          const locationElement = element.querySelector('.text-gray-600');
          const locationText = locationElement ? locationElement.innerText.trim() : 'Vancouver, BC';
          
          // Get URL and image
          const linkElement = element.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : null;
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : null;
          
          // Get group name and description
          const groupName = element.querySelector('.text-gray-600 span')?.innerText.trim();
          const descriptionElement = element.querySelector('p');
          const description = descriptionElement ? descriptionElement.innerText.trim() : '';
          
          // Add event to results
          eventData.push({
            name,
            dateTimeText,
            locationText,
            eventUrl,
            imageUrl,
            groupName,
            description,
            source: 'meetup'
          });
        } catch (err) {
          console.error('Error extracting Meetup event data:', err);
        }
      });
      
      return eventData;
    });
    
    console.log(`Found ${events.length} events on Meetup`);
    
    // Process and save events
    const savedEvents = [];
    
    for (const event of events) {
      try {
        // Parse date and time
        const { startDate, endDate } = parseMeetupDateTime(event.dateTimeText);
        if (!startDate) continue; // Skip if we can't parse the date
        
        // Generate a unique identifier based on name and date
        const uniqueId = `meetup-${encodeURIComponent(event.name)}-${startDate.toISOString()}`;
        
        // Check if this event already exists in the database
        let existingEvent = await Event.findOne({ 
          source: 'meetup',
          name: event.name,
          startDate: { $gte: new Date(startDate.getTime() - 3600000), $lte: new Date(startDate.getTime() + 3600000) }
        });
        
        if (existingEvent) {
          // Update existing event
          existingEvent.description = event.description || existingEvent.description || '';
          existingEvent.location = event.locationText || 'Vancouver, BC';
          existingEvent.imageURL = event.imageUrl || existingEvent.imageURL;
          existingEvent.sourceURL = event.eventUrl || existingEvent.sourceURL;
          existingEvent.endDate = endDate || existingEvent.endDate || new Date(startDate.getTime() + 7200000); // Default +2h
          
          // Determine season based on the month
          existingEvent.season = getSeason(startDate);
          
          // Determine status
          existingEvent.status = determineStatus(startDate, existingEvent.endDate);
          
          await existingEvent.save();
          savedEvents.push(existingEvent);
        } else {
          // Create new event
          // Determine event type based on name or description
          const eventText = (event.name + ' ' + (event.description || '')).toLowerCase();
          let type = determineEventType(eventText);
          
          const newEvent = new Event({
            name: event.name,
            description: event.description || '',
            location: event.locationText || 'Vancouver, BC',
            latitude: 0, // Would need geocoding for precise coordinates
            longitude: 0, // Would need geocoding for precise coordinates
            startDate,
            endDate: endDate || new Date(startDate.getTime() + 7200000), // Default +2h
            imageURL: event.imageUrl,
            sourceURL: event.eventUrl,
            type,
            price: 'Check website for prices',
            source: 'meetup',
            season: getSeason(startDate),
            status: determineStatus(startDate, endDate)
          });
          
          await newEvent.save();
          savedEvents.push(newEvent);
        }
      } catch (err) {
        console.error('Error saving Meetup event:', err);
      }
    }
    
    console.log(`Successfully processed and saved ${savedEvents.length} Meetup events`);
    return savedEvents;
    
  } catch (error) {
    console.error('Meetup scraper error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Helper function to parse date and time from Meetup format
 */
function parseMeetupDateTime(dateTimeString) {
  if (!dateTimeString) return { startDate: null, endDate: null };
  
  try {
    // Common Meetup formats:
    // "Monday, June 24 · 6:30 PM PDT"
    // "Today · 7:00 PM"
    // "Tomorrow · 7:00 PM" 
    const now = new Date();
    let startDate = new Date();
    let endDate = null;
    
    // Handle "Today" and "Tomorrow"
    if (dateTimeString.toLowerCase().includes('today')) {
      // Keep today's date, just update the time
      const timeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
      }
    } else if (dateTimeString.toLowerCase().includes('tomorrow')) {
      // Set date to tomorrow
      startDate.setDate(startDate.getDate() + 1);
      
      const timeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Regular date format: "Monday, June 24 · 6:30 PM PDT"
      const dateMatch = dateTimeString.match(/([A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2})/);
      if (!dateMatch) return { startDate: null, endDate: null };
      
      const month = getMonthNumber(dateMatch[2]);
      const day = parseInt(dateMatch[3]);
      
      // Set the date (assume current year, adjust if needed)
      startDate.setMonth(month, day);
      
      // If the date is in the past for the current year, it's probably next year
      if (startDate < now && startDate.getMonth() < now.getMonth()) {
        startDate.setFullYear(now.getFullYear() + 1);
      }
      
      // Extract time
      const timeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    // By default, set end time as 2 hours after start
    endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    
    return { startDate, endDate };
  } catch (error) {
    console.error('Error parsing Meetup date time:', error);
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
