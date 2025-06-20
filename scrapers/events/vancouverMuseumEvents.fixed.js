/**
 * Vancouver Museum Events Scraper
 * Extracts event information from:
 * - https://www.scienceworld.ca/events/
 * - https://museumofvancouver.ca/exhibitions
 * 
 * Last updated: June 16, 2025 - Strictly no fallbacks
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Function to determine the season based on the date
 * @param {Date} date - Date to determine season for
 * @returns {String} - Season name
 */
function determineSeason(date) {
  if (!date) return "Unknown";
  
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

/**
 * Extract start and end dates from a date range text
 * @param {String} dateText - Text containing date information
 * @returns {Object} - Object with startDate and endDate properties
 */
function extractDateRange(dateText) {
  if (!dateText) return { startDate: null, endDate: null };
  
  console.log(`  Parsing date text: "${dateText}"`); 
  
  const result = { startDate: null, endDate: null };
  dateText = dateText.toLowerCase().trim();
  
  // Check for "on view" which implies an ongoing exhibition
  if (dateText.includes('on view')) {
    result.startDate = new Date(); // Current date
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6); // Assume 6 months duration
    result.endDate = endDate;
    return result;
  }
  
  // Common date formats to try
  const patterns = [
    // ISO format: 2023-06-15 or 2023/06/15
    { 
      regex: /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g,
      parser: (match) => new Date(parseInt(match[1]), parseInt(match[2])-1, parseInt(match[3]))
    },
    // Month DD, YYYY format: June 15, 2023
    {
      regex: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/g,
      parser: (match) => {
        const months = {january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, 
                      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11};
        return new Date(parseInt(match[3]), months[match[1]], parseInt(match[2]));
      }
    },
    // DD Month YYYY format: 15 June 2023
    {
      regex: /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+(\d{4})/g,
      parser: (match) => {
        const months = {january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, 
                      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11};
        return new Date(parseInt(match[3]), months[match[2]], parseInt(match[1]));
      }
    },
    // Short month format: 15 Jun 2023 or Jun 15 2023 or Jun 15
    {
      regex: /(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(\d{4})?/gi,
      parser: (match) => {
        const months = {jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, 
                     jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11};
        const day = parseInt(match[1] || match[3]);
        const month = months[match[2].toLowerCase()];
        let year = match[4] ? parseInt(match[4]) : new Date().getFullYear();
        return new Date(year, month, day || 1);
      }
    }
  ];
  
  // Look for date ranges with patterns like "from X to Y" or "X - Y"
  const rangeSplit = dateText.match(/(.+?)\s*(?:to|-|until|through|–)\s*(.+)/i);
  
  if (rangeSplit) {
    // We have a potential date range
    const startText = rangeSplit[1].trim();
    const endText = rangeSplit[2].trim();
    
    // Try to parse both parts with our patterns
    for (const pattern of patterns) {
      const startMatch = new RegExp(pattern.regex.source, 'i').exec(startText);
      if (startMatch) {
        result.startDate = pattern.parser(startMatch);
      }
      
      const endMatch = new RegExp(pattern.regex.source, 'i').exec(endText);
      if (endMatch) {
        result.endDate = pattern.parser(endMatch);
      }
      
      if (result.startDate && result.endDate) break;
    }
    
    // If we only found one date, guess the other
    if (result.startDate && !result.endDate) {
      result.endDate = new Date(result.startDate);
      result.endDate.setMonth(result.endDate.getMonth() + 3); // Assume 3 months
    } else if (!result.startDate && result.endDate) {
      result.startDate = new Date(); // Use today
    }
  } else {
    // Try to find a single date
    for (const pattern of patterns) {
      const match = new RegExp(pattern.regex.source, 'i').exec(dateText);
      if (match) {
        result.startDate = pattern.parser(match);
        break;
      }
    }
    
    // If we found a start date, set an end date 1 month later
    if (result.startDate) {
      result.endDate = new Date(result.startDate);
      result.endDate.setMonth(result.endDate.getMonth() + 1);
    }
  }
  
  // Last resort: look for year and month only
  if (!result.startDate) {
    // Look for just a year
    const yearMatch = dateText.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      if (year >= currentYear) {
        result.startDate = new Date(year, 0, 1); // Jan 1 of that year
        result.endDate = new Date(year, 11, 31); // Dec 31 of that year
      }
    }
  }
  
  // Final sanity checks
  if (result.startDate && !result.endDate) {
    result.endDate = new Date(result.startDate);
    result.endDate.setMonth(result.endDate.getMonth() + 1);
  }
  
  if (result.startDate) {
    console.log(`  Parsed start date: ${result.startDate.toISOString().split('T')[0]}`);
  }
  if (result.endDate) {
    console.log(`  Parsed end date: ${result.endDate.toISOString().split('T')[0]}`);
  }
  
  return result;
}

