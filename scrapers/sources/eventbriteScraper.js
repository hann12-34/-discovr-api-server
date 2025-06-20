const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const Event = require('../../models/Event');

/**
 * Scrape events from Eventbrite
 */
async function scrape() {
  console.log('Starting Eventbrite scraper');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Navigate to Vancouver events page
    await page.goto('https://www.eventbrite.com/d/canada--vancouver/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Eventbrite page loaded, extracting events');
    
    // Extract event data
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('div[data-event-id]');
      const eventData = [];
      
      eventElements.forEach(element => {
        try {
          // Extract event information
          const name = element.querySelector('h2')?.innerText.trim();
          if (!name) return; // Skip events without names
          
          const dateTimeText = element.querySelector('time')?.innerText.trim();
          const locationText = element.querySelector('.card-text--truncated__one')?.innerText.trim();
          const eventUrl = element.querySelector('a[href*="/e/"]')?.href;
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : null;
          
          // Add event to results
          eventData.push({
            name,
            dateTimeText,
            locationText,
            eventUrl,
            imageUrl,
            source: 'eventbrite'
          });
        } catch (err) {
          console.error('Error extracting event data:', err);
        }
      });
      
      return eventData;
    });
    
    console.log(`Found ${events.length} events on Eventbrite`);
    
    // Process and save events
    const savedEvents = [];
    
    for (const event of events) {
      try {
        // Parse date and time
        const { startDate, endDate } = parseEventDateTime(event.dateTimeText);
        if (!startDate) continue; // Skip if we can't parse the date
        
        // Generate a unique identifier based on name and date
        const uniqueId = `eventbrite-${encodeURIComponent(event.name)}-${startDate.toISOString()}`;
        
        // Check if this event already exists in the database
        let existingEvent = await Event.findOne({ 
          source: 'eventbrite',
          name: event.name,
          startDate: startDate
        });
        
        if (existingEvent) {
          // Update existing event
          existingEvent.description = existingEvent.description || '';
          existingEvent.location = event.locationText || 'Vancouver, BC';
          existingEvent.imageURL = event.imageUrl || existingEvent.imageURL;
          existingEvent.sourceURL = event.eventUrl;
          existingEvent.endDate = endDate || startDate;
          
          // Determine season
          const month = startDate.getMonth();
          let season = 'summer';
          if ([11, 0, 1].includes(month)) season = 'winter';
          else if ([2, 3, 4].includes(month)) season = 'spring';
          else if ([5, 6, 7].includes(month)) season = 'summer';
          else season = 'fall';
          
          existingEvent.season = season;
          
          // Determine status
          const now = new Date();
          if (startDate > now) {
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            existingEvent.status = startDate > oneWeekFromNow ? 'upcoming' : 'active';
          } else if (endDate && endDate > now) {
            existingEvent.status = 'active';
          } else {
            existingEvent.status = 'ended';
          }
          
          await existingEvent.save();
          savedEvents.push(existingEvent);
        } else {
          // Create new event
          const month = startDate.getMonth();
          let season = 'summer';
          if ([11, 0, 1].includes(month)) season = 'winter';
          else if ([2, 3, 4].includes(month)) season = 'spring';
          else if ([5, 6, 7].includes(month)) season = 'summer';
          else season = 'fall';
          
          // Determine event type
          let type = 'general';
          const eventNameLower = event.name.toLowerCase();
          if (eventNameLower.includes('concert') || eventNameLower.includes('music') || eventNameLower.includes('festival')) {
            type = 'music';
          } else if (eventNameLower.includes('food') || eventNameLower.includes('dinner')) {
            type = 'food';
          } else if (eventNameLower.includes('art') || eventNameLower.includes('gallery') || eventNameLower.includes('exhibit')) {
            type = 'culture';
          } else if (eventNameLower.includes('hike') || eventNameLower.includes('outdoor') || eventNameLower.includes('nature')) {
            type = 'outdoor';
          }
          
          const newEvent = new Event({
            name: event.name,
            description: '',
            location: event.locationText || 'Vancouver, BC',
            latitude: 0, // Would need geocoding for precise coordinates
            longitude: 0, // Would need geocoding for precise coordinates
            startDate,
            endDate: endDate || startDate,
            imageURL: event.imageUrl,
            sourceURL: event.eventUrl,
            type,
            price: 'Check website for prices',
            source: 'eventbrite',
            season,
            status: determineStatus(startDate, endDate)
          });
          
          await newEvent.save();
          savedEvents.push(newEvent);
        }
      } catch (err) {
        console.error('Error saving event:', err);
      }
    }
    
    console.log(`Successfully processed and saved ${savedEvents.length} Eventbrite events`);
    return savedEvents;
    
  } catch (error) {
    console.error('Eventbrite scraper error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Helper function to parse date and time from Eventbrite format
 */
function parseEventDateTime(dateTimeString) {
  if (!dateTimeString) return { startDate: null, endDate: null };
  
  try {
    // Example formats: "Thu, Jun 13, 7:00 PM", "Sat, Jul 20, 2024 · 11:00 AM" or "Tomorrow at 8:00 PM"
    const now = new Date();
    let startDate = new Date();
    let endDate = null;
    
    // Handle "Today" and "Tomorrow"
    if (dateTimeString.toLowerCase().includes('today')) {
      // Keep today's date but extract the time
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
      // Set date to tomorrow but extract the time
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
      // Regular date format
      const dateMatch = dateTimeString.match(/(Sun|Mon|Tue|Wed|Thu|Fri|Sat),\s+([A-Za-z]{3})\s+(\d{1,2})(?:,\s+(\d{4}))?/);
      if (!dateMatch) return { startDate: null, endDate: null };
      
      const month = getMonthNumber(dateMatch[2]);
      const day = parseInt(dateMatch[3]);
      const year = dateMatch[4] ? parseInt(dateMatch[4]) : now.getFullYear();
      
      // Set the date portion
      startDate.setFullYear(year, month, day);
      
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
      
      // Check for end time (format like "7:00 PM - 9:00 PM")
      const endTimeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (endTimeMatch) {
        endDate = new Date(startDate);
        let endHours = parseInt(endTimeMatch[4]);
        const endMinutes = parseInt(endTimeMatch[5]);
        const isEndPM = endTimeMatch[6].toLowerCase() === 'pm';
        
        if (isEndPM && endHours < 12) endHours += 12;
        if (!isEndPM && endHours === 12) endHours = 0;
        
        endDate.setHours(endHours, endMinutes, 0, 0);
      } else {
        // Default end time is 2 hours after start
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2);
      }
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error('Error parsing date time:', error);
    return { startDate: null, endDate: null };
  }
}

/**
 * Convert month abbreviation to month number (0-11)
 */
function getMonthNumber(monthAbbr) {
  const months = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  
  return months[monthAbbr.toLowerCase()] || 0;
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

module.exports = {
  scrape
};
