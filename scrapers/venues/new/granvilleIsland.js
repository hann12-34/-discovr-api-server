// scraper for Granville Island events
// URL: https://granvilleisland.com/events

const axios = require('axios');
const cheerio = require('cheerio');
const scrapeLogger = require('../../scrapeLogger');
const { format, parse } = require('date-fns');

// Base URL for Granville Island
const BASE_URL = "https://granvilleisland.com";

// Function to get absolute URL
const getAbsoluteUrl = (relativeUrl) => {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
};

// Helper function to extract date information from event date text
const extractDateInfo = (dateText) => {
  try {
    if (!dateText) return { startDate: null, endDate: null };

    // Examples: "June 20 2025 @ 12:00 am - July 1 2025 @ 11:59 pm"
    // or "July 1 2025 @ 10:00 am - 5:00 pm"
    
    // Check if dateText contains a range with two different dates
    if (dateText.includes(' - ') && dateText.match(/\d{4}/g)?.length > 1) {
      // Two different dates (month-to-month)
      const parts = dateText.split(' - ');
      const startDatePart = parts[0].trim();
      const endDatePart = parts[1].trim();
      
      // Parse start date
      const startDateMatch = startDatePart.match(/(\w+)\s+(\d+)\s+(\d{4})\s+@\s+(\d+):(\d+)\s+(am|pm)/i);
      if (startDateMatch) {
        const [, startMonth, startDay, startYear, startHour, startMin, startAmPm] = startDateMatch;
        let hour = parseInt(startHour, 10);
        if (startAmPm.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (startAmPm.toLowerCase() === 'am' && hour === 12) hour = 0;
        
        const startDate = new Date(
          parseInt(startYear, 10),
          ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(startMonth.toLowerCase()),
          parseInt(startDay, 10),
          hour,
          parseInt(startMin, 10)
        );
        
        // Parse end date
        const endDateMatch = endDatePart.match(/(\w+)\s+(\d+)\s+(\d{4})\s+@\s+(\d+):(\d+)\s+(am|pm)/i);
        if (endDateMatch) {
          const [, endMonth, endDay, endYear, endHour, endMin, endAmPm] = endDateMatch;
          hour = parseInt(endHour, 10);
          if (endAmPm.toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (endAmPm.toLowerCase() === 'am' && hour === 12) hour = 0;
          
          const endDate = new Date(
            parseInt(endYear, 10),
            ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(endMonth.toLowerCase()),
            parseInt(endDay, 10),
            hour,
            parseInt(endMin, 10)
          );
          
          return { startDate, endDate };
        }
      }
    } else if (dateText.includes(' - ')) {
      // Same day, different times
      // Example: "July 1 2025 @ 10:00 am - 5:00 pm"
      const parts = dateText.split(' - ');
      const startDatePart = parts[0].trim();
      const endTimePart = parts[1].trim();
      
      const startDateMatch = startDatePart.match(/(\w+)\s+(\d+)\s+(\d{4})\s+@\s+(\d+):(\d+)\s+(am|pm)/i);
      if (startDateMatch) {
        const [, month, day, year, startHour, startMin, startAmPm] = startDateMatch;
        let startHourNum = parseInt(startHour, 10);
        if (startAmPm.toLowerCase() === 'pm' && startHourNum < 12) startHourNum += 12;
        if (startAmPm.toLowerCase() === 'am' && startHourNum === 12) startHourNum = 0;
        
        const startDate = new Date(
          parseInt(year, 10),
          ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month.toLowerCase()),
          parseInt(day, 10),
          startHourNum,
          parseInt(startMin, 10)
        );
        
        // Parse end time
        const endTimeMatch = endTimePart.match(/(\d+):(\d+)\s+(am|pm)/i);
        if (endTimeMatch) {
          const [, endHour, endMin, endAmPm] = endTimeMatch;
          let endHourNum = parseInt(endHour, 10);
          if (endAmPm.toLowerCase() === 'pm' && endHourNum < 12) endHourNum += 12;
          if (endAmPm.toLowerCase() === 'am' && endHourNum === 12) endHourNum = 0;
          
          const endDate = new Date(
            parseInt(year, 10),
            ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month.toLowerCase()),
            parseInt(day, 10),
            endHourNum,
            parseInt(endMin, 10)
          );
          
          return { startDate, endDate };
        }
      }
    }
    
    // Simple date with no time range
    const simpleDateMatch = dateText.match(/(\w+)\s+(\d+)\s+(\d{4})/i);
    if (simpleDateMatch) {
      const [, month, day, year] = simpleDateMatch;
      const date = new Date(
        parseInt(year, 10),
        ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month.toLowerCase()),
        parseInt(day, 10)
      );
      return { startDate: date, endDate: date };
    }
    
    return { startDate: null, endDate: null };
  } catch (error) {
    scrapeLogger.error(`Error parsing date: ${dateText} - ${error}`);
    return { startDate: null, endDate: null };
  }
};