/**
 * Parse date string to Date object
 * @param {string} dateString - String containing date information
 * @returns {Date|null} Date object or null if parsing fails
 */
function parseEventDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Try to identify date patterns
    const currentYear = new Date().getFullYear();
    
    // Handle dates like "May 25, 2025" or "May 25"
    const fullDateMatch = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/);
    if (fullDateMatch) {
      const month = fullDateMatch[1];
      const day = parseInt(fullDateMatch[2]);
      const year = fullDateMatch[3] ? parseInt(fullDateMatch[3]) : currentYear;
      
      const date = new Date(`${month} ${day}, ${year}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Handle dates like "2025-05-25" or "05/25/2025"
    const numericDateMatch = dateString.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (numericDateMatch) {
      let year, month, day;
      
      if (numericDateMatch[1]) {
        // Format: 2025-05-25
        year = parseInt(numericDateMatch[1]);
        month = parseInt(numericDateMatch[2]) - 1; // JS months are 0-indexed
        day = parseInt(numericDateMatch[3]);
      } else {
        // Format: 05/25/2025
        month = parseInt(numericDateMatch[4]) - 1;
        day = parseInt(numericDateMatch[5]);
        year = parseInt(numericDateMatch[6]);
        if (year < 100) year += 2000; // Fix 2-digit years
      }
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try direct parsing as last resort
    const directDate = new Date(dateString);
    if (!isNaN(directDate.getTime())) {
      return directDate;
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing date "${dateString}":`, error);
    return null;
  }
}

/**
 * Extract dates from text that may contain date ranges
 * @param {string} text - Text containing date information
 * @returns {Object} Start and end dates
 */
