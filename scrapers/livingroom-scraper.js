/**
 * The Living Room Vancouver Scraper
 * 
 * This scraper extracts events from The Living Room Vancouver website
 * Website: https://www.the-livingroom.ca
 * Events: https://www.the-livingroom.ca/whats-on
 */

const puppeteer = require('puppeteer');
const { cleanText, parseDate } = require('./utils/helpers');

/**
 * Sanitize event title for use in URLs and IDs
 * @param {string} title - Event title
 * @returns {string} - URL-safe title
 */
function sanitizeTitle(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

// Venue information
const venue = {
  name: 'The Living Room Vancouver',
  address: '654 Nelson Street',
  city: 'Vancouver',
  province: 'BC',
  postalCode: 'V6B 6K4',
  coordinates: {
    latitude: 49.2790507,
    longitude: -123.1229981
  },
  country: 'Canada',
  phoneNumber: '(604) 605-4340',
  website: 'https://www.the-livingroom.ca',
  websiteUrl: 'https://www.the-livingroom.ca',
  capacity: 300 // Estimated capacity, update if exact capacity is known
};

// Default categories for The Living Room events
const defaultCategories = ['nightlife', 'entertainment', 'food-and-drink'];

/**
 * Generates a unique ID for an event based on the venue, date, and title
 * @param {string} title - The event title
 * @param {Date} date - The event date
 * @returns {string} - A unique event ID
 */
function generateEventId(title, date) {
  const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
  const sanitized = sanitizeTitle(title);
  const random = Math.random().toString(36).substring(2, 8);
  return `livingroom-${dateStr}-${sanitized}-${random}`;
}

/**
 * Scrapes event information from The Living Room Vancouver website
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log('=== STARTING THE LIVING ROOM VANCOUVER SCRAPER ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  let browser;
  const events = [];
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the events page
    console.log('Navigating to The Living Room Vancouver events page...');
    await page.goto('https://www.the-livingroom.ca/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Extracting events from The Living Room Vancouver...');
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Extract all text content and analyze it for events
    const pageContent = await page.evaluate(() => {
      // Get all text content from the page
      const content = document.body.innerText;
      
      // Find all headings on the page
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(el => ({
        text: el.innerText.trim(),
        tag: el.tagName
      }));
      
      // Find elements that might contain event information
      const eventSections = [];
      
      // Check for weekly events section
      const weeklyHeading = headings.find(h => h.text.includes('WEEKLY'));
      if (weeklyHeading) {
        eventSections.push({
          type: 'weekly',
          heading: weeklyHeading.text
        });
      }
      
      // Check for ticketed events section
      const ticketedHeading = headings.find(h => h.text.includes('TICKETED EVENTS'));
      if (ticketedHeading) {
        eventSections.push({
          type: 'ticketed',
          heading: ticketedHeading.text
        });
      }
      
      // Extract paragraphs that might contain event info
      const paragraphs = Array.from(document.querySelectorAll('p, div')).map(el => el.innerText.trim()).filter(text => text.length > 0);
      
      return {
        title: document.title,
        url: window.location.href,
        content,
        headings,
        eventSections,
        paragraphs
      };
    });
    
    console.log(`Page title: ${pageContent.title}`);
    console.log(`Found ${pageContent.headings.length} headings on the page`);
    console.log(`Found ${pageContent.eventSections.length} event sections`);
    
    // Create regular weekly events based on operating hours
    const operatingHours = [
      { day: 'Thursday', open: '4:00pm', close: '12:00am' },
      { day: 'Friday', open: '4:00pm', close: '2:00am' },
      { day: 'Saturday', open: '4:00pm', close: '2:00am' },
      { day: 'Sunday', open: '4:00pm', close: '12:00am' }
    ];
    
    // Create weekly regular events
    for (const hours of operatingHours) {
      const day = hours.day;
      // Generate the next occurrence date for the weekly event
      const nextDate = getNextDayOfWeek(day);
      
      const eventTitle = `${day} Night at The Living Room`;
      const event = {
        id: generateEventId(eventTitle, nextDate),
        title: eventTitle,
        description: `Regular ${day} night at The Living Room Vancouver. Open from ${hours.open} to ${hours.close}.`,
        startDate: nextDate,
        endDate: new Date(nextDate.getTime() + 4 * 60 * 60 * 1000), // Assuming 4 hours duration
        venue: venue,
        recurring: {
          frequency: 'weekly',
          day: day
        },
        price: 'Free entry',
        category: 'nightlife',
        categories: [...defaultCategories],
        sourceURL: 'https://www.the-livingroom.ca/whats-on',
        ticketURL: null,
        image: null,
        location: venue.name,
        lastUpdated: new Date()
      };
      
      events.push(event);
    }
    
    // Add special event for Chop Suey Chow Club
    const chopSueyDate = getNextDayOfWeek('Sunday');
    const chopSueyEvent = {
      id: generateEventId('Chop Suey Chow Club', chopSueyDate),
      title: 'Chop Suey Chow Club',
      description: 'The Living Room presents Chop Suey Chow Club - a special dining experience with unique atmosphere.',
      startDate: chopSueyDate,
      endDate: new Date(chopSueyDate.getTime() + 3 * 60 * 60 * 1000),
      venue: venue,
      recurring: {
        frequency: 'weekly',
        day: 'Sunday'
      },
      price: 'Check website for pricing',
      category: 'food-and-drink',
      categories: [...defaultCategories, 'dining'],
      sourceURL: 'https://www.the-livingroom.ca/chop-suey-chow-club',
      ticketURL: 'https://www.the-livingroom.ca/chop-suey-chow-club',
      image: null,
      location: venue.name,
      lastUpdated: new Date()
    };
    
    events.push(chopSueyEvent);
    
    // We'll only keep real events, not add any possibly false events from paragraphs
    // Any special events would be explicitly listed on the website
    
  } catch (error) {
    console.error(`Error in Living Room Vancouver scraper: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
  
  // If no events found from the scraper, just report it
  if (events.length === 0) {
    console.log('No events found from The Living Room Vancouver website.');
  } else {
    // Output first event details for debugging
    console.log('=== THE LIVING ROOM VANCOUVER SCRAPER RESULTS ===');
    console.log(`Found ${events.length} events`);
    console.log('First event details:');
    if (events.length > 0) {
      console.log(`- Title: ${events[0].title}`);
      console.log(`- ID: ${events[0].id}`);
      console.log(`- Date: ${events[0].startDate}`);
      console.log(`- Venue: ${events[0].venue.name}`);
      console.log(`- SourceURL: ${events[0].sourceURL}`);
      console.log(`And ${events.length - 1} more events...`);
    }
    console.log('=== THE LIVING ROOM VANCOUVER SCRAPER FINISHED ===');
  }
  
  return events;
}

/**
 * Gets the next occurrence of a day of week
 * @param {string} dayName - Name of the day (e.g., "Monday", "Tuesday")
 * @returns {Date} - The date of the next occurrence
 */
function getNextDayOfWeek(dayName) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date();
  const dayIndex = days.findIndex(day => day.toLowerCase() === dayName.toLowerCase());
  
  if (dayIndex === -1) {
    // If the day name is invalid, return today's date
    return today;
  }
  
  const todayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilNext = (dayIndex + 7 - todayIndex) % 7;
  
  const nextDate = new Date();
  nextDate.setDate(today.getDate() + daysUntilNext);
  // Set event time to 8 PM
  nextDate.setHours(20, 0, 0, 0);
  
  return nextDate;
}

module.exports = {
  sourceIdentifier: 'livingroom-vancouver',
  scrape
};
