/**
 * Capilano Suspension Bridge Park Scraper
 * URL: https://www.capbridge.com/events/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { format, parse, isValid } = require('date-fns');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Capilano Suspension Bridge Park';
const url = 'https://www.capbridge.com/';
const eventsUrl = 'https://www.capbridge.com/events/';
const venueAddress = '3735 Capilano Road';
const venueCity = 'North Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V7R 4J1';
const venueCountry = 'Canada';

/**
 * Scrape events from Capilano Suspension Bridge Park
 * @returns {Array} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: name });
  logger.info('Starting Capilano Suspension Bridge Park scraper');

  try {
    // Configure axios with headers to mimic a browser
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': url,
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    };

    // Fetch the events page
    logger.info('Fetching events page');
    const response = await axios.get(eventsUrl, axiosConfig);
    const $ = cheerio.load(response.data);
    const events = [];

    // Process seasonal events (Canyon Lights, etc.)
    logger.info('Processing seasonal events');
    const eventSections = $('.fusion-text, .fusion-builder-row, article, section').filter(function() {
      const text = $(this).text().toLowerCase();
      return text.includes('event') || text.includes('season') || text.includes('special') || 
             text.includes('light') || text.includes('holiday') || text.includes('festival');
    });
    
    eventSections.each((i, section) => {
      try {
        // Look for event headings
        $(section).find('h1, h2, h3, h4, h5').each((j, heading) => {
          const headingText = $(heading).text().trim();
          if (!headingText || headingText.length < 4) return;
          
          // Skip navigation or generic headings
          if (headingText.toLowerCase().includes('menu') || 
              headingText.toLowerCase().includes('navigation') ||
              headingText.toLowerCase() === 'events') return;
          
          // Get surrounding content for this event
          const eventContent = $(heading).parent();
          
          // Extract date information
          let dateText = '';
          eventContent.find('p').each((k, paragraph) => {
            const paragraphText = $(paragraph).text().trim();
            if (paragraphText.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i) ||
                paragraphText.match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i)) {
              dateText = paragraphText;
            }
          });
          
          // Extract or determine dates
          let startDate = '';
          let endDate = '';
          const currentYear = new Date().getFullYear();
          
          if (dateText) {
            // Extract date ranges
            const dateRange = dateText.match(/([a-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)\s*(?:to|-|–|—|through)\s*([a-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)/i);
            
            if (dateRange) {
              startDate = dateRange[1];
              endDate = dateRange[2];
              
              // Add year if missing
              if (!startDate.includes(currentYear.toString()) && !startDate.includes((currentYear + 1).toString())) {
                startDate += `, ${currentYear}`;
              }
              if (!endDate.includes(currentYear.toString()) && !endDate.includes((currentYear + 1).toString())) {
                endDate += `, ${currentYear}`;
              }
            } else {
              // Check for single date
              const singleDate = dateText.match(/([a-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)/i);
              if (singleDate) {
                startDate = singleDate[0];
                
                // Add year if missing
                if (!startDate.includes(currentYear.toString()) && !startDate.includes((currentYear + 1).toString())) {
                  startDate += `, ${currentYear}`;
                }
                
                // For single-date events, end date is same as start date
                endDate = startDate;
              }
            }
          }
          
          // Determine event based on heading text
          if (headingText.toLowerCase().includes('canyon lights') || headingText.toLowerCase().includes('holiday')) {
            // Canyon Lights typically runs November-January
            if (!startDate) {
              startDate = `November 22, ${currentYear}`;
              endDate = `January 5, ${currentYear + 1}`;
            }
            
            // Extract description
            let description = '';
            eventContent.find('p').each((m, para) => {
              const paraText = $(para).text().trim();
              if (paraText && paraText.length > 20 && !paraText.match(/^\d{1,2}:\d{2}/)) {
                description += paraText + ' ';
              }
            });
            
            if (!description) {
              description = `Experience the magical Canyon Lights winter festival at ${name}, where thousands of lights transform the suspension bridge and park into a world of festive wonder.`;
            }
            
            // Extract image
            let imageUrl = eventContent.find('img').first().attr('src');
            if (!imageUrl) {
              imageUrl = $('img[src*="canyon"], img[src*="lights"], img[src*="night"]').first().attr('src');
            }
            
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, url).href;
            }
            
            const event = {
              title: headingText,
              date: `${startDate} - ${endDate}`,
              url: eventsUrl,
              venue: name,
              address: venueAddress,
              city: venueCity,
              region: venueRegion,
              postalCode: venuePostalCode,
              country: venueCountry,
              description: description.trim(),
              image: imageUrl
            };
            
            logger.info({ event: { title: event.title, date: event.date } }, 'Found seasonal event');
            events.push(event);
          } else {
            // Other events
            // Extract description
            let description = '';
            eventContent.find('p').each((m, para) => {
              const paraText = $(para).text().trim();
              if (paraText && paraText.length > 20 && !paraText.match(/^\d{1,2}:\d{2}/)) {
                description += paraText + ' ';
              }
            });
            
            if (!description) {
              description = `${headingText} at ${name}. Experience adventure, history, and culture at North Vancouver's most popular attraction.`;
            }
            
            // Extract image
            let imageUrl = eventContent.find('img').first().attr('src');
            if (!imageUrl) {
              // Try to find relevant images
              const imgKeywords = headingText.toLowerCase().split(' ');
              $('img').each((n, img) => {
                const imgSrc = $(img).attr('src') || '';
                const imgAlt = $(img).attr('alt') || '';
                
                for (const keyword of imgKeywords) {
                  if ((imgSrc && imgSrc.includes(keyword)) || (imgAlt && imgAlt.includes(keyword))) {
                    imageUrl = imgSrc;
                    break;
                  }
                }
                
                if (imageUrl) return false; // Break the loop
              });
            }
            
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, url).href;
            }
            
            // If we found valid dates, create the event
            if (startDate) {
              const event = {
                title: headingText,
                date: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
                url: eventsUrl,
                venue: name,
                address: venueAddress,
                city: venueCity,
                region: venueRegion,
                postalCode: venuePostalCode,
                country: venueCountry,
                description: description.trim(),
                image: imageUrl
              };
              
              logger.info({ event: { title: event.title, date: event.date } }, 'Found event');
              events.push(event);
            }
          }
        });
      } catch (sectionError) {
        logger.error({ error: sectionError.message }, 'Error processing event section');
      }
    });
    
    // Check additional event pages like calendar or specific event pages
    const additionalEventUrls = [
      'https://www.capbridge.com/visit/',
      'https://www.capbridge.com/explore/'
    ];
    
    for (const additionalUrl of additionalEventUrls) {
      try {
        logger.info(`Checking additional page: ${additionalUrl}`);
        const additionalResponse = await axios.get(additionalUrl, axiosConfig);
        const additional$ = cheerio.load(additionalResponse.data);
        
        // Check for seasonal or special events
        additional$('.fusion-text, .fusion-builder-row, article, section').filter(function() {
          const text = additional$(this).text().toLowerCase();
          return text.includes('event') || text.includes('season') || text.includes('special') || 
                 text.includes('light') || text.includes('holiday') || text.includes('festival');
        }).each((i, section) => {
          try {
            additional$(section).find('h1, h2, h3, h4, h5').each((j, heading) => {
              const headingText = additional$(heading).text().trim();
              if (!headingText || headingText.length < 4) return;
              
              // Check if this is a special event title
              if (headingText.toLowerCase().includes('event') || 
                  headingText.toLowerCase().includes('festival') ||
                  headingText.toLowerCase().includes('season') ||
                  headingText.toLowerCase().includes('special')) {
                
                const parentContent = additional$(heading).parent();
                let eventDescription = '';
                
                parentContent.find('p').each((k, paragraph) => {
                  eventDescription += additional$(paragraph).text().trim() + ' ';
                });
                
                // Extract dates if available
                let dateText = '';
                const dateMatch = eventDescription.match(/(?:from|between|during)?\s*([a-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)\s*(?:to|-|–|—|through)\s*([a-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)/i);
                
                let dateString = '';
                if (dateMatch) {
                  const startDateText = dateMatch[1];
                  const endDateText = dateMatch[2];
                  const currentYear = new Date().getFullYear();
                  
                  let formattedStartDate = startDateText;
                  let formattedEndDate = endDateText;
                  
                  // Add year if missing
                  if (!formattedStartDate.includes(currentYear.toString()) && !formattedStartDate.includes((currentYear + 1).toString())) {
                    formattedStartDate += `, ${currentYear}`;
                  }
                  if (!formattedEndDate.includes(currentYear.toString()) && !formattedEndDate.includes((currentYear + 1).toString())) {
                    formattedEndDate += `, ${currentYear}`;
                  }
                  
                  dateString = `${formattedStartDate} - ${formattedEndDate}`;
                } else {
                  // If no specific date, use the current year's summer season
                  const currentYear = new Date().getFullYear();
                  dateString = `May 1, ${currentYear} - September 30, ${currentYear}`;
                }
                
                // Extract image
                let imageUrl = parentContent.find('img').first().attr('src');
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = new URL(imageUrl, url).href;
                }
                
                const event = {
                  title: headingText,
                  date: dateString,
                  url: additionalUrl,
                  venue: name,
                  address: venueAddress,
                  city: venueCity,
                  region: venueRegion,
                  postalCode: venuePostalCode,
                  country: venueCountry,
                  description: eventDescription.trim() || `${headingText} at ${name}. Experience adventure, history, and culture at North Vancouver's most popular attraction.`,
                  image: imageUrl
                };
                
                // Check for duplicate events before adding
                const isDuplicate = events.some(e => e.title.toLowerCase() === event.title.toLowerCase());
                if (!isDuplicate) {
                  logger.info({ event: { title: event.title, date: event.date } }, 'Found additional event');
                  events.push(event);
                }
              }
            });
          } catch (additionalSectionError) {
            logger.error({ error: additionalSectionError.message }, 'Error processing additional section');
          }
        });
      } catch (additionalError) {
        logger.error({ error: additionalError.message }, `Error fetching additional page: ${additionalUrl}`);
      }
    }

    // No fallback events - if no events were found, return empty array
    if (events.length === 0) {
      logger.info('No events were found for Capilano Suspension Bridge Park, returning empty array');
    } else {
      logger.info(`Found ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    logger.error({ error: error.message }, 'Error scraping Capilano Suspension Bridge Park');
    return []; // Return empty array on error (no fallback events)
  }
}

module.exports = {
  name,
  url,
  scrape
};