// Function to scrape individual event details
const scrapeEventDetails = async (eventUrl) => {
  try {
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const title = $('h1').first().text().trim();
    const dateText = $('h2').first().text().trim();
    const description = $('div.tribe-events-content').text().trim();
    const imageUrl = $('img.wp-post-image').attr('src');
    
    // Extract venue information
    let venue = '';
    let address = '';
    $('h2').each(function() {
      if ($(this).text().trim() === 'Venue') {
        venue = $(this).next().find('a').first().text().trim();
        // Try to find address from Google Map link
        const mapLink = $(this).next().find('a[href*="maps.google.com"]');
        if (mapLink.length) {
          const mapHref = mapLink.attr('href');
          const addressMatch = mapHref.match(/q=([^&]+)/);
          if (addressMatch && addressMatch[1]) {
            address = decodeURIComponent(addressMatch[1]).replace(/\+/g, ' ');
          }
        }
      }
    });
    
    // Extract organizer
    let organizer = '';
    $('h2').each(function() {
      if ($(this).text().trim() === 'Organizer') {
        organizer = $(this).next().text().trim();
      }
    });
    
    // Extract event dates
    const { startDate, endDate } = extractDateInfo(dateText);
    
    if (!startDate) {
      scrapeLogger.warn(`Could not parse date for event: ${title} from text: ${dateText}`);
      return null;
    }

    return {
      title,
      date: format(startDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'HH:mm:ss'),
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd'),
      endTime: endDate ? format(endDate, 'HH:mm:ss') : null,
      url: eventUrl,
      venue: venue || 'Granville Island',
      address: address || '1689 Johnston St, Vancouver, BC V6H 3R9',
      city: 'Vancouver',
      region: 'BC',
      country: 'Canada',
      description,
      image: imageUrl ? getAbsoluteUrl(imageUrl) : null,
      organizer,
    };
  } catch (error) {
    scrapeLogger.error(`Error scraping event details from ${eventUrl}: ${error}`);
    return null;
  }
};

// Main scraper function
const scraper = async () => {
  try {
    scrapeLogger.info('Starting Granville Island events scraper');
    
    // Get the main events page
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    const eventLinks = [];
    
    // Extract event links from the page
    $('a[href*="/event/"]').each(function() {
      const href = $(this).attr('href');
      if (href && href.includes('/event/')) {
        const fullUrl = getAbsoluteUrl(href);
        if (!eventLinks.includes(fullUrl)) {
          eventLinks.push(fullUrl);
        }
      }
    });
    
    scrapeLogger.info(`Found ${eventLinks.length} event links on Granville Island`);
    
    // Scrape details for each event
    const eventPromises = eventLinks.map(url => scrapeEventDetails(url));
    const eventResults = await Promise.all(eventPromises);
    
    // Filter out nulls (failed scrapes)
    const events = eventResults.filter(event => event !== null);
    
    scrapeLogger.info(`Successfully scraped ${events.length} events from Granville Island`);
    
    // If no events were found, don't return a fallback event
    if (events.length === 0) {
      scrapeLogger.warn('No events found on Granville Island website, returning empty array');
      return [];
    }
    
    return events;
  } catch (error) {
    scrapeLogger.error(`Error in Granville Island scraper: ${error}`);
    // Return empty array on error, no fallback
    return [];
  }
};

module.exports = scraper;
