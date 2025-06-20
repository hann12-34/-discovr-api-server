/**
 * Hollywood Theatre Events Scraper
 * Website: https://www.hollywoodtheatre.ca/events
 * 
 * This scraper extracts events from the Hollywood Theatre website and follows ticket links
 * to TicketWeb to extract proper date information.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');
const { parseEventDate, determineSeason } = require('../utils/dateParsing');

/**
 * Determine if an event is upcoming based on its date
 * @param {Date} eventDate - Event date
 * @returns {boolean} True if the event is upcoming
 */
function isUpcomingEvent(eventDate) {
  if (!eventDate) return false;
  const now = new Date();
  return eventDate >= now;
}


/**
 * Extract event details from a TicketWeb page
 * @param {string} url - The TicketWeb URL to fetch
 * @param {Object} logger - Logger object
 * @returns {Promise<Object|null>} Event details object or null if extraction fails
 */
async function fetchTicketWebEventDetails(url, logger) {
  try {
    logger.info(`Fetching TicketWeb event details from: ${url}`);
    
    // First, try to extract information from the URL itself
    // The URL format is often like: https://www.ticketweb.ca/event/event-name-venue-name-tickets/12345678
    
    // Extract title from URL path
    let titleFromUrl = '';
    const urlPathMatch = url.match(/\/event\/([^/]+)/);
    if (urlPathMatch && urlPathMatch[1]) {
      titleFromUrl = urlPathMatch[1]
        .replace(/-/g, ' ')
        .replace(/hollywood-theatre-tickets/i, '')
        .replace(/at-hollywood-theatre-tickets/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Convert to title case
      titleFromUrl = titleFromUrl
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Attempt to find date in the URL or from event ID
    let dateFromUrl = null;
    
    // Make HTTP request to get the page content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    // Look for date patterns in the entire HTML source
    const html = response.data;
    
    // Look for metadata in JSON-LD format (commonly used for events)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd && jsonLd['@type'] === 'Event' && jsonLd.startDate) {
          dateFromUrl = new Date(jsonLd.startDate);
        }
      } catch (e) {
        logger.warn(`Failed to parse JSON-LD data: ${e.message}`);
      }
    }
    
    // If we still don't have a date, try various regex patterns on the HTML
    if (!dateFromUrl) {
      // Look for ISO format dates (YYYY-MM-DD)
      const isoDateMatch = html.match(/"startDate"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i) ||
                       html.match(/datePublished":"(\d{4}-\d{2}-\d{2})/i) ||
                       html.match(/"eventDate"\s*:\s*"([^"]*\d{4}-\d{2}-\d{2}[^"]*)"/i);
                       
      if (isoDateMatch && isoDateMatch[1]) {
        dateFromUrl = new Date(isoDateMatch[1]);
      } else {
        // Look for full text dates like "June 21, 2024"
        const fullDateMatch = html.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)\s+(20\d{2})\b/i);
        
        if (fullDateMatch) {
          const monthMap = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
            'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
          };
          
          const month = monthMap[fullDateMatch[1].toLowerCase()];
          const day = parseInt(fullDateMatch[2], 10);
          const year = parseInt(fullDateMatch[3], 10);
          
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            dateFromUrl = new Date(year, month, day);
          }
        }
      }
    }
    
    // Try to extract date from URL path
    if (!dateFromUrl) {
      const eventIdMatch = url.match(/\/(\d{4,})\??/);
      if (eventIdMatch && eventIdMatch[1]) {
        // Try to infer date from event ID or URL pattern
        const eventId = eventIdMatch[1];
        logger.info(`Extracted event ID: ${eventId} from URL`);
      }
    }
    
    const $ = cheerio.load(response.data);
    
    // Extract event details from TicketWeb
    const title = $('.event-header__event-name').text().trim() ||
                 $('h1.event-name').text().trim() ||
                 $('meta[property="og:title"]').attr('content') ||
                 $('title').text().replace(/ \| TicketWeb.*$/i, '').trim() ||
                 titleFromUrl;
    
    // Look for date information in several locations
    const dateText = $('.event-header__event-date').text().trim() ||
                   $('.event-date, .date-time, .event-info__date').text().trim() ||
                   $('span:contains("Date")').parent().text().trim() ||
                   $('*:contains("Date:")').text().trim();
    
    let date = dateFromUrl;
    if (!date && dateText) {
      // Extract date from text like "Friday, June 21, 2024 at 8:00 PM PDT"
      const dateMatch = dateText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})\b/i);
      if (dateMatch) {
        const monthMap = {
          'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
          'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
        };
        
        const month = monthMap[dateMatch[1].toLowerCase()];
        const day = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);
        
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
          date = new Date(year, month, day);
        }
      } else {
        // Try parsing with more flexible date parser
        date = parseEventDate(dateText, logger, 'Hollywood Theatre');
      }
    }
    
    // Extract price information
    let price = null;
    const priceText = $('.event-header__event-price').text().trim() ||
                    $('.ticket-price, .price, .event-info__price').text().trim() ||
                    $('span:contains("Price")').parent().text().trim() ||
                    $('*:contains("$")').text();
                    
    if (priceText) {
      const priceMatch = priceText.match(/\$\d+(?:\.\d{2})?/);
      if (priceMatch) {
        price = priceMatch[0];
      }
    }
    
    // Extract description
    const description = $('.event-info__description, .about-event, .event-description')
      .text().trim() ||
      $('meta[property="og:description"]').attr('content') ||
      $('div.event-info, div.event-description').text().trim();
    
    logger.info(`Extracted event details - Title: ${title}, Date: ${date ? date.toISOString() : 'unknown'}`);
    
    return {
      title,
      date,
      price,
      description: description || null
    };
  } catch (error) {
    logger.error({ error }, `Error extracting TicketWeb details from ${url}`);
    return null;
  }
}