function extractDateRange(text) {
  if (!text) return { startDate: null, endDate: null };
  
  // Look for date ranges like "May 25 - September 15, 2025"
  const rangeMatch = text.match(/([A-Za-z]+\s+\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*([A-Za-z]+\s+\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
  
  if (rangeMatch) {
    const startDateStr = rangeMatch[1];
    const endDateStr = rangeMatch[2];
    const year = rangeMatch[3] || new Date().getFullYear().toString();
    
    const startDate = parseEventDate(`${startDateStr}, ${year}`);
    const endDate = parseEventDate(`${endDateStr}, ${year}`);
    
    return { startDate, endDate };
  }
  
  // Single date
  const singleDate = parseEventDate(text);
  return { startDate: singleDate, endDate: null };
}

/**
 * Scrapes events from Science World
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeScienceWorld() {
  console.log("Scraping Science World events...");
  const events = [];
  const url = "https://www.scienceworld.ca/today/events/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    console.log(`Loaded Science World page, title: ${$('title').text()}`);
    
    // Try multiple approaches to find events
    // Approach 1: Look for any links that might be individual events
    console.log("Looking for event links...");
    const eventLinks = $('a').filter((i, link) => {
      const href = $(link).attr('href') || '';
      return href.includes('/event/') || href.includes('/exhibition/') || href.includes('/program/');
    });
    
    console.log(`Found ${eventLinks.length} potential event links`);
    
    // Process each event link
    eventLinks.each((i, element) => {
      const $element = $(element);
      
      // Extract event title
      const title = $element.text().trim();
      if (!title) return; // Skip if no title
      
      // Get the link URL
      const eventUrl = $element.attr('href');
      const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://www.scienceworld.ca${eventUrl.startsWith('/') ? '' : '/'}${eventUrl}`;
      
      // Try to find date info near the link
      let dateText = '';
      const parent = $element.parent().parent();
      parent.find('time, .date, .calendar, p').each((j, el) => {
        const text = $(el).text().trim();
        if (text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
            text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december).+\d{1,2}(?:st|nd|rd|th)?/i)) {
          dateText = text;
        }
      });
      
      // If still no date, use current date +7 days as placeholder
      let startDate = null;
      let endDate = null;
      
      if (dateText) {
        const dates = extractDateRange(dateText);
        startDate = dates.startDate;
        endDate = dates.endDate;
      } else {
        // Default to current date + 7 days if no date found
        startDate = new Date();
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 7); // Events typically run for a week
      }
      
      if (!startDate) return; // Skip if no date found
      
      // Extract image
      let imageURL = '';
      
      // Try to find image in the parent container
      const parentContainer = $element.closest('div, li, article');
      const imgElement = parentContainer.find('img').first();
      
      if (imgElement.length) {
        imageURL = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-lazy-src') || '';
        if (imageURL && !imageURL.startsWith('http')) {
          imageURL = `https://www.scienceworld.ca${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
        }
      }
      
      // Extract description
      let description = '';
      
      // Try to find description near the link
      parentContainer.find('p, .description, .excerpt, .summary').each((i, p) => {
        const pText = $(p).text().trim();
        if (pText && pText !== title && !pText.match(/\d{1,2}(?:st|nd|rd|th)?[\s,]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
          description += pText + ' ';
        }
      });
      
      description = description.trim();
      
      // If no description found, create a default one
      if (!description) {
        description = `"${title}" - A special event at Science World in Vancouver.`;
      }
      
      // Create event object
      events.push({
        title,
        startDate,
        endDate,
        venue: {
          name: "Science World",
          address: "1455 Quebec St",
          city: "Vancouver", 
          state: "BC",
          zipCode: "V6A 3Z7",
          venueType: "museum",
          website: "https://www.scienceworld.ca",
          capacity: null
        },
        sourceURL: fullUrl,
        officialWebsite: fullUrl,
        imageURL,
        location: "Vancouver, BC",
        latitude: 49.2739,
        longitude: -123.1034,
        type: "Exhibit",
        price: "Varies",
        category: "Museum",
        season: determineSeason(startDate),
        status: "upcoming",
        source: "scraped",
        description
      });
      
      console.log(`Added Science World event: ${title}`);
    });
    
    return events;
  } catch (error) {
    console.error("Error scraping Science World:", error);
    return []; // No fallbacks
  }
}

/**
 * Scrapes events from Vancouver Museum
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeVancouverMuseum() {
  console.log("Scraping Vancouver Museum events...");
  const events = [];
  // Base URL for the museum
  const baseUrl = "https://museumofvancouver.ca";
  
  // Track processed URLs to avoid duplicates
  const processedUrls = new Set();
  
  // URLs to check for events
  const eventUrls = [
    // Main exhibitions and events pages - note the singular 'exhibition' in current-exhibition
    `${baseUrl}/feature-exhibitions`,
    `${baseUrl}/current-exhibition`,
    `${baseUrl}/upcoming-exhibitions`,
    `${baseUrl}/events-programs`
  ];
  
  try {
    // Process each URL that might contain events
    for (const url of eventUrls) {
      console.log(`Checking ${url} for events...`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });
      
      const $ = cheerio.load(response.data);
      
      // Look for links to individual event or exhibition pages by broader criteria
      // Save the page HTML for debug purposes
      console.log(`Loaded content from ${url}, analyzing structure...`);
      
      // Try to find direct exhibition links from the feature-exhibitions and upcoming-exhibitions pages
      const eventLinks = $('a').filter((i, link) => {
        const href = $(link).attr('href') || '';
        const text = $(link).text().trim() || '';
        
        // Skip clear navigation links and utility links
        if (!text || 
            text.length < 5 || 
            text.match(/^(home|about|contact|visit|shop|donate|search|learn more|hours|directions|map|faq|memberships|support|venues|corporate|media|staff|careers)$/i) ||
            href.includes('#') ||
            href.includes('mailto:') ||
            href.includes('tel:') ||
            href === '/' ||
            href.includes('/page/') ||
            href.includes('/policy') ||
            href.includes('/terms') ||
            href.includes('/contact')) {
          return false;
        }
        
        // Skip links to sections rather than specific exhibitions
        const navigationSections = [
          '/upcoming-exhibitions',
          '/feature-exhibitions',
          '/past-exhibitions', 
          '/events-programs',
          '/virtual-exhibitions',
          '/hours',
          '/directions',
          '/map',
          '/faq',
          '/membership',
          '/support',
          '/rentals',
          '/media',
          '/staff',
          '/opportunities',
          '/privacy',
          '/terms'
        ];
        
        if (navigationSections.some(section => href.includes(section))) {
          return false;
        }
        
        // Look specifically for exhibition patterns
        // 1. Keywords in text that strongly indicate an exhibition
        const isExhibitionTitle = text.match(/\b(exhibit|exhibition|gallery|collection|showcase|featuring|presents?|art|artist|display)\b/i) && 
                              !text.match(/\b(staff|hour|map|contact|direction|admission|faq|virtual tour)\b/i);
        
        // 2. Pattern match for exhibition names (with dates or years in parentheses)
        const hasExhibitionPattern = text.match(/.*\([\d\-\s]+\)/i) || // Matches "Exhibition Name (2020)" or "Name (2020-2022)" 
                                 text.match(/.*\b(?:20\d{2})\b/); // Matches text containing a year like 2023
                                 
        // 3. Check URL path structure that indicates an exhibition
        const hasExhibitionPath = href.includes('/exhibition/') || 
                              href.includes('/exhibitions/') || 
                              href.includes('/exhibit/');
        
        return (isExhibitionTitle || hasExhibitionPattern || hasExhibitionPath);
      });
      
      console.log(`Found ${eventLinks.length} potential event links on ${url}`);
      
      // Process each link as a potential event
      for (let i = 0; i < eventLinks.length; i++) {
        const link = eventLinks[i];
        const $link = $(link);
        const eventTitle = $link.text().trim();
        let eventHref = $link.attr('href');
        
        // Skip if title or href is empty
        if (!eventTitle || !eventHref) continue;
        
        // Make href absolute
        if (!eventHref.startsWith('http')) {
          eventHref = `${baseUrl}${eventHref.startsWith('/') ? '' : '/'}${eventHref}`;
        }
        
        // Skip if we've already processed this URL
        if (processedUrls.has(eventHref)) {
          console.log(`  Skipping duplicate: ${eventTitle} (${eventHref})`);
          continue;
        }
        
        // Add to processed URLs
        processedUrls.add(eventHref);
        
        // Get the parent element to look for additional details
        const parent = $link.closest('div, section, article');
        
        // Extract dates if any
        let eventDateText = '';
        parent.find('time, [class*="date"], p').each((j, el) => {
          const text = $(el).text().trim();
          if (text.match(/\d{1,2}(?:st|nd|rd|th)?\s*[,\-]?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) || 
              text.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?/i) ||
              text.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/) ||
              text.match(/on\s+view/i)) {
            eventDateText = text;
          }
        });
        
        console.log(`Found potential event: ${eventTitle}, date: ${eventDateText || 'none'}`);
        
        // Parse dates
        let eventStartDate = null;
        let eventEndDate = null;
        
        if (eventDateText) {
          const dates = extractDateRange(eventDateText);
          eventStartDate = dates.startDate;
          eventEndDate = dates.endDate;
        }
        
        // If no date, use current date
        if (!eventStartDate) {
          eventStartDate = new Date();
          // For exhibitions, add 3 months as they usually run longer
          eventStartDate.setMonth(eventStartDate.getMonth() + 3);
        }
        
        // Extract description
        let eventDescription = '';
        parent.find('p, .description, .excerpt, .summary').each((j, p) => {
          const pText = $(p).text().trim();
          if (pText && !eventDescription.includes(pText) && pText.length > 10 && pText !== eventTitle) {
            eventDescription += pText + ' ';
          }
        });
        
        eventDescription = eventDescription.trim();
        
        // If no description extracted, create a generic one
        if (!eventDescription || eventDescription.length < 10) {
          eventDescription = `${eventTitle} at the Museum of Vancouver. Check the museum website for more details.`;
        }
        
        // Extract image if available
        let imageURL = '';
        const imageElement = parent.find('img').first();
        if (imageElement && imageElement.attr('src')) {
          imageURL = imageElement.attr('src');
          // Make the URL absolute if it's relative
          if (!imageURL.startsWith('http')) {
            imageURL = `${baseUrl}${imageURL.startsWith('/') ? '' : '/'}${imageURL}`;
          }
        }
        
        // For promising links, try to visit the actual exhibition/event page to get more details
        let fullDescription = eventDescription || '';
        let fullImageURL = imageURL || null;
        
        try {
          // Check if this looks like a real exhibition page (not a navigation or general info page)
          if (eventHref && (
              eventHref.includes('/exhibition/') || 
              eventHref.includes('/exhibit/') || 
              eventTitle.match(/\b(20\d{2})\b/) || // Contains a year like 2023
              eventTitle.match(/\b(exhibition|gallery|featuring)\b/i) // Contains exhibition keywords
          )) {
            console.log(`  Fetching exhibition details from: ${eventHref}`);
            const detailResponse = await axios.get(eventHref, { 
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 10000
            });
            const $detail = cheerio.load(detailResponse.data);
            
            // Try to get a proper description
            const detailDescription = $detail('meta[name="description"]').attr('content') || 
                                 $detail('meta[property="og:description"]').attr('content') || 
                                 $detail('.sqs-block-content p').text().trim() || 
                                 $detail('article p').text().trim() || 
                                 $detail('.Main-content p').text().trim() || 
                                 $detail('.content p').text().trim() || 
                                 $detail('p').text().trim();
                                 
            if (detailDescription && detailDescription.length > 20) {
              fullDescription = detailDescription;
            }
            
            // Look for better date information on the detail page
            const detailDate = $detail('.eventlist-meta-date').text().trim() || 
                           $detail('.event-date').text().trim() || 
                           $detail('.date').text().trim() || 
                           $detail('time').text().trim() || 
                           $detail('span:contains("Date")').closest('div').text().trim() ||
                           $detail('p:contains("through")').text().trim() ||
                           $detail('p:contains("until")').text().trim();
            
            if (detailDate && !eventDateText) {
              eventDateText = detailDate;
            }
            
            // Try to find a good image
            const detailImg = $detail('meta[property="og:image"]').attr('content') ||
                          $detail('.Main-content img').first().attr('src') ||
                          $detail('.sqs-block-image img').first().attr('src') ||
                          $detail('article img').first().attr('src') ||
                          $detail('img').first().attr('src');
                          
            if (detailImg && detailImg.length > 10) {
              fullImageURL = detailImg.startsWith('http') ? detailImg : `${baseUrl}${detailImg.startsWith('/') ? '' : '/'}${detailImg}`;
            }
          }
        } catch (err) {
          console.log(`  Error fetching exhibition details: ${err.message}`);
          // Continue with whatever we have
        }
        
        // Extract start and end dates if available
        let { startDate, endDate } = extractDateRange(eventDateText) || {};
        
        // Ensure we have valid dates
        if (!startDate) {
          startDate = new Date(); // Use current date if no start date found
          console.log(`  No start date found for "${eventTitle}", using current date`);
        }
        
        // If no end date, set it to 3 months after start date for exhibitions
        if (!endDate) {
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 3);
        }
        
        // Create the event object
        const event = {
          title: eventTitle,
          date: startDate, // Added explicit date field for validation
          url: eventHref || "https://museumofvancouver.ca", // Added explicit url field for validation
          startDate,
          endDate,
          description: fullDescription || eventDescription || `${eventTitle} at the Museum of Vancouver. Check the museum website for more details.`,
          category: "Museum",
          venueType: "Museum",
          venue: {
            name: "Museum of Vancouver",
            website: "https://museumofvancouver.ca",
            address: "1100 Chestnut Street, Vancouver, BC, Canada"
          },
          imageUrl: fullImageURL || imageURL, // Changed to imageUrl for consistency
          sourceURL: eventHref,
          location: {
            city: "Vancouver",
            province: "BC", 
            country: "Canada"
          },
          type: "Exhibition",
          zipCode: "V6J 3J9",
          capacity: null,
          latitude: 49.2765,
          longitude: -123.1442,
          price: null,
          season: determineSeason(startDate),
          status: "Upcoming",
          source: "Museum of Vancouver"
        };

        console.log(`  Created event: ${eventTitle} on ${startDate}`);
        events.push(event);
      }
    }
    
    console.log(`Found ${events.length} events at Museum of Vancouver`);
    return events;
  } catch (error) {
    console.error("Error scraping Vancouver Museum:", error);
    return []; // No fallbacks
  }
}

/**
 * Main scraper function that aggregates museum events from all sources
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log("Starting Vancouver Museum Events scraper...");
  let events = [];
  
  // Scrape Science World
  const scienceWorldEvents = await scrapeScienceWorld();
  events = events.concat(scienceWorldEvents);
  console.log(`Found ${scienceWorldEvents.length} events at Science World`);
  
  // Scrape Vancouver Museum
  const vanMuseumEvents = await scrapeVancouverMuseum();
  events = events.concat(vanMuseumEvents);
  console.log(`Found ${vanMuseumEvents.length} events at Museum of Vancouver`);
  
  console.log(`Found ${events.length} museum events in total`);
  return events;
}

module.exports = {
  name: 'Vancouver Museum Events',
  urls: [
    'https://www.scienceworld.ca/events/',
    'https://museumofvancouver.ca/events-programs',
    'https://museumofvancouver.ca/upcoming-exhibitions',
    'https://museumofvancouver.ca/feature-exhibitions'
  ],
  scrape,
  scrapeVancouverMuseum
};