/**
 * Try to find events in various HTML structures
 * @param {CheerioStatic} $ - Cheerio object loaded with the page HTML
 * @param {Object} logger - Logger object
 * @returns {Promise<Array>} Array of found events
 */
async function extractEvents($, logger) {
  const events = [];
  const baseUrl = 'https://www.hollywoodtheatre.ca';
  
  // Try multiple common selectors for events
  const eventSelectors = [
    '.event-card', '.event-item', '.card.event', '.w-dyn-item', 
    '.event-block', '.event-listing', 'article.event', 
    '.collection-item', '.event_card', '.event-container'
  ];
  
  // Check for "Buy Tickets" or similar links that might point to events
  const ticketLinkSelectors = ['a:contains("Buy"), a:contains("Ticket")']; 
  
  logger.info('Trying to extract events from page structure');
  
  // Try each selector
  for (const selector of eventSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      logger.info(`Found ${elements.length} potential events with selector: ${selector}`);
      
      // Process elements one by one to allow for async operations
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        try {
          // Try to extract event information with various selectors
          let title = $(el).find('h1, h2, h3, h4, .title, .event-name').first().text().trim() ||
                    $(el).find('a').attr('title');
          
          // If no title found, try to extract from URL
          if (!title || title.trim() === '') {
            const linkEl = $(el).find('a').first();
            const href = linkEl.attr('href') || '';
            
            if (href) {
              // Extract the last part of the URL path
              const urlParts = href.split('/');
              const lastPart = urlParts[urlParts.length - 1];
              
              // Convert slug to title (e.g., 'the-pharcyde-2nd-show' to 'The Pharcyde 2nd Show')
              if (lastPart) {
                title = lastPart
                  .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
                  .replace(/\b\w/g, l => l.toUpperCase())  // Capitalize first letter of each word
                  .replace(/\d+$/, '')  // Remove trailing numbers (like IDs)
                  .replace(/Xjqix$/i, '')  // Remove specific suffixes that might be IDs
                  .trim();
              }
            }
          }
          
          // If still no title, use default
          if (!title || title.trim() === '') {
            // Skip events without a title
            logger.warn('No title found for event, skipping');
            continue;
          }
                       
          const descriptionEl = $(el).find('p, .description, .excerpt, .summary').first();
          const description = descriptionEl.text().trim();
          
          // Try multiple ways to find date information
          const dateText = $(el).find('.date, time, .datetime, .when, [data-date]').text().trim() || 
                         $(el).find('[datetime]').attr('datetime') ||
                         $(el).find('[data-date]').attr('data-date');
          
          // Also look for text that might contain a date
          const paragraphs = $(el).find('p');
          let additionalDateText = '';
          paragraphs.each((i, p) => {
            const text = $(p).text().trim();
            if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) ||
                /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(text) ||
                /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text)) {
              additionalDateText = text;
              return false; // break the loop
            }
          });
                           
          // Extract URL - prefer links with "ticket" or "event" in them
          let url = $(el).find('a:contains("tickets"), a:contains("event")').first().attr('href') ||
                    $(el).find('a').first().attr('href');
                    
          // Make relative URLs absolute
          if (url && !url.startsWith('http')) {
            url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
          } else if (!url) {
            // If no URL found, use the theater's event page
            url = `${baseUrl}/events`;
          }
          
          // Extract image URL
          let imageUrl = $(el).find('img').attr('src') ||
                         $(el).find('img').attr('data-src') ||
                         $(el).css('background-image');
                         
          if (imageUrl && imageUrl.includes('url(')) {
            // Extract URL from CSS background-image
            imageUrl = imageUrl.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
          
          // Parse the date
          let date = null;
          if (dateText) {
            date = parseEventDate(dateText, logger, 'Hollywood Theatre');
          }
          
          // Try additional date text if we didn't find a date
          if (!date && additionalDateText) {
            date = parseEventDate(additionalDateText, logger, 'Hollywood Theatre');
          }
          
          // If still no date, try extracting date info from the URL or title
          if (!date) {
            // Some venues include month/year in URLs
            const urlMatch = url.match(/\/(20\d{2})[\/-](0?[1-9]|1[0-2])[\/-](0?[1-9]|[12]\d|3[01])\//);
            if (urlMatch) {
              const [, year, month, day] = urlMatch;
              date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
              // Check if title has date information like "Event - June 15"
              const titleDateMatch = title.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})(?:st|nd|rd|th)?\b/i);
              if (titleDateMatch) {
                const month = titleDateMatch[1].toLowerCase();
                const day = parseInt(titleDateMatch[2]);
                const monthMap = {
                  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                };
                const monthNum = monthMap[month.substring(0, 3)];
                if (monthNum !== undefined && day) {
                  const currentYear = new Date().getFullYear();
                  date = new Date(currentYear, monthNum, day);
                  
                  // If the date is more than 2 months in the past, assume it's next year
                  const now = new Date();
                  if (date < now && now.getMonth() > (monthNum + 2) % 12) {
                    date.setFullYear(currentYear + 1);
                  }
                }
              }
            }
          }
          
          // Skip events without valid dates
          if (!date) {
            logger.warn(`No valid date found for "${title}", skipping event`);
            continue; // Skip this event - use continue instead of return for a for loop
          }
          
          // Try to extract price information
          let price = null;
          const priceTexts = $(el).find('*:contains("$")').text();
          const priceMatches = priceTexts.match(/\$\d+(?:\.\d{2})?/g);
          if (priceMatches && priceMatches.length > 0) {
            price = priceMatches[0];
          }
          
          // Try to identify event categories
          const categories = [];
          
          // Check event title and description for category keywords
          const contentToCheck = (title + ' ' + description).toLowerCase();
          const categoryKeywords = {
            'music': ['concert', 'music', 'band', 'singer', 'album', 'tour', 'live music', 'performance'],
            'theatre': ['theatre', 'theater', 'play', 'drama', 'stage', 'acting'],
            'comedy': ['comedy', 'comedian', 'stand-up', 'funny', 'jokes'],
            'film': ['film', 'movie', 'cinema', 'screening', 'documentary'],
            'arts': ['art', 'exhibition', 'gallery', 'painting', 'sculpture'],
            'food & drink': ['food', 'drink', 'beer', 'wine', 'tasting', 'dinner', 'culinary'],
            'community': ['community', 'fundraiser', 'charity', 'benefit', 'social']
          };
          
          // Check for category matches
          for (const [category, keywords] of Object.entries(categoryKeywords)) {
            for (const keyword of keywords) {
              if (contentToCheck.includes(keyword)) {
                categories.push(category);
                break;
              }
            }
          }
          
          // If Hollywood Theatre is primarily a music venue, default to music category when no categories found
          if (categories.length === 0) {
            categories.push('music');
          }
          
          // If the URL is a TicketWeb URL, try to follow it for better date information
          if (url && url.includes('ticketweb.ca')) {
            try {
              const ticketEvent = await fetchTicketWebEventDetails(url, logger);
              if (ticketEvent && ticketEvent.date) {
                // Use the more accurate date from TicketWeb
                date = ticketEvent.date;
                
                // Possibly enhance with additional info
                if (ticketEvent.price) price = ticketEvent.price;
                if (ticketEvent.description) description = ticketEvent.description || description;
              }
            } catch (err) {
              logger.error({ error: err }, `Error fetching ticket details from ${url}`);
              // Continue with the basic event info we already have
            }
          }
          
          // Determine tags based on title and description
          const tags = [];
          if (title.toLowerCase().includes('screening')) tags.push('film');
          if (contentToCheck.includes('live')) tags.push('live');
          if (contentToCheck.includes('dj')) tags.push('dj');
          if (title.toLowerCase().includes('fest')) tags.push('festival');
          
          // Add venue tag
          tags.push('hollywood theatre');
          
          // Create the event object with required fields
          const event = {
            title,
            date,  // Required field
            url,   // Required field
            description: description || "",
            imageUrl,
            venue: 'Hollywood Theatre',
            source: 'Hollywood Theatre Website',
            location: {
              address: '3123 W Broadway',
              city: 'Vancouver',
              province: 'BC',
              country: 'Canada',
              postalCode: 'V6K 2H2'
            },
            // Add recommended fields
            price,
            categories,
            tags
          };
          
          events.push(event);
          logger.info(`Found event: ${title}`);
        } catch (err) {
          logger.error({ error: err }, `Error processing event ${i+1}`);
        }
      } // end of for loop
      
      // If we found events with this selector, no need to try others
      if (events.length > 0) break;
    }
  }
  
  // If no events found with conventional selectors, try ticket links
  if (events.length === 0) {
    logger.info('No events found with conventional selectors, checking for ticket links');
    
    for (const selector of ticketLinkSelectors) {
      const ticketLinks = $(selector);
      
      if (ticketLinks.length > 0) {
        logger.info(`Found ${ticketLinks.length} ticket links`);
        
        // Process ticket links one by one to allow for async operations
        for (let i = 0; i < ticketLinks.length; i++) {
          const el = ticketLinks[i];
          try {
            const linkText = $(el).text().trim();
            const url = $(el).attr('href');
            
            // Skip non-event links
            if (linkText.toLowerCase().includes('general') || 
                linkText.toLowerCase().includes('policy')) {
              return;
            }
            
            // Try to find a parent element with more info
            const parent = $(el).closest('div, section, article');
            
            // Extract title - either from link text or from a nearby heading
            let title = linkText;
            if (title.toLowerCase().includes('buy') || title.toLowerCase().includes('ticket')) {
              // Try to get a better title
              title = parent.find('h1, h2, h3, h4').first().text().trim() ||
                     parent.find('.title, .event-title').first().text().trim() ||
                     null;
              if (!title) {
                logger.warn('No title found for event, skipping');
                continue;
              }
            }
            
            // Get date from nearby content
            const dateText = parent.find('.date, time').text().trim();
            let date = parseEventDate(dateText, logger, 'Hollywood Theatre');
            
            // Skip events without valid dates
            if (!date) {
              logger.warn(`No valid date found for ticket link "${title}", skipping event`);
              continue;
            }
            
            // Create the event
            const event = {
              title,
              date,
              url: url && url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`,
              description: parent.find('p').first().text().trim() || "",
              imageUrl: parent.find('img').attr('src') || null,
              venue: 'Hollywood Theatre',
              source: 'Hollywood Theatre Website'
            };
            
            events.push(event);
            logger.info(`Found event from ticket link: ${title}`);
          } catch (err) {
            logger.error({ error: err }, `Error processing ticket link ${i+1}`);
          }
        } // end of ticket links for loop
        
        // Break if we found events
        if (events.length > 0) break;
      }
    }
  }
  
  return events;
}

/**
 * Extract ticket URLs directly from Hollywood Theatre homepage
 * @param {Object} logger - Logger object
 * @returns {Promise<Array<string>>} Array of ticket URLs
 */
async function extractTicketUrls(logger) {
  try {
    logger.info('Directly extracting ticket URLs from Hollywood Theatre homepage');
    
    const url = 'https://www.hollywoodtheatre.ca';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const ticketUrls = [];
    const $ = cheerio.load(response.data);
    
    // Find all links to TicketWeb
    $('a[href*="ticketweb.ca/event"]').each((i, el) => {
      const ticketUrl = $(el).attr('href');
      if (ticketUrl && !ticketUrls.includes(ticketUrl)) {
        ticketUrls.push(ticketUrl);
      }
    });
    
    logger.info(`Found ${ticketUrls.length} unique ticket URLs`);
    return ticketUrls;
  } catch (error) {
    logger.error({ error }, 'Error extracting ticket URLs');
    return [];
  }
}

/**
 * Scrapes events from Hollywood Theatre
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Hollywood Theatre' });
  const events = [];
  
  try {
    logger.info('Starting Hollywood Theatre scraper');
    
    // First try the traditional method of extracting events from the page structure
    const urlsToCheck = [
      'https://www.hollywoodtheatre.ca/events',
      'https://www.hollywoodtheatre.ca'
    ];
    
    // Check each URL for events using traditional extraction
    for (const url of urlsToCheck) {
      try {
        logger.info(`Checking ${url} for events using traditional extraction`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        const foundEvents = await extractEvents($, logger);
        
        if (foundEvents.length > 0) {
          events.push(...foundEvents);
          logger.info(`Found ${foundEvents.length} events on ${url}`);
        } else {
          logger.info(`No events found on ${url} using traditional extraction`);
        }
      } catch (error) {
        logger.error({ error }, `Error fetching ${url}`);
        // Continue to the next URL if this one fails
      }
    }
    
    // If no events found yet, try direct ticket URL extraction method
    if (events.length === 0) {
      logger.info('No events found with traditional extraction, trying direct ticket URL extraction');
      const ticketUrls = await extractTicketUrls(logger);
      
      if (ticketUrls.length > 0) {
        // Process each ticket URL to extract event details
        for (const ticketUrl of ticketUrls) {
          try {
            if (ticketUrl.includes('ticketweb.ca')) {
              logger.info(`Processing TicketWeb URL: ${ticketUrl}`);
              const ticketDetails = await fetchTicketWebEventDetails(ticketUrl, logger);
              
              if (ticketDetails && ticketDetails.date) {
                const { title, date, price, description } = ticketDetails;
                
                // Determine event category based on title and description
                let categories = ['music']; // Default category
                const combinedText = `${title} ${description || ''}`;
                
                if (combinedText.match(/comedy|stand.?up|improv/i)) {
                  categories = ['comedy'];
                } else if (combinedText.match(/film|movie|cinema|screening/i)) {
                  categories = ['film'];
                } else if (combinedText.match(/talk|lecture|discussion|conference/i)) {
                  categories = ['talk'];
                }
                
                // Skip events with missing title or description
                if (!title) {
                  logger.warn(`Missing title for TicketWeb event at ${ticketUrl}, skipping event`);
                  continue;
                }
                
                // Create the event object with no fallbacks
                const event = {
                  title,
                  startDate: date,
                  endDate: null,
                  venue: {
                    name: 'Hollywood Theatre',
                    address: '3123 W Broadway',
                    city: 'Vancouver',
                    state: 'BC',
                    website: 'https://www.hollywoodtheatre.ca'
                  },
                  sourceURL: ticketUrl,
                  officialWebsite: 'https://www.hollywoodtheatre.ca',
                  imageURL: null,
                  price: price || '',
                  location: '3123 W Broadway, Vancouver, BC',
                  type: 'Event',
                  category: categories[0] || 'Entertainment',
                  season: date ? determineSeason(date) : 'all',
                  status: 'active',
                  description: description || ''
                };
                
                events.push(event);
                logger.info(`Found event from TicketWeb URL: ${title}`);
              } else {
                logger.warn(`Failed to extract valid event details from ${ticketUrl}`);
              }
            }
          } catch (error) {
            logger.error({ error }, `Error processing ticket URL: ${ticketUrl}`);
          }
        }
      }
    }
    
    // No placeholder events should be created when no events are found
    if (events.length === 0) {
      logger.info('No events found on any pages');
    }
    
    logger.info(`Returning ${events.length} events from Hollywood Theatre`);
    return events;
    
  } catch (error) {
    logger.error({ error }, 'Error in Hollywood Theatre scraper');
    // No fallbacks - return empty array on error
    return [];
  }
}

module.exports = {
  name: 'Hollywood Theatre',
  urls: ['https://www.hollywoodtheatre.ca/events'],
  scrape
};
